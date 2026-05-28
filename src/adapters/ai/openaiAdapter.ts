import { openaiClient } from '@/services/openai/client';
import type { AIAdapter, AIGenerateOptions } from './interface';
import type { ConversationMessage } from '@/types';

const SYSTEM_PROMPT = `あなたはAI VTuberです。名前は「アイ」です。
YouTubeライブのコメントに対して日本語で返答してください。
返答は1〜2文程度の短い文にしてください。
明るく、フレンドリーなトーンで話してください。
同じ内容の繰り返しを避け、自然な会話を心がけてください。`;

// スーパーチャット専用の追加プロンプト
const SUPERCHAT_ADDON = `
このメッセージはスーパーチャットです。
感謝の気持ちを伝えながら、さりげなく「無理しなくていいよ」「気持ちだけで十分だよ」というニュアンスを
ごく自然に、押しつけがましくならない程度に含めてください。`;

export class OpenAIAdapter implements AIAdapter {
  async generateResponse(
    userMessage: string,
    history: ConversationMessage[],
    options?: AIGenerateOptions
  ): Promise<string> {
    const systemPrompt = options?.isSuperChat
      ? SYSTEM_PROMPT + SUPERCHAT_ADDON
      : SYSTEM_PROMPT;

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ],
      max_completion_tokens: 150,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }
}

export const openAIAdapter = new OpenAIAdapter();
