/**
 * The provider-agnostic surface every AI adapter implements. Only
 * `generateText` is required — everything else is optional and
 * capability-checked at the call site (`adapter.analyzeImage?.(...)`),
 * so an adapter that can't do image analysis simply omits the method
 * rather than throwing a "not implemented" stub. New methods get added
 * here the day a real feature needs them, not speculatively.
 */

export interface GenerateTextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateTextInput {
  messages: GenerateTextMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Token accounting — the minimum every provider's chat/completion response exposes in some form. */
export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerateTextResult {
  text: string;
  usage?: AiUsage;
}

export interface GenerateEmbeddingInput {
  text: string;
}

export interface AnalyzeImageInput {
  imageUrl: string;
  prompt: string;
}

export interface TranscribeAudioInput {
  audioUrl: string;
}

export interface GenerateSpeechInput {
  text: string;
}

export interface AiAdapter {
  /** Matches IntegrationSetting.provider — used for logging/usage records, never branched on by feature code. */
  readonly provider: string;
  readonly model: string;

  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;

  // Not implemented by any adapter yet — added here as the contract shape
  // future features will need, so a new adapter can opt in without a
  // second interface or a breaking change to this one.
  generateEmbedding?(input: GenerateEmbeddingInput): Promise<number[]>;
  analyzeImage?(input: AnalyzeImageInput): Promise<string>;
  transcribeAudio?(input: TranscribeAudioInput): Promise<string>;
  generateSpeech?(input: GenerateSpeechInput): Promise<Buffer>;
}

/** Non-secret settings read from IntegrationSetting.config — never a hardcoded provider-specific constant. */
export interface AiProviderConfig {
  model?: string;
  baseUrl?: string;
}

export type AiAdapterFactory = (apiKey: string, config: AiProviderConfig) => AiAdapter;
