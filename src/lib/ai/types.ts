export type AIProvider = "openai" | "anthropic" | "google";

export type TextContentPart = {
  type: "text";
  text: string;
};

export type ImageContentPart = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<TextContentPart | ImageContentPart>;
};

export type LLMResponse = {
  text: string;
  provider: AIProvider;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type EmbeddingResponse = {
  embedding: number[];
  provider: AIProvider;
  model: string;
};
