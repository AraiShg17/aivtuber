'use client';
import { useState, useCallback, useRef } from 'react';
import AudioPlayer from '@/app/components/AudioPlayer';
import { useVTubeStudio } from '@/hooks/useVTubeStudio';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import type { VTSHotkey, VTSParameter } from '@/adapters/vtuberstudio/vtsClient';

import type { AIApiResponse, SpontaneousApiResponse } from '@/types';

const EXPRESSIONS = [
  { key: 'normal',    label: '普通',   emoji: '😐' },
  { key: 'happy',     label: '嬉しい', emoji: '😊' },
  { key: 'excited',   label: '興奮',   emoji: '🤩' },
  { key: 'surprised', label: '驚き',   emoji: '😲' },
  { key: 'shy',       label: '照れ',   emoji: '😳' },
  { key: 'thinking',  label: '考え中', emoji: '🤔' },
] as const;

interface LogEntry {
  id: number;
  input: string;
  response: string;
  status: 'ok' | 'error';
}

export default function DebugPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpontaneous, setIsSpontaneous] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const { isCapturing, start: startCapture, stop: stopCapture, captureFrame } = useScreenCapture();
  const { status: vtsStatus, onSpeakStart, injectMouthOpen, injectParameter, getHotkeys, getParameters } = useVTubeStudio();
  const [hotkeys, setHotkeys] = useState<VTSHotkey[]>([]);
  const [params, setParams]   = useState<{ defaultParameters: VTSParameter[]; customParameters: VTSParameter[] } | null>(null);
  const [testParamId, setTestParamId]     = useState('MouthOpen');
  const [testParamValue, setTestParamValue] = useState('1');

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

  const handleSpontaneous = useCallback(async () => {
    if (isLoading || isSpontaneous) return;
    setIsSpontaneous(true);
    setAudioUrl(null);

    // ログ内の成功エントリからコメントテキストを収集（最大5件）
    const recentComments = log
      .filter((e) => e.status === 'ok' && e.input !== '(自動発話)')
      .slice(0, 5)
      .map((e) => e.input);

    const screenshot = captureFrame();

    try {
      const res = await fetch('/api/ai/spontaneous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentComments,
          ...(screenshot ? { screenshotBase64: screenshot } : {}),
        }),
      });
      const data: SpontaneousApiResponse & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);

      const voiceRes = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text }),
      });
      if (!voiceRes.ok) throw new Error(`VOICEVOX error: ${voiceRes.status}`);

      const blob = await voiceRes.blob();
      setAudioUrl(URL.createObjectURL(blob));

      setLog((prev) => [
        { id: ++idRef.current, input: '(自動発話)', response: data.text, status: 'ok' },
        ...prev,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLog((prev) => [
        { id: ++idRef.current, input: '(自動発話)', response: msg, status: 'error' },
        ...prev,
      ]);
    } finally {
      setIsSpontaneous(false);
    }
  }, [isLoading, isSpontaneous, log]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6 text-gray-300">Debug — AI + VOICEVOX</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
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

      {/* 自動発話 + 画面共有ボタン */}
      <div className="mb-8 flex gap-3 items-center flex-wrap">
        <button
          type="button"
          onClick={handleSpontaneous}
          disabled={isLoading || isSpontaneous}
          className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isSpontaneous ? '生成中…' : '🎙 自動発話テスト'}
        </button>

        {!isCapturing ? (
          <button
            type="button"
            onClick={startCapture}
            className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            📸 画面を選択
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCapture}
            className="bg-green-800 hover:bg-green-700 px-5 py-3 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block" />
            共有中（停止）
          </button>
        )}
      </div>

      {/* VTube Studio 表情テスト */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm font-medium text-gray-400">VTube Studio 表情</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            vtsStatus === 'connected'   ? 'bg-green-900 text-green-300' :
            vtsStatus === 'connecting'  ? 'bg-yellow-900 text-yellow-300' :
                                         'bg-gray-700 text-gray-400'
          }`}>
            {vtsStatus === 'connected'  ? '● 接続済み' :
             vtsStatus === 'connecting' ? '○ 接続中…' :
                                         '○ 未接続'}
          </span>
          {vtsStatus === 'connected' && (
            <>
              <button
                type="button"
                onClick={async () => setHotkeys(await getHotkeys())}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                ホットキー一覧
              </button>
              <button
                type="button"
                onClick={async () => setParams(await getParameters())}
                className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                パラメータ一覧
              </button>
            </>
          )}
        </div>

        {/* AI が送るキー名でのテスト */}
        <div className="flex gap-2 flex-wrap mb-3">
          {EXPRESSIONS.map(({ key, label, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSpeakStart(key)}
              disabled={vtsStatus !== 'connected'}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span className="text-gray-500 text-xs">({key})</span>
            </button>
          ))}
        </div>

        {/* VTSに登録されているホットキー一覧 */}
        {hotkeys.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3 text-xs space-y-1">
            <p className="text-gray-500 mb-2">VTSに登録されているホットキー（クリックで発火テスト）</p>
            <div className="flex gap-2 flex-wrap">
              {hotkeys.map((hk) => (
                <button
                  key={hk.hotkeyID}
                  type="button"
                  onClick={() => onSpeakStart(hk.hotkeyID)}
                  className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-gray-200 transition-colors"
                >
                  {hk.name}
                  <span className="text-gray-500 ml-1">({hk.type})</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* パラメータ一覧 */}
        {params && (
          <div className="bg-gray-900 rounded-lg p-3 text-xs mt-3">
            <p className="text-gray-500 mb-2">デフォルトパラメータ（口パクに使うものを探す）</p>
            <div className="flex gap-1.5 flex-wrap max-h-40 overflow-y-auto">
              {params.defaultParameters.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setTestParamId(p.name);
                    setTestParamValue('1');
                  }}
                  className="bg-gray-800 hover:bg-indigo-800 px-2 py-1 rounded text-gray-300 transition-colors"
                  title={`現在値: ${p.value} (${p.min}〜${p.max})`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* パラメータ直接テスト */}
        {vtsStatus === 'connected' && (
          <div className="flex gap-2 items-center mt-3">
            <input
              type="text"
              value={testParamId}
              onChange={(e) => setTestParamId(e.target.value)}
              placeholder="パラメータ名"
              className="bg-gray-800 rounded px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 w-48"
            />
            <input
              type="number"
              value={testParamValue}
              onChange={(e) => setTestParamValue(e.target.value)}
              min="0" max="1" step="0.1"
              className="bg-gray-800 rounded px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 w-20"
            />
            <button
              type="button"
              onClick={() => injectParameter(testParamId, parseFloat(testParamValue) || 0)}
              className="bg-indigo-700 hover:bg-indigo-600 px-4 py-1.5 rounded text-sm transition-colors"
            >
              注入テスト
            </button>
          </div>
        )}
      </div>

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

      <AudioPlayer audioUrl={audioUrl} onEnded={() => setAudioUrl(null)} onAmplitude={injectMouthOpen} />
    </div>
  );
}
