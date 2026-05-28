import type { ConversationMessage } from '@/types';

export interface AIAdapter {
  generateResponse(
    userMessage: string,
    history: ConversationMessage[]
  ): Promise<string>;
}
