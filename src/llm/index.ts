/**
 * LLM integration module
 */

export {
  type LLMProvider,
  type LLMOptions,
  OpenAILLMProvider,
  OllamaLLMProvider,
  createLLMProvider,
} from './provider.js';

export {
  type RewriteContext,
  buildRewritePrompt,
  buildDisambiguationPrompt,
  buildContinuityCheckPrompt,
} from './prompts.js';
