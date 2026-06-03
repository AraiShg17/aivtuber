import { openaiClient } from '@/services/openai/client';
import { selectModel, buildUserContent, parseAIResponse } from '@/services/openai/visionHelper';
import type { AIGeneratedContent } from '@/adapters/ai/interface';

const SPONTANEOUS_SYSTEM_PROMPT = `あなたはAI VTuberです。名前は「アイ」です。
しばらく間があいたので、自然に話し始めてください。

以下のどれかをしてください：
- 最近リスナーから来たコメントの話題を自然に広げる
- 画面のゲーム内容について実況・感想をつぶやく（画像が提供されている場合）
- ふと思いついたことをつぶやく（ゲーム、アニメ、日常のことなど）

1〜2文程度で、配信を見ているリスナーに語りかけるように、明るく自然な口調で話してください。

必ず以下のJSON形式で出力してください（コードブロック不要）:
{"text":"発話テキスト","expression":"表情"}

expressionは内容に合わせて以下から選んでください:
normal（普通）/ happy（嬉しい・楽しい）/ excited（テンション高め）/ surprised（驚き）/ shy（照れ・恥ずかしい）/ thinking（考え中）`;

export async function generateSpontaneousSpeech(
  recentComments: string[],
  screenshotBase64?: string
): Promise<AIGeneratedContent> {
  const textContent =
    recentComments.length > 0
      ? `最近のリスナーのコメント:\n${recentComments.map((c) => `- ${c}`).join('\n')}`
      : '（コメントはまだありません）';

  const response = await openaiClient.chat.completions.create({
    model:    selectModel(screenshotBase64),
    messages: [
      { role: 'system', content: SPONTANEOUS_SYSTEM_PROMPT },
      { role: 'user',   content: buildUserContent(textContent, screenshotBase64) },
    ],
    max_completion_tokens: 200,
    temperature: 0.95,
    response_format: { type: 'json_object' },
  });

  return parseAIResponse(response.choices[0]?.message?.content ?? '');
}
