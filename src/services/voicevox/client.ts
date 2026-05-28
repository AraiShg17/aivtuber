const VOICEVOX_URL = process.env.VOICEVOX_URL ?? 'http://localhost:50021';

export const voicevoxClient = {
  async synthesize(text: string, speakerId: number): Promise<Buffer> {
    const queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      { method: 'POST' }
    );
    if (!queryRes.ok) {
      throw new Error(`VOICEVOX audio_query failed: ${queryRes.status}`);
    }
    const audioQuery = await queryRes.json();

    const synthesisRes = await fetch(
      `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioQuery),
      }
    );
    if (!synthesisRes.ok) {
      throw new Error(`VOICEVOX synthesis failed: ${synthesisRes.status}`);
    }

    const arrayBuffer = await synthesisRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },
};
