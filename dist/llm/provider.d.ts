/**
 * LLM Provider abstraction for rewrite suggestions
 */
import type { ZettelScriptConfig } from '../core/types/index.js';
export interface LLMOptions {
    maxTokens?: number;
    temperature?: number;
}
export interface LLMProvider {
    name: string;
    modelName: string;
    complete(prompt: string, options?: LLMOptions): Promise<string>;
}
/**
 * OpenAI-compatible LLM provider
 */
export declare class OpenAILLMProvider implements LLMProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private model;
    private defaultMaxTokens;
    private defaultTemperature;
    constructor(config: ZettelScriptConfig['llm']);
    get modelName(): string;
    complete(prompt: string, options?: LLMOptions): Promise<string>;
}
/**
 * Google Gemini LLM provider (BYOK: reads GEMINI_API_KEY when config carries no key).
 *
 * Exists because local extraction is context-bound: a 7B Ollama model chokes on
 * manuscript-scale prose, and most machines cannot run anything bigger. Flash Lite
 * carries a 1M-token context at negligible cost, so whole chapters fit in one chunk.
 * Cloud is opt-in per command; the default everywhere stays local.
 */
export declare class GeminiLLMProvider implements LLMProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private model;
    private defaultMaxTokens;
    private defaultTemperature;
    constructor(config: ZettelScriptConfig['llm']);
    get modelName(): string;
    complete(prompt: string, options?: LLMOptions): Promise<string>;
}
export interface OllamaModelInfo {
    contextLength: number;
    parameterSize?: string;
    family?: string;
}
/**
 * Check if Ollama is running
 */
export declare function checkOllamaRunning(baseUrl?: string): Promise<boolean>;
/**
 * List models available in Ollama
 */
export declare function listOllamaModels(baseUrl?: string): Promise<string[]>;
/**
 * Check if a specific model is available in Ollama
 */
export declare function checkOllamaModelExists(model: string, baseUrl?: string): Promise<boolean>;
/**
 * Pull/download a model from Ollama registry
 * Returns an async generator that yields progress updates
 */
export declare function pullOllamaModel(model: string, baseUrl?: string): AsyncGenerator<{
    status: string;
    completed?: number;
    total?: number;
}>;
/**
 * Query Ollama for model metadata
 */
export declare function getOllamaModelInfo(model: string, baseUrl?: string): Promise<OllamaModelInfo | null>;
/**
 * Ollama LLM provider
 */
export declare class OllamaLLMProvider implements LLMProvider {
    name: string;
    private baseUrl;
    private model;
    private configuredMaxTokens;
    private dynamicMaxTokens;
    private defaultTemperature;
    private modelInfoPromise;
    constructor(config: ZettelScriptConfig['llm']);
    get modelName(): string;
    /**
     * Lazy-load model info to get context length for dynamic max tokens
     */
    private ensureModelInfo;
    /**
     * Get the effective max tokens (configured > dynamic > fallback)
     */
    private getMaxTokens;
    complete(prompt: string, options?: LLMOptions): Promise<string>;
}
/**
 * Create an LLM provider based on config
 * Returns null if provider is 'none' or not configured
 */
export declare function createLLMProvider(config: ZettelScriptConfig['llm']): LLMProvider | null;
//# sourceMappingURL=provider.d.ts.map