export interface SuperChatInfo {
  amountDisplayString: string; // 例: "¥1,000"
  currency: string;
  tier: number;
  userComment?: string; // スーパーチャットに添えたコメント（任意）
}

export interface YouTubeComment {
  commentId: string;
  userId: string;
  userName: string;
  text: string;
  publishedAt: string;
  superChat?: SuperChatInfo; // スーパーチャットの場合のみ存在
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserRecord {
  userId: string;
  userName: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface MessageRecord {
  userId: string;
  commentId: string;
  userMessage: string;
  aiMessage: string;
  createdAt: Date;
}

export interface CommentsApiResponse {
  comments: YouTubeComment[];
  nextPageToken: string | null;
}

export interface AIApiRequest {
  commentId: string;
  userId: string;
  userName: string;
  text: string;
  superChat?: SuperChatInfo;
}

export interface AIApiResponse {
  text: string;
}

export interface VoiceApiRequest {
  text: string;
}

export interface SpontaneousApiRequest {
  recentComments: string[]; // 直近コメントのテキスト（コンテキスト用）
}

export interface SpontaneousApiResponse {
  text: string;
}
