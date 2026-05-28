'use client';
import { useEffect, useRef } from 'react';

interface Props {
  audioUrl: string | null;
  onEnded?: () => void;
}

export default function AudioPlayer({ audioUrl, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onEnded?.();
    };

    audio.play().catch((err) => {
      console.error('[AudioPlayer] play failed:', err);
      URL.revokeObjectURL(audioUrl);
      onEnded?.();
    });

    return () => {
      audio.pause();
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, onEnded]);

  return null;
}
