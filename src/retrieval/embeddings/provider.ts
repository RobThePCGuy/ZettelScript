/* global fetch */
import { EmbeddingError } from '../../core/errors.js';

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface OllamaEmbeddingOptions {
  model?: string;
  baseUrl?: string;
}

/**
 * OpenAI embedding provider
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions: number;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options: OpenAIEmbeddingOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'text-embedding-3-small';
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.dimensions = this.model.includes('3-small') ? 1536 : 3072;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    if (!result[0]) {
      throw new EmbeddingError('Empty embedding result', this.name);
    }
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new EmbeddingError(`OpenAI API error: ${error}`, this.name);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // Sort by index to maintain order
      const sorted = data.data.sort((a, b) => a.index - b.index);
      return sorted.map(d => d.embedding);
    } catch (error) {
      if (error instanceof EmbeddingError) throw error;
      throw new EmbeddingError(`Failed to get embeddings: ${error}`, this.name);
    }
  }
}

/**
 * Ollama embedding provider (for local models like nomic-embed-text)
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  dimensions: number;
  private model: string;
  private baseUrl: string;

  constructor(options: OllamaEmbeddingOptions = {}) {
    this.model = options.model || 'nomic-embed-text';
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    // nomic-embed-text uses 768 dimensions
    this.dimensions = this.model.includes('nomic') ? 768 : 1536;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new EmbeddingError(`Ollama API error: ${error}`, this.name);
      }

      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch (error) {
      if (error instanceof EmbeddingError) throw error;
      throw new EmbeddingError(`Failed to get embedding: ${error}`, this.name);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't have native batch support, so we process sequentially
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

/**
 * Mock embedding provider for testing and development.
 *
 * This provider generates deterministic embeddings based on text hashes,
 * without making any API calls. It is intentionally included for:
 * - Unit testing without network dependencies
 * - Development environments without API keys
 * - Offline usage scenarios
 *
 * Note: Embeddings from this provider are NOT semantically meaningful.
 * For production use, configure OpenAI or Ollama providers.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  name = 'mock';
  dimensions = 384;

  async embed(text: string): Promise<number[]> {
    // Generate deterministic embeddings based on text hash
    const hash = this.hashString(text);
    const embedding = new Array(this.dimensions).fill(0);

    for (let i = 0; i < this.dimensions; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

/**
 * Create an embedding provider based on configuration
 */
export function createEmbeddingProvider(config: {
  provider: 'openai' | 'ollama' | 'mock';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        throw new EmbeddingError('OpenAI API key required', 'openai');
      }
      return new OpenAIEmbeddingProvider({
        apiKey: config.apiKey,
        ...(config.model != null && { model: config.model }),
        ...(config.baseUrl != null && { baseUrl: config.baseUrl }),
      });

    case 'ollama':
      return new OllamaEmbeddingProvider({
        ...(config.model != null && { model: config.model }),
        ...(config.baseUrl != null && { baseUrl: config.baseUrl }),
      });

    case 'mock':
      return new MockEmbeddingProvider();

    default:
      throw new EmbeddingError(`Unknown provider: ${config.provider}`, 'unknown');
  }
}
