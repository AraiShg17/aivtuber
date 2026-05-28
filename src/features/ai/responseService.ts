import { openAIAdapter } from '@/adapters/ai/openaiAdapter';
import { upsertUser, saveMessage, getRecentMessages } from '@/features/memory/memoryService';
import type { ConversationMessage, AIApiRequest } from '@/types';

export async function processComment(request: AIApiRequest): Promise<string> {
  const { commentId, userId, userName, text } = request;

  await upsertUser(userId, userName);

  // Past conversations: fetch desc, reverse to chronological order for context
  const recentMessages = await getRecentMessages(userId, 5);
  const history: ConversationMessage[] = recentMessages
    .reverse()
    .flatMap((msg) => [
      { role: 'user' as const, content: msg.userMessage },
      { role: 'assistant' as const, content: msg.aiMessage },
    ]);

  const aiText = await openAIAdapter.generateResponse(text, history);

  await saveMessage({ userId, commentId, userMessage: text, aiMessage: aiText });

  return aiText;
}
