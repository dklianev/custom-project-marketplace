import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  ChatCompletionContentPartImage,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";
import type {
  AIProvider,
  ChatMessage,
  EmbeddingResponse,
  LLMResponse,
} from "@/lib/ai/types";

let openAiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getProvider(name: string): AIProvider {
  const value = getOptionalEnv(name);
  if (value === "anthropic" || value === "google") {
    return value;
  }
  return "openai";
}

function getModel(name: string, fallback: string): string {
  return getOptionalEnv(name) ?? fallback;
}

function getOpenAI(): OpenAI {
  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: getRequiredEnv("OPENAI_API_KEY") });
  }

  return openAiClient;
}

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
    });
  }

  return anthropicClient;
}

function toOpenAiMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (typeof message.content === "string") {
      return { role: message.role, content: message.content } as ChatCompletionMessageParam;
    }

    const content = message.content.map((part) => {
      if (part.type === "image_url") {
        return {
          type: "image_url",
          image_url: {
            url: part.image_url.url,
            detail: part.image_url.detail ?? "auto",
          },
        } satisfies ChatCompletionContentPartImage;
      }

      return {
        type: "text",
        text: part.text,
      } satisfies ChatCompletionContentPartText;
    });

    return {
      role: message.role === "system" ? "user" : message.role,
      content,
    } as ChatCompletionMessageParam;
  });
}

export async function chatCompletion(opts: {
  messages: ChatMessage[];
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<LLMResponse> {
  const provider = opts.provider ?? getProvider("LLM_PROVIDER");
  const model = opts.model ?? getModel("LLM_MODEL", "gpt-4o");
  const maxTokens = opts.maxTokens ?? 1000;

  if (provider === "openai") {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      response_format: opts.jsonMode ? { type: "json_object" } : undefined,
      messages: toOpenAiMessages(opts.messages),
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      provider: "openai",
      model,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      },
    };
  }

  if (provider === "anthropic") {
    const anthropic = getAnthropic();
    const systemMessage = opts.messages.find((message) => message.role === "system");
    const anthropicMessages = opts.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role:
          message.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content:
          typeof message.content === "string"
            ? [{ type: "text" as const, text: message.content }]
            : message.content.map((part) =>
                part.type === "image_url"
                  ? {
                      type: "image" as const,
                      source: {
                        type: "url" as const,
                        url: part.image_url.url,
                      },
                    }
                  : { type: "text" as const, text: part.text },
              ),
      }));

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system:
        typeof systemMessage?.content === "string"
          ? systemMessage.content
          : systemMessage?.content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n"),
      messages: anthropicMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");

    return {
      text: textBlock?.type === "text" ? textBlock.text : "",
      provider: "anthropic",
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export async function fastCompletion(opts: {
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<LLMResponse> {
  return chatCompletion({
    ...opts,
    model: getModel("LLM_MODEL_FAST", "gpt-4o-mini"),
  });
}

export async function visionAnalysis(opts: {
  imageUrl: string;
  prompt: string;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<LLMResponse> {
  return chatCompletion({
    provider: getProvider("LLM_VISION_PROVIDER"),
    model: getModel("LLM_VISION_MODEL", "gpt-4o"),
    maxTokens: opts.maxTokens ?? 500,
    jsonMode: opts.jsonMode,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          { type: "image_url", image_url: { url: opts.imageUrl, detail: "low" } },
        ],
      },
    ],
  });
}

export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  const provider = getProvider("EMBEDDING_PROVIDER");
  const model = getModel("EMBEDDING_MODEL", "text-embedding-3-large");
  const dimensions = Number.parseInt(
    getOptionalEnv("EMBEDDING_DIMENSIONS") ?? "1536",
    10,
  );

  if (provider !== "openai") {
    throw new Error(`Embedding provider ${provider} is not implemented yet.`);
  }

  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model,
    input: text,
    dimensions,
  });

  return {
    embedding: response.data[0]?.embedding ?? [],
    provider: "openai",
    model,
  };
}

export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
}> {
  const provider = getProvider("MODERATION_PROVIDER");

  if (provider === "openai") {
    const openai = getOpenAI();
    const response = await openai.moderations.create({
      model: getModel("MODERATION_MODEL", "omni-moderation-latest"),
      input: text,
    });

    const result = response.results[0];
    return {
      flagged: result?.flagged ?? false,
      categories: Object.fromEntries(
        Object.entries(result?.categories ?? {}).map(([key, value]) => [
          key,
          Boolean(value),
        ]),
      ),
    };
  }

  const fallback = await fastCompletion({
    jsonMode: true,
    maxTokens: 300,
    messages: [
      {
        role: "system",
        content:
          'You are a marketplace moderator. Return JSON with {"flagged": boolean, "categories": Record<string, boolean> }.',
      },
      { role: "user", content: text },
    ],
  });

  const parsed = JSON.parse(fallback.text) as {
    flagged?: boolean;
    categories?: Record<string, boolean>;
  };

  return {
    flagged: parsed.flagged ?? false,
    categories: parsed.categories ?? {},
  };
}

export async function chatWithFallback(opts: {
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<LLMResponse> {
  try {
    return await chatCompletion(opts);
  } catch (error) {
    const fallbackProvider = getOptionalEnv("LLM_FALLBACK_PROVIDER");
    const fallbackModel = getOptionalEnv("LLM_FALLBACK_MODEL");

    if (!fallbackProvider || !fallbackModel) {
      throw error;
    }

    return chatCompletion({
      ...opts,
      provider: fallbackProvider as AIProvider,
      model: fallbackModel,
    });
  }
}
