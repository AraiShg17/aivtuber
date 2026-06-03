/**
 * OBS WebSocket v5 クライアント
 * スクリーンショット取得に特化したシンプルな実装
 *
 * 環境変数:
 *   OBS_WS_URL      WebSocket URL (default: ws://localhost:4455)
 *   OBS_WS_PASSWORD パスワード（OBS設定で有効にした場合）
 *   OBS_SOURCE_NAME スクリーンショットを取るソース名
 */

import OBSWebSocket from 'obs-websocket-js';

const OBS_WS_URL      = process.env.OBS_WS_URL      ?? 'ws://localhost:4455';
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD ?? '';
const OBS_SOURCE_NAME = process.env.OBS_SOURCE_NAME ?? '';

let client: OBSWebSocket | null = null;
let connecting = false;

async function getClient(): Promise<OBSWebSocket | null> {
  if (client) return client;
  if (connecting) return null;

  connecting = true;
  try {
    const obs = new OBSWebSocket();
    await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD || undefined);
    client = obs;

    obs.on('ConnectionClosed', () => {
      client = null;
      connecting = false;
    });

    return client;
  } catch {
    // OBSが起動していない場合は警告のみ（アプリは動き続ける）
    console.warn('[OBS] 接続スキップ: OBSが起動していないか設定が正しくありません');
    return null;
  } finally {
    connecting = false;
  }
}

/**
 * OBSの指定ソースからスクリーンショットを取得する
 * @returns base64エンコードされたJPEG画像、取得できない場合はnull
 */
export async function captureOBSScreenshot(): Promise<string | null> {
  if (!OBS_SOURCE_NAME) {
    console.warn('[OBS] OBS_SOURCE_NAME が未設定のためスクリーンショットをスキップ');
    return null;
  }

  const obs = await getClient();
  if (!obs) return null;

  try {
    const response = await obs.call('GetSourceScreenshot', {
      sourceName: OBS_SOURCE_NAME,
      imageFormat: 'jpg',
      imageWidth: 768,
      imageHeight: 432,
      imageCompressionQuality: 70,
    });

    // "data:image/jpg;base64,..." の base64 部分だけ返す
    const dataUrl = response.imageData as string;
    return dataUrl.split(',')[1] ?? null;
  } catch (err) {
    console.warn('[OBS] スクリーンショット取得失敗:', err instanceof Error ? err.message : err);
    return null;
  }
}
