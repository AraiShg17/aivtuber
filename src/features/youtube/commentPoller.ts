import type { YouTubeComment, SuperChatInfo } from '@/types';
import type { LiveChatMessagesResponse } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

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
      const type = (item.snippet as Record<string, unknown>)?.type;
      return type === 'textMessageEvent' || type === 'superChatEvent';
    })
    .map((item: Record<string, unknown>): YouTubeComment => {
      const snippet = item.snippet as Record<string, unknown>;
      const authorDetails = item.authorDetails as Record<string, unknown>;
      const isSuperChat = snippet.type === 'superChatEvent';

      // テキスト取得
      const text = isSuperChat
        ? ((snippet.superChatDetails as Record<string, unknown>)?.userComment as string) ?? ''
        : ((snippet.textMessageDetails as Record<string, unknown>)?.messageText as string) ?? '';

      // スーパーチャット情報
      const superChat: SuperChatInfo | undefined = isSuperChat
        ? {
            amountDisplayString:
              ((snippet.superChatDetails as Record<string, unknown>)?.amountDisplayString as string) ?? '',
            currency:
              ((snippet.superChatDetails as Record<string, unknown>)?.currency as string) ?? '',
            tier: ((snippet.superChatDetails as Record<string, unknown>)?.tier as number) ?? 1,
            userComment:
              ((snippet.superChatDetails as Record<string, unknown>)?.userComment as string) ?? undefined,
          }
        : undefined;

      return {
        commentId: item.id as string,
        userId: (authorDetails?.channelId as string) ?? '',
        userName: (authorDetails?.displayName as string) ?? 'Unknown',
        text,
        publishedAt: (snippet?.publishedAt as string) ?? '',
        superChat,
      };
    });

  return {
    comments,
    nextPageToken: (data.nextPageToken as string) ?? null,
  };
}
