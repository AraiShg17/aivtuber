'use client';
import { useState } from 'react';

interface Props {
  isAnimating?: boolean;
}

export default function AvatarDisplay({ isAnimating = false }: Props) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`transition-transform duration-200 ${isAnimating ? 'scale-105' : 'scale-100'}`}
    >
      {!imageError ? (
        // PNG avatar — place your avatar image at public/avatar.png
        // On load error, falls back to the placeholder below
        <img
          src="/avatar.png"
          alt="VTuber Avatar"
          className="max-h-96 object-contain drop-shadow-2xl"
          onError={() => setImageError(true)}
        />
      ) : (
        // Placeholder shown when avatar.png is missing
        <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-2xl select-none">
          AI
        </div>
      )}
    </div>
  );
}
