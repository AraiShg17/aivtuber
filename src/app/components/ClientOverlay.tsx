'use client';
import dynamic from 'next/dynamic';

const VTuberOverlay = dynamic(
  () => import('./VTuberOverlay'),
  { ssr: false }
);

interface Props {
  videoId: string;
}

export default function ClientOverlay({ videoId }: Props) {
  return <VTuberOverlay videoId={videoId} />;
}
