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
  screenshotBase64?: string;
}

export interface AIApiResponse {
  text: string;
  expression: string; // VTube Studio ホットキー名: normal / happy / excited / surprised / shy / thinking
}

export interface VoiceApiRequest {
  text: string;
}

export interface SpontaneousApiRequest {
  recentComments: string[];       // 直近コメントのテキスト（コンテキスト用）
  screenshotBase64?: string;      // ゲーム画面キャプチャ（JPEG base64 data URL）
}

export interface SpontaneousApiResponse {
  text: string;
  expression: string;
}
