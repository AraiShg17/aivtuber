import { NextRequest, NextResponse } from 'next/server';
import { processComment } from '@/features/ai/responseService';
import { captureOBSScreenshot } from '@/adapters/obs/obsClient';
import type { AIApiRequest } from '@/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AIApiRequest;

  if (!body.commentId || !body.userId || !body.text) {
    return NextResponse.json(
      { error: 'commentId, userId, and text are required' },
      { status: 400 }
    );
  }

  try {
    // クライアントから画像が来ない場合はOBSから取得を試みる
    const screenshot = body.screenshotBase64 ?? (await captureOBSScreenshot());

    const result = await processComment({ ...body, screenshotBase64: screenshot ?? undefined });
    return NextResponse.json(result); // { text, expression }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
