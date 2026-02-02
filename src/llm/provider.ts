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

/**
 * Ollama LLM provider
 */
export class OllamaLLMProvider implements LLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ZettelScriptConfig['llm']) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const temperature = options?.temperature ?? this.defaultTemperature;

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
          num_predict: options?.maxTokens ?? this.defaultMaxTokens,
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
