/**
 * LLM Provider abstraction for rewrite suggestions
 */
/* global fetch */

import type { ZettelScriptConfig } from '../core/types/index.js';

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  complete(prompt: string, options?: LLMOptions): Promise<string>;
}

/**
 * OpenAI-compatible LLM provider
 */
export class OpenAILLMProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ZettelScriptConfig['llm']) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;
    const temperature = options?.temperature ?? this.defaultTemperature;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? '';
  }
}

export interface OllamaModelInfo {
  contextLength: number;
  parameterSize?: string;
  family?: string;
}

/**
 * Query Ollama for model metadata
 */
export async function getOllamaModelInfo(
  model: string,
  baseUrl = 'http://localhost:11434'
): Promise<OllamaModelInfo | null> {
  try {
    const response = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      model_info?: Record<string, unknown>;
      details?: { parameter_size?: string; family?: string };
    };

    // Context length is in model_info with key like "llama.context_length" or "general.context_length"
    let contextLength = 2048; // fallback
    if (data.model_info) {
      for (const [key, value] of Object.entries(data.model_info)) {
        if (key.includes('context_length') && typeof value === 'number') {
          contextLength = value;
          break;
        }
      }
    }

    const info: OllamaModelInfo = { contextLength };
    if (data.details?.parameter_size) info.parameterSize = data.details.parameter_size;
    if (data.details?.family) info.family = data.details.family;
    return info;
  } catch {
    return null;
  }
}

/**
 * Ollama LLM provider
 */
export class OllamaLLMProvider implements LLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;
  private configuredMaxTokens: number | undefined;
  private dynamicMaxTokens: number | undefined;
  private defaultTemperature: number;
  private modelInfoPromise: Promise<void> | null = null;

  constructor(config: ZettelScriptConfig['llm']) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model;
    // Only set if explicitly configured - undefined means "use dynamic"
    this.configuredMaxTokens = config.maxTokens;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  /**
   * Lazy-load model info to get context length for dynamic max tokens
   */
  private async ensureModelInfo(): Promise<void> {
    if (this.dynamicMaxTokens !== undefined) return;

    if (!this.modelInfoPromise) {
      this.modelInfoPromise = (async () => {
        const info = await getOllamaModelInfo(this.model, this.baseUrl);
        if (info) {
          // Use 1/4 of context for output, capped at 8192
          this.dynamicMaxTokens = Math.min(Math.floor(info.contextLength / 4), 8192);
        } else {
          // Fallback if we can't get model info
          this.dynamicMaxTokens = 2048;
        }
      })();
    }
    await this.modelInfoPromise;
  }

  /**
   * Get the effective max tokens (configured > dynamic > fallback)
   */
  private async getMaxTokens(override?: number): Promise<number> {
    if (override !== undefined) return override;
    if (this.configuredMaxTokens !== undefined) return this.configuredMaxTokens;

    await this.ensureModelInfo();
    return this.dynamicMaxTokens ?? 2048;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = await this.getMaxTokens(options?.maxTokens);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { response?: string };

    return data.response ?? '';
  }
}

/**
 * Create an LLM provider based on config
 * Returns null if provider is 'none' or not configured
 */
export function createLLMProvider(config: ZettelScriptConfig['llm']): LLMProvider | null {
  if (config.provider === 'none') {
    return null;
  }

  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        return null;
      }
      return new OpenAILLMProvider(config);

    case 'ollama':
      return new OllamaLLMProvider(config);

    default:
      return null;
  }
}
