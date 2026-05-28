'use client';
import type { AvatarProps } from './interface';

interface PNGAvatarProps extends AvatarProps {
  src: string;
  alt?: string;
  onError?: () => void;
}

export default function PNGAvatar({
  src,
  alt = 'VTuber Avatar',
  isAnimating = false,
  onError,
}: PNGAvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`max-h-96 object-contain transition-transform duration-200 ${
        isAnimating ? 'scale-105' : 'scale-100'
      }`}
      onError={onError}
    />
  );
}
