import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveChatMessages } from '@/features/youtube/commentPoller';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId') ?? process.env.YOUTUBE_VIDEO_ID;
  const pageToken = searchParams.get('pageToken') ?? undefined;

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const result = await fetchLiveChatMessages(videoId, pageToken);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[comments]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
