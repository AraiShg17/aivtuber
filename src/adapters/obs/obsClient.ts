/**
 * OBS WebSocket v5 クライアント
 * スクリーンショット取得に特化したシンプルな実装
 *
 * 環境変数:
 *   OBS_WS_URL        WebSocket URL (default: ws://localhost:4455)
 *   OBS_WS_PASSWORD   パスワード（OBS設定で有効にした場合）
 *   OBS_SOURCE_NAME   スクリーンショットを取るソース名（未設定時はスキップ）
 *   OBS_IMAGE_WIDTH   キャプチャ幅 px (default: 768)
 *   OBS_IMAGE_HEIGHT  キャプチャ高さ px (default: 432)
 *   OBS_IMAGE_QUALITY JPEG品質 0-100 (default: 70)
 *
 * Note: Vercel等のサーバーレス環境ではリクエストごとに新プロセスが起動するため
 * WebSocket永続接続は維持されない。ローカルサーバー運用を前提とした実装。
 * Next.js開発モードのHMR対策としてglobalThisでシングルトンを管理する。
 */

import OBSWebSocket from 'obs-websocket-js';

const OBS_WS_URL      = process.env.OBS_WS_URL       ?? 'ws://localhost:4455';
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD  ?? '';
const OBS_SOURCE_NAME = process.env.OBS_SOURCE_NAME  ?? '';
const IMAGE_WIDTH     = Number(process.env.OBS_IMAGE_WIDTH   ?? 768);
const IMAGE_HEIGHT    = Number(process.env.OBS_IMAGE_HEIGHT  ?? 432);
const IMAGE_QUALITY   = Number(process.env.OBS_IMAGE_QUALITY ?? 70);

// HMR対策: 開発時にモジュールが再評価されても接続を維持する
const g = globalThis as typeof globalThis & {
  obsClient?: OBSWebSocket | null;
  obsConnectingPromise?: Promise<OBSWebSocket | null> | null;
};
if (!('obsClient' in g)) {
  g.obsClient = null;
  g.obsConnectingPromise = null;
}

async function getClient(): Promise<OBSWebSocket | null> {
  if (g.obsClient) return g.obsClient;
  if (g.obsConnectingPromise) return g.obsConnectingPromise;

  g.obsConnectingPromise = (async () => {
    try {
      const obs = new OBSWebSocket();
      await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD || undefined);
      g.obsClient = obs;

      obs.on('ConnectionClosed', () => {
        g.obsClient = null;
        g.obsConnectingPromise = null;
      });

      obs.on('ConnectionError', (err) => {
        console.warn('[OBS] 接続エラー:', err);
        g.obsClient = null;
        g.obsConnectingPromise = null;
      });

      return g.obsClient;
    } catch {
      console.warn('[OBS] 接続スキップ: OBSが起動していないか設定が正しくありません');
      g.obsClient = null;
      g.obsConnectingPromise = null;
      return null;
    }
  })();

  return g.obsConnectingPromise;
}

/**
 * OBSの指定ソースからスクリーンショットを取得する
 * @returns base64エンコードされたJPEG画像、取得できない場合はnull
 */
export async function captureOBSScreenshot(): Promise<string | null> {
  if (!OBS_SOURCE_NAME) return null; // 未設定は正常な運用ケース

  const obs = await getClient();
  if (!obs) return null;

  try {
    const response = await obs.call('GetSourceScreenshot', {
      sourceName: OBS_SOURCE_NAME,
      imageFormat: 'jpg',
      imageWidth: IMAGE_WIDTH,
      imageHeight: IMAGE_HEIGHT,
      imageCompressionQuality: IMAGE_QUALITY,
    });

    const dataUrl = response.imageData;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      console.warn('[OBS] 予期しない imageData フォーマット:', String(dataUrl).slice(0, 50));
      return null;
    }
    return dataUrl.split(',')[1] ?? null;
  } catch (err) {
    console.warn('[OBS] スクリーンショット取得失敗:', err instanceof Error ? err.message : err);
    return null;
  }
}
