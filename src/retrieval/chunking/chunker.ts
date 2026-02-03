import type { Chunk, ZettelScriptConfig } from '../../core/types/index.js';
import { DEFAULT_CONFIG } from '../../core/types/index.js';
import {
  splitIntoSections,
  splitIntoParagraphs,
  type ParsedMarkdown,
} from '../../parser/markdown.js';

export interface ChunkingOptions {
  strategy: 'paragraph' | 'section' | 'sliding' | 'scene';
  maxTokens?: number;
  overlap?: number;
  minChunkSize?: number;
  config?: ZettelScriptConfig;
}

export interface ChunkCandidate {
  text: string;
  offsetStart: number;
  offsetEnd: number;
  metadata?: Record<string, unknown>;
}

/**
 * Get chunking defaults from config
 */
function getDefaults(options: ChunkingOptions): {
  maxTokens: number;
  overlap: number;
  minSize: number;
} {
  const config = options.config ?? DEFAULT_CONFIG;
  return {
    maxTokens: options.maxTokens ?? config.chunking.maxTokens,
    overlap: options.overlap ?? config.chunking.overlap,
    minSize: options.minChunkSize ?? config.chunking.minChunkSize,
  };
}

/**
 * Approximate token count (rough estimate)
 * For accurate counting, use tiktoken
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Chunk content by paragraphs
 */
export function chunkByParagraph(
  content: string,
  contentStartOffset: number,
  options: ChunkingOptions
): ChunkCandidate[] {
  const defaults = getDefaults(options);
  const maxTokens = defaults.maxTokens;
  const minSize = defaults.minSize;

  const paragraphs = splitIntoParagraphs(content);
  const chunks: ChunkCandidate[] = [];

  let currentChunk = '';
  let currentStart = contentStartOffset;
  let currentEnd = contentStartOffset;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para.text);

    if (currentChunk && estimateTokens(currentChunk) + paraTokens > maxTokens) {
      // Save current chunk
      if (currentChunk.length >= minSize) {
        chunks.push({
          text: currentChunk.trim(),
          offsetStart: currentStart,
          offsetEnd: currentEnd,
        });
      }
      currentChunk = '';
      currentStart = para.start + contentStartOffset;
    }

    if (!currentChunk) {
      currentStart = para.start + contentStartOffset;
    }

    currentChunk += (currentChunk ? '\n\n' : '') + para.text;
    currentEnd = para.end + contentStartOffset;
  }

  // Save last chunk
  if (currentChunk.length >= minSize) {
    chunks.push({
      text: currentChunk.trim(),
      offsetStart: currentStart,
      offsetEnd: currentEnd,
    });
  }

  return chunks;
}

/**
 * Chunk content by sections (headings)
 */
export function chunkBySection(parsed: ParsedMarkdown, options: ChunkingOptions): ChunkCandidate[] {
  const defaults = getDefaults(options);
  const maxTokens = defaults.maxTokens;
  const minSize = defaults.minSize;

  const sections = splitIntoSections(parsed);
  const chunks: ChunkCandidate[] = [];

  for (const section of sections) {
    const sectionText = section.heading
      ? `# ${section.heading}\n\n${section.content}`
      : section.content;

    const tokens = estimateTokens(sectionText);

    if (tokens <= maxTokens) {
      // Section fits in one chunk
      if (sectionText.length >= minSize) {
        chunks.push({
          text: sectionText,
          offsetStart: section.start,
          offsetEnd: section.end,
          metadata: { heading: section.heading, level: section.level },
        });
      }
    } else {
      // Split section into smaller chunks
      const subChunks = chunkByParagraph(section.content, section.start, options);
      for (const subChunk of subChunks) {
        chunks.push({
          ...subChunk,
          metadata: { heading: section.heading, level: section.level },
        });
      }
    }
  }

  return chunks;
}

/**
 * Chunk content using sliding window
 */
export function chunkBySliding(
  content: string,
  contentStartOffset: number,
  options: ChunkingOptions
): ChunkCandidate[] {
  const defaults = getDefaults(options);
  const maxTokens = defaults.maxTokens;
  const overlap = defaults.overlap;
  const minSize = defaults.minSize;

  const chunks: ChunkCandidate[] = [];
  const words = content.split(/\s+/);

  // Estimate words per chunk
  const wordsPerChunk = maxTokens * 0.75; // Conservative estimate
  const stepSize = Math.max(1, Math.floor(wordsPerChunk - overlap * 0.75));

  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + Math.floor(wordsPerChunk));
    const chunkText = chunkWords.join(' ');

    if (chunkText.length >= minSize) {
      // Calculate approximate offsets
      const beforeText = words.slice(0, i).join(' ');
      const start = contentStartOffset + beforeText.length + (i > 0 ? 1 : 0);
      const end = start + chunkText.length;

      chunks.push({
        text: chunkText,
        offsetStart: start,
        offsetEnd: end,
      });
    }

    i += stepSize;
  }

  return chunks;
}

/**
 * Chunk content for scenes (manuscript-specific)
 * Keeps scene beats together, respects dialogue blocks
 */
export function chunkByScene(
  content: string,
  contentStartOffset: number,
  options: ChunkingOptions
): ChunkCandidate[] {
  const defaults = getDefaults(options);
  const maxTokens = defaults.maxTokens * 2; // Larger chunks for scenes
  const minSize = defaults.minSize;

  // Split by scene breaks (*** or --- or blank lines with context)
  const sceneBreakPattern = /\n(?:\s*(?:\*\*\*|---|___)\s*\n|\n{3,})/g;
  const parts = content.split(sceneBreakPattern);

  const chunks: ChunkCandidate[] = [];
  let offset = contentStartOffset;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length < minSize) {
      offset += part.length + 3; // Account for separator
      continue;
    }

    const tokens = estimateTokens(trimmed);

    if (tokens <= maxTokens) {
      chunks.push({
        text: trimmed,
        offsetStart: offset,
        offsetEnd: offset + part.length,
        metadata: { type: 'scene_beat' },
      });
    } else {
      // Fall back to paragraph chunking for long scenes
      const subChunks = chunkByParagraph(trimmed, offset, {
        ...options,
        maxTokens,
      });
      chunks.push(...subChunks);
    }

    offset += part.length + 3;
  }

  return chunks;
}

/**
 * Main chunking function
 */
export function chunkContent(parsed: ParsedMarkdown, options: ChunkingOptions): ChunkCandidate[] {
  switch (options.strategy) {
    case 'paragraph':
      return chunkByParagraph(parsed.content, parsed.contentStartOffset, options);

    case 'section':
      return chunkBySection(parsed, options);

    case 'sliding':
      return chunkBySliding(parsed.content, parsed.contentStartOffset, options);

    case 'scene':
      return chunkByScene(parsed.content, parsed.contentStartOffset, options);

    default:
      return chunkByParagraph(parsed.content, parsed.contentStartOffset, options);
  }
}

/**
 * Create chunks from candidates with metadata
 */
export function createChunks(
  candidates: ChunkCandidate[],
  nodeId: string,
  versionId: string
): Omit<Chunk, 'chunkId'>[] {
  return candidates.map((candidate) => ({
    nodeId,
    text: candidate.text,
    offsetStart: candidate.offsetStart,
    offsetEnd: candidate.offsetEnd,
    versionId,
    tokenCount: estimateTokens(candidate.text),
  }));
}
