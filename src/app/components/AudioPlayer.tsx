'use client';
import { useEffect, useRef } from 'react';

interface Props {
  audioUrl: string | null;
  onEnded?: () => void;
  /** 再生中の音量（0〜1）をリアルタイムで通知。リップシンク用。 */
  onAmplitude?: (value: number) => void;
}

// AudioContext はページライフタイムで1つだけ使い回す
let sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

export default function AudioPlayer({ audioUrl, onEnded, onAmplitude }: Props) {
  // onAmplitude は毎フレーム呼ぶため ref で持ち、effect の再実行を防ぐ
  const onAmplitudeRef = useRef(onAmplitude);
  useEffect(() => { onAmplitudeRef.current = onAmplitude; }, [onAmplitude]);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    let rafId: number | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    // Web Audio API セットアップ（onAmplitude が不要なら解析しない）
    if (onAmplitudeRef.current) {
      try {
        const ctx = getAudioContext();
        // suspended 状態（オートプレイ制限）を解除
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        source  = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;

        source.connect(analyser);
        analyser.connect(ctx.destination);

        const buf    = new Float32Array(analyser.fftSize);
        let smooth   = 0;
        let frame    = 0;

        const measure = () => {
          rafId = requestAnimationFrame(measure);
          if (++frame % 2 !== 0) return; // ≒30fps

          analyser!.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
          smooth = smooth * 0.5 + Math.min(rms * 10, 1) * 0.5;
          onAmplitudeRef.current?.(smooth);
        };

        audio.addEventListener('play', () => {
          // play 開始時にも resume（Safari 等の対策）
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          rafId = requestAnimationFrame(measure);
        });
      } catch (err) {
        console.warn('[AudioPlayer] Web Audio API setup failed:', err);
      }
    }

    audio.onended = () => {
      if (rafId) cancelAnimationFrame(rafId);
      onAmplitudeRef.current?.(0); // 口を閉じる
      source?.disconnect();
      analyser?.disconnect();
      URL.revokeObjectURL(audioUrl);
      onEnded?.();
    };

    audio.play().catch((err) => {
      console.error('[AudioPlayer] play failed:', err);
      if (rafId) cancelAnimationFrame(rafId);
      source?.disconnect();
      analyser?.disconnect();
      URL.revokeObjectURL(audioUrl);
      onEnded?.();
    });

    return () => {
      audio.pause();
      if (rafId) cancelAnimationFrame(rafId);
      source?.disconnect();
      analyser?.disconnect();
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, onEnded]); // onAmplitude は ref 経由なので deps 不要

  return null;
}
