import { NextRequest, NextResponse } from 'next/server';
import { generateSpontaneousSpeech } from '@/features/ai/spontaneousService';
import type { SpontaneousApiRequest } from '@/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SpontaneousApiRequest;

  try {
    const text = await generateSpontaneousSpeech(body.recentComments ?? []);
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai/spontaneous]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
