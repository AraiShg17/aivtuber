import type { ConversationMessage } from '@/types';

export interface AIGenerateOptions {
  isSuperChat?: boolean;
  superChatAmount?: string; // 例: "¥1,000"
}

export interface AIAdapter {
  generateResponse(
    userMessage: string,
    history: ConversationMessage[],
    options?: AIGenerateOptions
  ): Promise<string>;
}
