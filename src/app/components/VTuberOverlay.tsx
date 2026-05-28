'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import AudioPlayer from './AudioPlayer';
import type { YouTubeComment, CommentsApiResponse, AIApiResponse } from '@/types';

const POLL_INTERVAL_MS = 10_000;

interface Props {
  videoId: string;
}

export default function VTuberOverlay({ videoId }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const pageTokenRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const initializedRef = useRef(false);

  // 起動時に pageToken を取得し、古いコメントをスキップ
  const initializeCursor = useCallback(async () => {
    if (initializedRef.current) return;
    try {
      const res = await fetch(`/api/comments?videoId=${videoId}`);
      const data: CommentsApiResponse = await res.json();
      pageTokenRef.current = data.nextPageToken;
      initializedRef.current = true;
    } catch (err) {
      console.error('[init]', err);
    }
  }, [videoId]);

  // コメント 1 件を AI → VOICEVOX の順で処理
  const processComment = useCallback(async (comment: YouTubeComment) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.commentId,
          userId: comment.userId,
          userName: comment.userName,
          text: comment.text,
        }),
      });
      const { text }: AIApiResponse = await aiRes.json();
      if (!text) throw new Error('empty AI response');

      const voiceRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (voiceRes.ok) {
        const blob = await voiceRes.blob();
        setAudioUrl(URL.createObjectURL(blob));
      } else {
        isProcessingRef.current = false;
      }
    } catch (err) {
      console.error('[process]', err);
      isProcessingRef.current = false;
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setAudioUrl(null);
    isProcessingRef.current = false;
  }, []);

  // 10 秒ごとに新着コメントをチェック
  const pollComments = useCallback(async () => {
    if (!initializedRef.current || isProcessingRef.current) return;
    try {
      const token = pageTokenRef.current;
      const url = `/api/comments?videoId=${videoId}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const data: CommentsApiResponse = await res.json();

      if (data.nextPageToken) pageTokenRef.current = data.nextPageToken;

      if (data.comments.length > 0) {
        // 最新の 1 件だけ処理
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
    return () => clearInterval(interval);
  }, [initializeCursor, pollComments]);

  // 画面表示なし — OBS ブラウザソースの音声だけ使用
  return <AudioPlayer audioUrl={audioUrl} onEnded={handleAudioEnded} />;
}
