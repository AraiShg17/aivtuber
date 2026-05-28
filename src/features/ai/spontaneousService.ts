import { openaiClient } from '@/services/openai/client';

const SPONTANEOUS_SYSTEM_PROMPT = `あなたはAI VTuberです。名前は「アイ」です。
しばらく間があいたので、自然に話し始めてください。

以下のどちらかをしてください：
- 最近リスナーから来たコメントの話題を自然に広げる
- ふと思いついたことをつぶやく（ゲーム、アニメ、日常のことなど）

1〜2文程度で、配信を見ているリスナーに語りかけるように、明るく自然な口調で話してください。`;

export async function generateSpontaneousSpeech(
  recentComments: string[]
): Promise<string> {
  const userContent =
    recentComments.length > 0
      ? `最近のリスナーのコメント:\n${recentComments.map((c) => `- ${c}`).join('\n')}`
      : '（コメントはまだありません）';

  const response = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: SPONTANEOUS_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_completion_tokens: 150,
    temperature: 0.95, // 通常より高め：より自由な発想
  });

  return response.choices[0]?.message?.content?.trim() ?? '';
}
