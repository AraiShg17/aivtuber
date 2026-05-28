import { voicevoxClient } from '@/services/voicevox/client';
import type { TTSAdapter } from './interface';

export class VOICEVOXAdapter implements TTSAdapter {
  private speakerId: number;

  constructor(speakerId = 1) {
    this.speakerId = speakerId;
  }

  async synthesize(text: string): Promise<Buffer> {
    return voicevoxClient.synthesize(text, this.speakerId);
  }
}

export const voicevoxAdapter = new VOICEVOXAdapter(
  parseInt(process.env.VOICEVOX_SPEAKER_ID ?? '1', 10)
);
