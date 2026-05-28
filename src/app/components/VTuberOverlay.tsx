'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AvatarDisplay from './AvatarDisplay';
import CommentDisplay from './CommentDisplay';
import AudioPlayer from './AudioPlayer';
import type { YouTubeComment, CommentsApiResponse, AIApiResponse } from '@/types';

const POLL_INTERVAL_MS = 10_000;

interface Props {
  videoId: string;
}

export default function VTuberOverlay({ videoId }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentComment, setCurrentComment] = useState<YouTubeComment | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs hold mutable values accessible inside callbacks without re-creating them
  const pageTokenRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const initializedRef = useRef(false);

  // --- Initialization: fast-forward to "now" so old messages are skipped ---
  const initializeCursor = useCallback(async () => {
    if (initializedRef.current) return;
    try {
      const res = await fetch(`/api/comments?videoId=${videoId}`);
      const data: CommentsApiResponse & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      pageTokenRef.current = data.nextPageToken;
      initializedRef.current = true;
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`初期化エラー: ${msg}`);
      console.error('[init]', err);
    }
  }, [videoId]);

  // --- Process a single comment through AI and voice ---
  const processComment = useCallback(async (comment: YouTubeComment) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setCurrentComment(comment);
    setAiResponse('');
    setAudioUrl(null);

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
      const aiData: AIApiResponse & { error?: string } = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);
      setAiResponse(aiData.text);

      const voiceRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiData.text }),
      });

      if (voiceRes.ok) {
        const blob = await voiceRes.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsPlayingAudio(true);
      } else {
        // VOICEVOX unavailable — show response but skip audio
        isProcessingRef.current = false;
        setIsProcessing(false);
      }

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`処理エラー: ${msg}`);
      console.error('[processComment]', err);
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlayingAudio(false);
    setAudioUrl(null);
    isProcessingRef.current = false;
    setIsProcessing(false);
  }, []);

  // --- Polling loop ---
  const pollComments = useCallback(async () => {
    if (!initializedRef.current || isProcessingRef.current) return;

    try {
      const token = pageTokenRef.current;
      const url = `/api/comments?videoId=${videoId}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const data: CommentsApiResponse & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.nextPageToken) {
        pageTokenRef.current = data.nextPageToken;
      }

      if (data.comments.length > 0) {
        // Process only the most recent comment per cycle
        const latest = data.comments[data.comments.length - 1];
        await processComment(latest);
      }

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`コメント取得エラー: ${msg}`);
      console.error('[poll]', err);
    }
  }, [videoId, processComment]);

  useEffect(() => {
    initializeCursor();
  }, [initializeCursor]);

  useEffect(() => {
    if (!initializedRef.current) {
      // Retry initialization and start polling once ready
      const retryInterval = setInterval(() => {
        if (initializedRef.current) {
          clearInterval(retryInterval);
        } else {
          initializeCursor();
        }
      }, 5000);
      return () => clearInterval(retryInterval);
    }

    const interval = setInterval(pollComments, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [initializeCursor, pollComments]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none select-none">
      {/* Avatar */}
      <div className="flex-1 flex items-end justify-center pb-4">
        <AvatarDisplay isAnimating={isPlayingAudio} />
      </div>

      {/* Comment + AI response */}
      <div className="w-full flex justify-center px-6">
        <CommentDisplay
          userName={currentComment?.userName}
          userComment={currentComment?.text}
          aiResponse={aiResponse || undefined}
        />
      </div>

      {/* Error badge */}
      {error && (
        <div className="absolute top-3 left-3 bg-red-600/80 text-white text-xs px-3 py-1 rounded-full">
          {error}
        </div>
      )}

      {/* Status indicator */}
      {isProcessing && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          処理中
        </div>
      )}

      <AudioPlayer audioUrl={audioUrl} onEnded={handleAudioEnded} />
    </div>
  );
}
