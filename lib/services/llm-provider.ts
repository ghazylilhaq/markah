import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface LLMProvider {
  suggestTags(
    title: string,
    description: string,
    url: string
  ): Promise<string[]>;
}

const SYSTEM_PROMPT =
  "You are a bookmark tagging assistant. Given a bookmark's title, description, and URL, suggest 3-5 relevant tags. " +
  "Tags must be lowercase, single-word or hyphenated (e.g. 'javascript', 'machine-learning'). " +
  "Return ONLY a JSON array of strings, no other text. Example: [\"javascript\", \"tutorial\", \"web-dev\"]";

function buildUserPrompt(
  title: string,
  description: string,
  url: string
): string {
  return `Title: ${title}\nDescription: ${description}\nURL: ${url}`;
}

function parseTags(text: string): string[] {
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t))
      .slice(0, 5);
  } catch {
    return [];
  }
}

class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async suggestTags(
    title: string,
    description: string,
    url: string
  ): Promise<string[]> {
    try {
      const response = await this.client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserPrompt(title, description, url) },
        ],
      });
      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return parseTags(text);
    } catch {
      return [];
    }
  }
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async suggestTags(
    title: string,
    description: string,
    url: string
  ): Promise<string[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 256,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(title, description, url) },
        ],
      });
      const text = response.choices[0]?.message?.content ?? "";
      return parseTags(text);
    } catch {
      return [];
    }
  }
}

class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? "http://localhost:11434";
  }

  async suggestTags(
    title: string,
    description: string,
    url: string
  ): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL ?? "llama3.2",
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildUserPrompt(title, description, url),
            },
          ],
        }),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as {
        message?: { content?: string };
      };
      return parseTags(data.message?.content ?? "");
    } catch {
      return [];
    }
  }
}

export function getLLMProvider(): LLMProvider | null {
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;

  switch (provider) {
    case "claude":
      if (!apiKey) return null;
      return new ClaudeProvider(apiKey);
    case "openai":
      if (!apiKey) return null;
      return new OpenAIProvider(apiKey);
    case "ollama":
      return new OllamaProvider(process.env.OLLAMA_BASE_URL);
    default:
      return null;
  }
}
