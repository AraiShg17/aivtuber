import { NextRequest, NextResponse } from 'next/server';
import { synthesizeVoice } from '@/features/voice/voiceService';

export async function POST(request: NextRequest) {
  const { text } = (await request.json()) as { text: string };

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const audioBuffer = await synthesizeVoice(text);
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[voice]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
