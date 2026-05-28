import { createTTSAdapter } from '@/adapters/tts/factory';

export async function synthesizeVoice(text: string): Promise<Buffer> {
  const adapter = createTTSAdapter();
  return adapter.synthesize(text);
}
