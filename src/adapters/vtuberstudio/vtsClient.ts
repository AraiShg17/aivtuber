/**
 * VTube Studio Plugin WebSocket API クライアント
 * https://github.com/DenchiSoft/VTubeStudio
 */

const PLUGIN_NAME      = 'AI VTuber';
const PLUGIN_DEVELOPER = 'aivtuber';
const TOKEN_KEY        = 'vts_plugin_token';

type VTSMessageType =
  | 'AuthenticationTokenRequest'
  | 'AuthenticationTokenResponse'
  | 'AuthenticationRequest'
  | 'AuthenticationResponse'
  | 'HotkeysInCurrentModelRequest'
  | 'HotkeysInCurrentModelResponse'
  | 'HotkeyTriggerRequest'
  | 'HotkeyTriggerResponse'
  | 'InputParameterListRequest'
  | 'InputParameterListResponse'
  | 'InjectParameterDataRequest'
  | 'InjectParameterDataResponse'
  | 'APIError';

export interface VTSParameter {
  name: string;
  addedBy: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
}

export interface VTSHotkey {
  name: string;
  type: string;
  hotkeyID: string;
}

interface VTSMessage {
  apiName: string;
  apiVersion: string;
  requestID: string;
  messageType: VTSMessageType;
  data: Record<string, unknown>;
}

type PendingEntry = {
  resolve: (msg: VTSMessage) => void;
  reject: (err: Error) => void;
};

export class VTubeStudioClient {
  private ws: WebSocket | null = null;
  private _authenticated = false;
  private pending = new Map<string, PendingEntry>();
  private reqCounter = 0;

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isAuthenticated(): boolean {
    return this._authenticated;
  }

  // ---- 接続 ----
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        this.ws = ws;
        resolve();
      };

      ws.onerror = () => {
        reject(new Error(`VTS: WebSocket 接続失敗 (${url})`));
      };

      ws.onclose = () => {
        this._authenticated = false;
        this.ws = null;
        // 未解決リクエストをすべて reject
        for (const [, entry] of this.pending) {
          entry.reject(new Error('VTS: 接続が切断されました'));
        }
        this.pending.clear();
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };
    });
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as VTSMessage;
      const entry = this.pending.get(msg.requestID);
      if (entry) {
        this.pending.delete(msg.requestID);
        entry.resolve(msg);
      }
    } catch {
      // JSON パース失敗は無視
    }
  }

  private send(
    messageType: VTSMessageType,
    data: Record<string, unknown>
  ): Promise<VTSMessage> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('VTS: 未接続'));
        return;
      }
      const requestID = `req_${++this.reqCounter}_${Date.now()}`;
      this.pending.set(requestID, { resolve, reject });

      this.ws.send(
        JSON.stringify({
          apiName: 'VTubeStudioPublicAPI',
          apiVersion: '1.0',
          requestID,
          messageType,
          data,
        })
      );
    });
  }

  // ---- 認証 ----
  async authenticate(): Promise<void> {
    const storedToken =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(TOKEN_KEY)
        : null;

    if (storedToken) {
      const res = await this.send('AuthenticationRequest', {
        pluginName: PLUGIN_NAME,
        pluginDeveloper: PLUGIN_DEVELOPER,
        authenticationToken: storedToken,
      });
      if (res.data.authenticated === true) {
        this._authenticated = true;
        return;
      }
      // トークン失効 → 再取得へ
    }

    // ユーザーが VTube Studio 側で承認する必要あり
    const tokenRes = await this.send('AuthenticationTokenRequest', {
      pluginName: PLUGIN_NAME,
      pluginDeveloper: PLUGIN_DEVELOPER,
      pluginIcon: '', // Base64 アイコン（省略可）
    });
    const newToken = tokenRes.data.authenticationToken as string | undefined;
    if (!newToken) throw new Error('VTS: トークン取得失敗');

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, newToken);
    }

    const authRes = await this.send('AuthenticationRequest', {
      pluginName: PLUGIN_NAME,
      pluginDeveloper: PLUGIN_DEVELOPER,
      authenticationToken: newToken,
    });
    if (authRes.data.authenticated !== true) {
      throw new Error('VTS: 認証失敗 — VTube Studio 側で許可してください');
    }
    this._authenticated = true;
  }

  // ---- パラメータ一覧取得 ----
  async getParameters(): Promise<{ defaultParameters: VTSParameter[]; customParameters: VTSParameter[] }> {
    if (!this._authenticated) return { defaultParameters: [], customParameters: [] };
    const res = await this.send('InputParameterListRequest', {});
    return {
      defaultParameters: (res.data.defaultParameters as VTSParameter[]) ?? [],
      customParameters:  (res.data.customParameters  as VTSParameter[]) ?? [],
    };
  }

  // ---- ホットキー一覧取得 ----
  async getHotkeys(): Promise<VTSHotkey[]> {
    if (!this._authenticated) return [];
    const res = await this.send('HotkeysInCurrentModelRequest', {});
    const list = res.data.availableHotkeys;
    return Array.isArray(list) ? (list as VTSHotkey[]) : [];
  }

  // ---- パラメータ注入（リップシンク等） ----
  // 30fps で呼ぶため pending に積まず ws.send() を直接叩く
  injectParameter(id: string, value: number): void {
    if (!this._authenticated || !id) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const clamped = Math.max(0, Math.min(1, value));
    this.ws.send(JSON.stringify({
      apiName:     'VTubeStudioPublicAPI',
      apiVersion:  '1.0',
      requestID:   `lip_${Date.now()}`,
      messageType: 'InjectParameterDataRequest',
      data: {
        faceFound:       true,
        mode:            'set',
        parameterValues: [{ id, value: clamped }],
      },
    }));
  }

  // ---- ホットキートリガー ----
  async triggerHotkey(hotkeyID: string): Promise<void> {
    if (!this._authenticated || !hotkeyID) return;
    await this.send('HotkeyTriggerRequest', { hotkeyID });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this._authenticated = false;
  }
}
