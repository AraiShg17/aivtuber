/**
 * OpenAI Vision API 共通ヘルパー
 *
 * コメント返答・自動発話の両パスで使用する。
 * スクリーンショットがある場合のみ Vision モデルに切り替え、
 * メッセージを [image, text] のマルチパートに組み立てる。
 */

type ImagePart = { type: 'image_url'; image_url: { url: string; detail: 'low' } };
type TextPart  = { type: 'text'; text: string };
export type VisionContent = string | Array<ImagePart | TextPart>;

/** スクリーンショットの有無でモデルを選択する */
export function selectModel(screenshotBase64?: string): string {
  return screenshotBase64
    ? (process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini')
    : (process.env.OPENAI_MODEL        ?? 'gpt-5.4-mini');
}

/** ユーザーメッセージを組み立てる（画像なし→string, あり→マルチパート） */
export function buildUserContent(text: string, screenshotBase64?: string): VisionContent {
  if (!screenshotBase64) return text;
  return [
    { type: 'image_url', image_url: { url: screenshotBase64, detail: 'low' } },
    { type: 'text', text },
  ];
}

/** AI レスポンス JSON をパースする。失敗時は全文を text、expression を normal にする */
export function parseAIResponse(raw: string): { text: string; expression: string } {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      text:       String(parsed.text       ?? ''),
      expression: String(parsed.expression ?? 'normal'),
    };
  } catch {
    return { text: raw.trim(), expression: 'normal' };
  }
}
