import type { ConversationMessage } from '@/types';

export interface AIGenerateOptions {
  isSuperChat?: boolean;
  superChatAmount?: string;  // 例: "¥1,000"
  screenshotBase64?: string; // ゲーム画面キャプチャ（JPEG base64 data URL）
}

/** AI が返すコンテンツ。expression は VTube Studio のホットキー名に直接マッピングする */
export interface AIGeneratedContent {
  text: string;
  expression: string; // normal / happy / excited / surprised / shy / thinking
}

export interface AIAdapter {
  generateResponse(
    userMessage: string,
    history: ConversationMessage[],
    options?: AIGenerateOptions
  ): Promise<AIGeneratedContent>;
}
