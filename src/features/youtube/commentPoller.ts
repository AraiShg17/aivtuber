import type { YouTubeComment } from '@/types';
import type { LiveChatMessagesResponse } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Module-level cache: videoId → liveChatId
// Safe for single-instance Cloud Run deployment.
const liveChatIdCache = new Map<string, string>();

async function getLiveChatId(videoId: string, apiKey: string): Promise<string> {
  const cached = liveChatIdCache.get(videoId);
  if (cached) return cached;

  const url = `${YOUTUBE_API_BASE}/videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube Videos API error: ${res.status}`);

  const data = await res.json();
  const liveChatId = data.items?.[0]?.liveStreamingDetails?.activeLiveChatId as string | undefined;
  if (!liveChatId) throw new Error('No active live chat found for this video');

  liveChatIdCache.set(videoId, liveChatId);
  return liveChatId;
}

export async function fetchLiveChatMessages(
  videoId: string,
  pageToken?: string
): Promise<LiveChatMessagesResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

  const liveChatId = await getLiveChatId(videoId, apiKey);

  let url =
    `${YOUTUBE_API_BASE}/liveChat/messages` +
    `?liveChatId=${encodeURIComponent(liveChatId)}` +
    `&part=id,snippet,authorDetails` +
    `&maxResults=200` +
    `&key=${encodeURIComponent(apiKey)}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`YouTube Live Chat API error: ${res.status} ${JSON.stringify(errBody)}`);
  }

  const data = await res.json();

  const comments: YouTubeComment[] = (data.items ?? [])
    .filter((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown> | undefined;
      return snippet?.type === 'textMessageEvent';
    })
    .map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const authorDetails = item.authorDetails as Record<string, unknown>;
      const textDetails = snippet.textMessageDetails as Record<string, unknown>;
      return {
        commentId: item.id as string,
        userId: (authorDetails?.channelId as string) ?? '',
        userName: (authorDetails?.displayName as string) ?? 'Unknown',
        text: (textDetails?.messageText as string) ?? '',
        publishedAt: (snippet?.publishedAt as string) ?? '',
      };
    });

  return {
    comments,
    nextPageToken: (data.nextPageToken as string) ?? null,
  };
}
