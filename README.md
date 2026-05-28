# AI VTuber

YouTube Live コメント → OpenAI → 音声合成 → 読み上げ のパイプライン。

## アーキテクチャ

```
YouTube Live コメント
        ↓ (10秒ポーリング)
   Next.js API Routes
   ├── /api/comments  YouTube Live Chat API
   ├── /api/ai        OpenAI (会話記憶: Firestore)
   └── /api/voice     音声合成エンジン
        ↓
  OBS ブラウザソース (音声再生)
        ↓
  VTube Studio (リップシンク・表情制御)
```

## セットアップ

### 1. 環境変数

`.env.example` を `.env.local` にコピーして値を入力。

```bash
cp .env.example .env.local
```

### 2. 音声合成エンジンの起動

**VOICEVOX（現在のデフォルト）**
```bash
docker run -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest
```

**AivisSpeech（推奨・乗り換え予定）**
```bash
# AivisSpeech を起動後、.env.local を変更するだけで切り替え可能
TTS_PROVIDER=aivis
VOICEVOX_URL=http://localhost:10101  # AivisSpeech のデフォルトポート
```

> **AivisSpeech への乗り換えについて**
> AivisSpeech は VOICEVOX 互換 API を採用しており、URL を変えるだけで切り替えられます。
> VOICEVOX より自然な発話品質のため、安定したら移行予定。
> 参考: https://aivis-project.com

### 3. Firestore 認証（ローカル）

```bash
gcloud auth application-default login
```

### 4. 起動

```bash
npm run dev
```

- OBS ブラウザソース: `http://localhost:3000/?videoId=YOUTUBE_VIDEO_ID`
- デバッグ: `http://localhost:3000/debug`

---

## 環境変数一覧

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 キー | 必須 |
| `YOUTUBE_VIDEO_ID` | 配信動画ID（URL クエリでも可） | — |
| `OPENAI_API_KEY` | OpenAI API キー | 必須 |
| `OPENAI_MODEL` | 使用モデル | `gpt-5.4-mini` |
| `TTS_PROVIDER` | 音声合成エンジン (`voicevox` / `aivis`) | `voicevox` |
| `VOICEVOX_URL` | 音声合成エンジンの URL | `http://localhost:50021` |
| `VOICEVOX_SPEAKER_ID` | スピーカー ID | `1` |
| `FIREBASE_PROJECT_ID` | GCP プロジェクト ID | — |
| `FIREBASE_DATABASE_ID` | Firestore データベース ID | `aivtuber-memory` |

---

## TTS アダプター構成

切り替えは `TTS_PROVIDER` と `VOICEVOX_URL` の変更のみ。コード変更不要。

```
src/adapters/tts/
├── interface.ts          TTSAdapter インターフェース
├── voicevoxAdapter.ts    VOICEVOX / AivisSpeech 共通実装（互換 API）
└── factory.ts            TTS_PROVIDER に応じてアダプターを返す
```

将来追加予定のアダプター:
- `openaiTtsAdapter.ts`  — OpenAI TTS
- `elevenlabsAdapter.ts` — ElevenLabs

---

## VTube Studio 連携（予定）

1. Steam で VTube Studio をインストール（基本無料）
2. BlackHole（Mac 用仮想オーディオ）で音声をルーティング
3. VTube Studio のマイクリップシンクで口が動く
4. VTube Studio WebSocket API で AI 感情 → Live2D 表情連動（実装予定）

---

## フォルダ構成

```
src/
├── app/
│   ├── api/         API ルート (comments / ai / voice)
│   ├── components/  VTuberOverlay, AudioPlayer
│   └── debug/       ローカルテスト用ページ
├── adapters/
│   ├── ai/          AIAdapter (OpenAI / 将来: Gemini, Claude)
│   └── tts/         TTSAdapter (VOICEVOX / AivisSpeech / 将来: OpenAI TTS)
├── features/
│   ├── youtube/     コメントポーリング
│   ├── ai/          AI 返答サービス
│   ├── voice/       音声合成サービス
│   └── memory/      Firestore 会話記憶
├── services/        外部サービスクライアント
└── types/           共通型定義
```
