import { openaiClient } from '@/services/openai/client';
import type { AIAdapter } from './interface';
import type { ConversationMessage } from '@/types';

const SYSTEM_PROMPT = `あなたはAI VTuberです。名前は「アイ」です。
YouTubeライブのコメントに対して日本語で返答してください。
返答は1〜2文程度の短い文にしてください。
明るく、フレンドリーなトーンで話してください。
同じ内容の繰り返しを避け、自然な会話を心がけてください。`;

export class OpenAIAdapter implements AIAdapter {
  async generateResponse(
    userMessage: string,
    history: ConversationMessage[]
  ): Promise<string> {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }
}

export const openAIAdapter = new OpenAIAdapter();
