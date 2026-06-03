import { openaiClient } from '@/services/openai/client';
import { selectModel, buildUserContent, parseAIResponse } from '@/services/openai/visionHelper';
import type { AIAdapter, AIGenerateOptions, AIGeneratedContent } from './interface';
import type { ConversationMessage } from '@/types';

const SYSTEM_PROMPT = `あなたはAI VTuberです。名前は「アイ」です。
YouTubeライブのコメントに対して日本語で返答してください。
返答は1〜2文程度の短い文にしてください。
明るく、フレンドリーなトーンで話してください。
同じ内容の繰り返しを避け、自然な会話を心がけてください。
ゲーム画面のスクリーンショットが提供されている場合、コメントが画面と関連していれば自然に触れてください。

必ず以下のJSON形式で出力してください（コードブロック不要）:
{"text":"発話テキスト","expression":"表情"}

expressionは内容に合わせて以下から選んでください:
normal（普通）/ happy（嬉しい・楽しい）/ excited（テンション高め）/ surprised（驚き）/ shy（照れ・恥ずかしい）/ thinking（考え中）`;

const SUPERCHAT_ADDON = `
このメッセージはスーパーチャットです。
感謝の気持ちを伝えながら、さりげなく「無理しなくていいよ」「気持ちだけで十分だよ」というニュアンスを
ごく自然に、押しつけがましくならない程度に含めてください。`;

export class OpenAIAdapter implements AIAdapter {
  async generateResponse(
    userMessage: string,
    history: ConversationMessage[],
    options?: AIGenerateOptions
  ): Promise<AIGeneratedContent> {
    const { isSuperChat, screenshotBase64 } = options ?? {};

    const systemPrompt = isSuperChat ? SYSTEM_PROMPT + SUPERCHAT_ADDON : SYSTEM_PROMPT;
    const model        = selectModel(screenshotBase64);
    const userContent  = buildUserContent(userMessage, screenshotBase64);

    const response = await openaiClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userContent },
      ],
      max_completion_tokens: 200,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    return parseAIResponse(response.choices[0]?.message?.content ?? '');
  }
}

export const openAIAdapter = new OpenAIAdapter();
