'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import AudioPlayer from './AudioPlayer';
import type { YouTubeComment, CommentsApiResponse, AIApiResponse, SpontaneousApiResponse } from '@/types';

const POLL_INTERVAL_MS = 10_000;

// 自動発話の間隔（指数分布）
// 平均 60 秒、最短 30 秒、最長 120 秒
const SPONTANEOUS_MEAN_MS = 60_000;
const SPONTANEOUS_MIN_MS  = 30_000;
const SPONTANEOUS_MAX_MS  = 120_000;
const RECENT_COMMENTS_MAX = 5; // コンテキストに渡す直近コメント数

/** 指数分布でランダムな間隔を生成（より自然なバラつき） */
function nextSpontaneousDelay(): number {
  const sample = -Math.log(1 - Math.random()) * SPONTANEOUS_MEAN_MS;
  return Math.min(Math.max(sample, SPONTANEOUS_MIN_MS), SPONTANEOUS_MAX_MS);
}

interface Props {
  videoId: string;
}

export default function VTuberOverlay({ videoId }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const pageTokenRef       = useRef<string | null>(null);
  const isProcessingRef    = useRef(false);
  const initializedRef     = useRef(false);
  const recentCommentsRef  = useRef<string[]>([]);   // 直近コメントのバッファ
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 音声再生共通処理 ----
  const playText = useCallback(async (text: string): Promise<void> => {
    const voiceRes = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!voiceRes.ok) {
      isProcessingRef.current = false;
      return;
    }
    const blob = await voiceRes.blob();
    setAudioUrl(URL.createObjectURL(blob));
  }, []);

  // ---- 自動発話スケジューラ ----
  const scheduleSpontaneous = useCallback(() => {
    if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);

    const delay = nextSpontaneousDelay();
    spontaneousTimerRef.current = setTimeout(async () => {
      if (isProcessingRef.current) {
        scheduleSpontaneous(); // 処理中なら再スケジュール
        return;
      }
      isProcessingRef.current = true;
      try {
        const res = await fetch('/api/ai/spontaneous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recentComments: recentCommentsRef.current }),
        });
        const data: SpontaneousApiResponse & { error?: string } = await res.json();
        if (data.error) throw new Error(data.error);
        await playText(data.text);
      } catch (err) {
        console.error('[spontaneous]', err);
        isProcessingRef.current = false;
        scheduleSpontaneous();
      }
    }, delay);
  }, [playText]);

  const handleAudioEnded = useCallback(() => {
    setAudioUrl(null);
    isProcessingRef.current = false;
    scheduleSpontaneous(); // 発話終了 → 次の自動発話をスケジュール
  }, [scheduleSpontaneous]);

  // ---- 起動時カーソル初期化 ----
  const initializeCursor = useCallback(async () => {
    if (initializedRef.current) return;
    try {
      const res = await fetch(`/api/comments?videoId=${videoId}`);
      const data: CommentsApiResponse = await res.json();
      pageTokenRef.current = data.nextPageToken;
      initializedRef.current = true;
      scheduleSpontaneous(); // 初期化完了 → 自動発話開始
    } catch (err) {
      console.error('[init]', err);
    }
  }, [videoId, scheduleSpontaneous]);

  // ---- コメント 1 件処理 ----
  const processComment = useCallback(async (comment: YouTubeComment) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // 直近コメントバッファを更新
    recentCommentsRef.current = [
      comment.text,
      ...recentCommentsRef.current,
    ].slice(0, RECENT_COMMENTS_MAX);

    try {
      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.commentId,
          userId: comment.userId,
          userName: comment.userName,
          text: comment.text,
          superChat: comment.superChat,
        }),
      });
      const aiData: AIApiResponse & { error?: string } = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);
      await playText(aiData.text);
    } catch (err) {
      console.error('[processComment]', err);
      isProcessingRef.current = false;
    }
  }, [playText]);

  // ---- ポーリング ----
  const pollComments = useCallback(async () => {
    if (!initializedRef.current || isProcessingRef.current) return;
    try {
      const token = pageTokenRef.current;
      const url = `/api/comments?videoId=${videoId}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const data: CommentsApiResponse & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.nextPageToken) pageTokenRef.current = data.nextPageToken;

      if (data.comments.length > 0) {
        // 自動発話タイマーをリセット（コメントが来たので不要）
        if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
        await processComment(data.comments[data.comments.length - 1]);
      }
    } catch (err) {
      console.error('[poll]', err);
    }
  }, [videoId, processComment]);

  useEffect(() => {
    initializeCursor();
  }, [initializeCursor]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (initializedRef.current) {
        pollComments();
      } else {
        initializeCursor();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
    };
  }, [initializeCursor, pollComments]);

  return <AudioPlayer audioUrl={audioUrl} onEnded={handleAudioEnded} />;
}
