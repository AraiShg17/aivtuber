import { NextRequest, NextResponse } from 'next/server';
import { generateSpontaneousSpeech } from '@/features/ai/spontaneousService';
import { captureOBSScreenshot } from '@/adapters/obs/obsClient';
import type { SpontaneousApiRequest } from '@/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SpontaneousApiRequest;

  try {
    const obsScreenshot = await Promise.race([
      captureOBSScreenshot(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    const screenshot = body.screenshotBase64 ?? obsScreenshot;

    const result = await generateSpontaneousSpeech(
      body.recentComments ?? [],
      screenshot ?? undefined,
    );
    return NextResponse.json(result); // { text, expression }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai/spontaneous]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
