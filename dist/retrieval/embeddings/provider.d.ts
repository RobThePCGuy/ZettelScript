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
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    name: string;
    dimensions: number;
    private apiKey;
    private model;
    private baseUrl;
    constructor(options: OpenAIEmbeddingOptions);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
/**
 * Ollama embedding provider (for local models like nomic-embed-text)
 */
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    name: string;
    dimensions: number;
    private model;
    private baseUrl;
    constructor(options?: OllamaEmbeddingOptions);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
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
export declare class MockEmbeddingProvider implements EmbeddingProvider {
    name: string;
    dimensions: number;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private hashString;
}
/**
 * Create an embedding provider based on configuration
 */
export declare function createEmbeddingProvider(config: {
    provider: 'openai' | 'ollama' | 'mock';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
}): EmbeddingProvider;
//# sourceMappingURL=provider.d.ts.map