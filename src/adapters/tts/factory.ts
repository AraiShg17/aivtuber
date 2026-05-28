import { VOICEVOXAdapter } from './voicevoxAdapter';
import type { TTSAdapter } from './interface';

/**
 * TTS_PROVIDER 環境変数でエンジンを切り替える。
 *
 * voicevox (デフォルト)
 *   VOICEVOX_URL=http://localhost:50021
 *
 * aivis (AivisSpeech — 乗り換え予定)
 *   VOICEVOX_URL=http://localhost:10101
 *   AivisSpeech は VOICEVOX 互換 API のため同じアダプターで動作する。
 *   https://aivis-project.com
 */
export function createTTSAdapter(): TTSAdapter {
  const provider = process.env.TTS_PROVIDER ?? 'voicevox';
  const speakerId = parseInt(process.env.VOICEVOX_SPEAKER_ID ?? '1', 10);

  switch (provider) {
    case 'aivis':
    case 'voicevox':
      return new VOICEVOXAdapter(speakerId);
    default:
      console.warn(`[tts] 未知の TTS_PROVIDER "${provider}" — voicevox にフォールバック`);
      return new VOICEVOXAdapter(speakerId);
  }
}
