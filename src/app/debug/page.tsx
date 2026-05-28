'use client';
import { useState, useCallback, useRef } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import type { AIApiResponse } from '@/types';

interface LogEntry {
  id: number;
  input: string;
  response: string;
  status: 'ok' | 'error';
}

export default function DebugPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      setIsLoading(true);
      setAudioUrl(null);

      try {
        // AI 呼び出し
        const aiRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId: `debug-${Date.now()}`,
            userId: 'debug-user',
            userName: 'デバッグ',
            text,
          }),
        });
        const aiData: AIApiResponse & { error?: string } = await aiRes.json();
        if (aiData.error) throw new Error(aiData.error);

        // VOICEVOX 呼び出し
        const voiceRes = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiData.text }),
        });
        if (!voiceRes.ok) throw new Error(`VOICEVOX error: ${voiceRes.status}`);

        const blob = await voiceRes.blob();
        setAudioUrl(URL.createObjectURL(blob));

        setLog((prev) => [
          { id: ++idRef.current, input: text, response: aiData.text, status: 'ok' },
          ...prev,
        ]);
        setInput('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setLog((prev) => [
          { id: ++idRef.current, input: text, response: msg, status: 'error' },
          ...prev,
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6 text-gray-300">Debug — AI + VOICEVOX</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="コメントを入力..."
          disabled={isLoading}
          className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isLoading ? '処理中…' : '送信'}
        </button>
      </form>

      {/* ログ */}
      <div className="space-y-3">
        {log.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-lg p-4 text-sm space-y-1 ${
              entry.status === 'ok' ? 'bg-gray-800' : 'bg-red-900/40'
            }`}
          >
            <div className="flex gap-2">
              <span className="text-yellow-400 font-medium shrink-0">入力</span>
              <span className="text-gray-200">{entry.input}</span>
            </div>
            <div className="flex gap-2">
              <span
                className={`font-medium shrink-0 ${
                  entry.status === 'ok' ? 'text-purple-400' : 'text-red-400'
                }`}
              >
                {entry.status === 'ok' ? 'AI' : 'Error'}
              </span>
              <span className="text-gray-200">{entry.response}</span>
            </div>
          </div>
        ))}
      </div>

      <AudioPlayer audioUrl={audioUrl} onEnded={() => setAudioUrl(null)} />
    </div>
  );
}
