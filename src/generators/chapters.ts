/**
 * Chapter Generator
 * Splits a manuscript into individual chapter notes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ChapterGeneratorOptions,
  GeneratorResult,
} from './types.js';
import {
  buildNote,
  writeNoteFile,
  sanitizeFilename,
} from './utils.js';

const CHAPTERS_SUBDIR = 'Chapters';

// Chapter heading patterns
// Matches: ## Chapter 1, ## Chapter 1: Title, ## Chapter 01, etc.
const CHAPTER_REGEX = /^##\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im;

// Alternative patterns for different manuscript styles
const ALT_CHAPTER_PATTERNS = [
  /^#\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im,  // Single hash
  /^###\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im, // Triple hash
  /^Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im,       // No hash
  /^##\s+(\d+)\.?\s+(.+)$/im,                         // ## 1. Title
];

interface ChapterData {
  number: number;
  title: string | null;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Parse manuscript content into chapters
 */
function parseChapters(content: string): ChapterData[] {
  const lines = content.split('\n');
  const chapters: ChapterData[] = [];
  let currentChapter: ChapterData | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Try to match chapter heading
    let match = line.match(CHAPTER_REGEX);

    // Try alternative patterns if primary doesn't match
    if (!match) {
      for (const pattern of ALT_CHAPTER_PATTERNS) {
        match = line.match(pattern);
        if (match) break;
      }
    }

    if (match) {
      // Save previous chapter
      if (currentChapter) {
        currentChapter.content = contentLines.join('\n').trim();
        currentChapter.endLine = i - 1;
        chapters.push(currentChapter);
      }

      // Start new chapter
      const chapterNum = parseInt(match[1] ?? '0', 10);
      const chapterTitle = match[2]?.trim() ?? null;

      currentChapter = {
        number: chapterNum,
        title: chapterTitle,
        content: '',
        startLine: i,
        endLine: i,
      };
      contentLines = [];
    } else if (currentChapter) {
      contentLines.push(line);
    }
  }

  // Save last chapter
  if (currentChapter) {
    currentChapter.content = contentLines.join('\n').trim();
    currentChapter.endLine = lines.length - 1;
    chapters.push(currentChapter);
  }

  return chapters;
}

/**
 * Build frontmatter for a chapter note
 */
function buildChapterFrontmatter(chapter: ChapterData): Record<string, unknown> {
  return {
    type: 'scene',
    title: chapter.title || `Chapter ${chapter.number}`,
    chapter: chapter.number,
    scene_order: chapter.number,
    tags: ['chapter'],
  };
}

/**
 * Build the content for a chapter note
 */
function buildChapterContent(chapter: ChapterData): string {
  const parts: string[] = [];

  // Title
  const title = chapter.title
    ? `# Chapter ${chapter.number}: ${chapter.title}`
    : `# Chapter ${chapter.number}`;
  parts.push(title + '\n\n');

  // Chapter content
  parts.push(chapter.content);

  return parts.join('');
}

/**
 * Generate a filename for a chapter
 */
function getChapterFilename(chapter: ChapterData): string {
  const numStr = chapter.number.toString().padStart(2, '0');
  if (chapter.title) {
    const safeTitle = sanitizeFilename(chapter.title);
    return `Chapter-${numStr}-${safeTitle}`;
  }
  return `Chapter-${numStr}`;
}

/**
 * Generate chapter notes from a manuscript file
 */
export async function generateChapters(
  options: ChapterGeneratorOptions
): Promise<GeneratorResult> {
  const result: GeneratorResult = {
    created: [],
    skipped: [],
    errors: [],
    summary: '',
  };

  // Load manuscript
  let manuscript: string;
  try {
    manuscript = fs.readFileSync(options.manuscriptPath, 'utf-8');
  } catch (error) {
    result.errors.push({
      file: options.manuscriptPath,
      error: `Failed to read manuscript: ${error}`,
    });
    result.summary = 'Failed to read manuscript';
    return result;
  }

  // Parse chapters
  const chapters = parseChapters(manuscript);

  if (chapters.length === 0) {
    result.summary = 'No chapters found in manuscript';
    return result;
  }

  if (options.verbose) {
    console.log(`Found ${chapters.length} chapters in manuscript`);
  }

  // Output directory for chapters
  const chaptersDir = options.chaptersDir || CHAPTERS_SUBDIR;

  // Process each chapter
  for (const chapter of chapters) {
    try {
      const filename = getChapterFilename(chapter);
      const filePath = path.join(options.outputDir, chaptersDir, `${filename}.md`);

      const frontmatter = buildChapterFrontmatter(chapter);
      const content = buildChapterContent(chapter);
      const note = buildNote(frontmatter, content);

      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun,
      });

      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: `Chapter ${chapter.number}`,
        error: `${error}`,
      });
    }
  }

  result.summary = `Chapters: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

/**
 * Analyze a manuscript and return chapter info without generating files
 */
export function analyzeManuscript(manuscriptPath: string): {
  chapters: Array<{ number: number; title: string | null; lines: number }>;
  totalLines: number;
} {
  const content = fs.readFileSync(manuscriptPath, 'utf-8');
  const chapters = parseChapters(content);
  const totalLines = content.split('\n').length;

  return {
    chapters: chapters.map(ch => ({
      number: ch.number,
      title: ch.title,
      lines: ch.endLine - ch.startLine + 1,
    })),
    totalLines,
  };
}
