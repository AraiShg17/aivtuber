export interface YouTubeComment {
  commentId: string;
  userId: string;
  userName: string;
  text: string;
  publishedAt: string;
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
}

export interface AIApiResponse {
  text: string;
}

export interface VoiceApiRequest {
  text: string;
}
