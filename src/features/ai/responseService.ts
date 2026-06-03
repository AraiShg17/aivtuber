import { openAIAdapter } from '@/adapters/ai/openaiAdapter';
import { upsertUser, saveMessage, getRecentMessages } from '@/features/memory/memoryService';
import type { AIGeneratedContent } from '@/adapters/ai/interface';
import type { ConversationMessage, AIApiRequest } from '@/types';

export async function processComment(request: AIApiRequest): Promise<AIGeneratedContent> {
  const { commentId, userId, userName, text, superChat } = request;

  await upsertUser(userId, userName);

  // 過去会話を取得（降順 → 時系列に戻す）
  const recentMessages = await getRecentMessages(userId, 5);
  const history: ConversationMessage[] = recentMessages
    .reverse()
    .flatMap((msg) => [
      { role: 'user' as const, content: msg.userMessage },
      { role: 'assistant' as const, content: msg.aiMessage },
    ]);

  // スーパーチャットの場合は金額をメッセージに付与してコンテキストを与える
  const contextualText = superChat
    ? `[スーパーチャット: ${superChat.amountDisplayString}] ${text || '(コメントなし)'}`
    : text;

  const result = await openAIAdapter.generateResponse(
    contextualText,
    history,
    {
      isSuperChat:      !!superChat,
      superChatAmount:  superChat?.amountDisplayString,
      screenshotBase64: request.screenshotBase64,
    }
  );

  // メモリ保存はテキストのみ
  await saveMessage({ userId, commentId, userMessage: text, aiMessage: result.text });

  return result;
}
