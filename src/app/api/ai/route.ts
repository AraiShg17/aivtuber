import { NextRequest, NextResponse } from 'next/server';
import { processComment } from '@/features/ai/responseService';
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
    const text = await processComment(body);
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
