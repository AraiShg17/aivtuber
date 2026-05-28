import { voicevoxAdapter } from '@/adapters/tts/voicevoxAdapter';

export async function synthesizeVoice(text: string): Promise<Buffer> {
  return voicevoxAdapter.synthesize(text);
}
