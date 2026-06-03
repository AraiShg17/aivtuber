import { useEffect, useRef, useCallback, useState } from 'react';
import { VTubeStudioClient } from '@/adapters/vtuberstudio/vtsClient';
import type { VTSHotkey, VTSParameter } from '@/adapters/vtuberstudio/vtsClient';

export type VTSStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * 環境変数（NEXT_PUBLIC_* はブラウザに公開される）
 *
 * NEXT_PUBLIC_VTS_WS_URL      WebSocket URL (default: ws://localhost:8001)
 * NEXT_PUBLIC_VTS_HOTKEY_IDLE 発話終了後に戻るアイドル表情のホットキー名（省略可）
 *
 * 発話中の表情は AI が決定した expression をそのまま VTS に渡す。
 * VTube Studio 側に同名のホットキーを登録しておけばOK。
 */
const VTS_URL          = process.env.NEXT_PUBLIC_VTS_WS_URL           ?? 'ws://localhost:8001';
const HOTKEY_IDLE      = process.env.NEXT_PUBLIC_VTS_HOTKEY_IDLE      ?? '';
const PARAM_MOUTH_OPEN = process.env.NEXT_PUBLIC_VTS_PARAM_MOUTH_OPEN ?? 'MouthOpen';

export function useVTubeStudio() {
  const clientRef = useRef<VTubeStudioClient | null>(null);
  const [status, setStatus] = useState<VTSStatus>('disconnected');

  useEffect(() => {
    const client = new VTubeStudioClient();
    clientRef.current = client;

    setStatus('connecting');
    (async () => {
      try {
        await client.connect(VTS_URL);
        await client.authenticate();
        setStatus('connected');
        console.log('[VTS] 接続・認証完了');
      } catch (err) {
        setStatus('disconnected');
        // VTube Studio が起動していない場合は警告のみ（アプリは動き続ける）
        console.warn('[VTS] 接続スキップ:', err instanceof Error ? err.message : err);
      }
    })();

    return () => {
      client.disconnect();
      setStatus('disconnected');
    };
  }, []);

  /**
   * 発話開始時に呼ぶ。
   * expression は AI が返した値をそのまま渡す（例: "happy", "surprised"）。
   * VTube Studio に同名のホットキーがなければ何もしない（エラーにならない）。
   */
  const onSpeakStart = useCallback(async (expression: string) => {
    const client = clientRef.current;
    if (!client?.isAuthenticated || !expression) return;
    await client.triggerHotkey(expression).catch((e) =>
      console.warn('[VTS] hotkey error:', e)
    );
  }, []);

  /** 発話終了時に呼ぶ。HOTKEY_IDLE が設定されていればアイドル表情に戻す */
  const onSpeakEnd = useCallback(async () => {
    const client = clientRef.current;
    if (!client?.isAuthenticated || !HOTKEY_IDLE) return;
    await client.triggerHotkey(HOTKEY_IDLE).catch((e) =>
      console.warn('[VTS] hotkey error:', e)
    );
  }, []);

  /**
   * 口の開き量を VTS に送る（リップシンク用）。
   * value: 0.0（閉じ）〜 1.0（全開）
   */
  const injectMouthOpen = useCallback((value: number) => {
    clientRef.current?.injectParameter(PARAM_MOUTH_OPEN, value);
  }, []);

  /** 任意のパラメータに値を注入する（デバッグ・テスト用） */
  const injectParameter = useCallback((id: string, value: number) => {
    clientRef.current?.injectParameter(id, value);
  }, []);

  /** VTSに登録されているホットキー一覧を取得 */
  const getHotkeys = useCallback(async (): Promise<VTSHotkey[]> => {
    return clientRef.current?.getHotkeys() ?? [];
  }, []);

  /** モデルのパラメータ一覧を取得 */
  const getParameters = useCallback(async () => {
    return clientRef.current?.getParameters() ?? { defaultParameters: [], customParameters: [] };
  }, []);

  return { status, onSpeakStart, onSpeakEnd, injectMouthOpen, injectParameter, getHotkeys, getParameters };
}
