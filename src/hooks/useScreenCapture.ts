import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_DIMENSION = 768;

/** video から今この瞬間のフレームを JPEG base64 に変換 */
function extractFrame(video: HTMLVideoElement): string | null {
  if (video.readyState < 2) return null;
  const { videoWidth: w, videoHeight: h } = video;
  if (!w || !h) return null;

  const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h, 1);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    videoRef.current  = null;
    setIsCapturing(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted     = true;
      await video.play();
      videoRef.current = video;

      stream.getVideoTracks()[0]?.addEventListener('ended', stop);
      setIsCapturing(true);
    } catch (err) {
      console.warn('[ScreenCapture] start failed:', err instanceof Error ? err.message : err);
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    isCapturing,
    start,
    stop,
    /** 呼ばれた瞬間のフレームを取得（自動発話タイミングで呼ぶ） */
    captureFrame: (): string | null =>
      videoRef.current ? extractFrame(videoRef.current) : null,
  };
}
