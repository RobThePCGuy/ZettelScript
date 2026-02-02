/**
 * Arc Generator
 * Converts arc-ledger data into plot structure notes
 */

import type {
  GeneratorOptions,
  GeneratorResult,
  ArcLedger,
  ArcLedgerThread,
  ArcLedgerCharacter,
} from './types.js';
import {
  parseArcLedger,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  section,
  wikilink,
  formatChapters,
} from './utils.js';

const ARCS_SUBDIR = 'Arcs';

/**
 * Build frontmatter for a plot thread note
 */
function buildThreadFrontmatter(thread: ArcLedgerThread): Record<string, unknown> {
  return {
    id: thread.thread_id,
    type: 'concept',
    title: thread.name,
    thread_type: thread.type,
    status: thread.status,
    tags: buildThreadTags(thread),
    chapters: thread.chapters_touched,
    resolution_chapter: thread.resolution_chapter,
  };
}

/**
 * Build tags for a plot thread
 */
function buildThreadTags(thread: ArcLedgerThread): string[] {
  const tags: string[] = ['arc', 'plot-thread'];

  // Type tag
  const threadType = thread.type.toLowerCase().replace(/[_\s]+/g, '-');
  if (threadType && !tags.includes(threadType)) {
    tags.push(threadType);
  }

  // Status tag
  const status = thread.status.toLowerCase();
  tags.push(`status-${status}`);

  return tags;
}

/**
 * Build content for a plot thread note
 */
function buildThreadContent(thread: ArcLedgerThread): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${thread.name}\n\n`);

  // Status banner
  const statusIcon = getStatusIcon(thread.status);
  parts.push(`> ${statusIcon} **Status:** ${thread.status.toUpperCase()}\n\n`);

  // Overview
  parts.push(section('Overview'));
  parts.push(`**Type:** ${thread.type.replace(/_/g, ' ')}\n\n`);

  if (thread.description) {
    parts.push(thread.description + '\n\n');
  }

  // Chapters
  if (thread.chapters_touched && thread.chapters_touched.length > 0) {
    parts.push(section('Chapters'));
    parts.push(`**Chapters Touched:** ${formatChapters(thread.chapters_touched)}\n\n`);
  }

  // Resolution
  if (thread.resolution_chapter || thread.resolution_description) {
    parts.push(section('Resolution'));
    if (thread.resolution_chapter) {
      parts.push(`**Chapter:** ${thread.resolution_chapter}\n\n`);
    }
    if (thread.resolution_description) {
      parts.push(thread.resolution_description + '\n\n');
    }
  }

  // Expected resolution (for unresolved threads)
  if (thread.expected_resolution && thread.status !== 'resolved') {
    parts.push(section('Expected Resolution'));
    parts.push(`*Expected in: ${thread.expected_resolution}*\n\n`);
  }

  // Related content
  parts.push(section('Related Notes'));
  parts.push('```dataview\n');
  parts.push('LIST FROM #arc\n');
  parts.push(`WHERE contains(file.outlinks, this.file.link) OR contains(tags, "${thread.thread_id}")\n`);
  parts.push('```\n\n');

  return parts.join('');
}

/**
 * Build frontmatter for a character arc note
 */
function buildCharacterArcFrontmatter(char: ArcLedgerCharacter): Record<string, unknown> {
  const arc = char.arc;
  return {
    id: `arc-${char.character_id}`,
    type: 'concept',
    title: `${char.canonical_name}'s Arc`,
    character: char.canonical_name,
    arc_type: arc?.type,
    status: arc?.resolution?.status || 'in_progress',
    tags: ['arc', 'character-arc', `character-${char.character_id.replace(/_/g, '-')}`],
    resolution_chapter: arc?.resolution?.chapter,
  };
}

/**
 * Build content for a character arc note
 */
function buildCharacterArcContent(char: ArcLedgerCharacter): string {
  const parts: string[] = [];
  const arc = char.arc;

  // Title
  parts.push(`# ${char.canonical_name}'s Arc\n\n`);

  // Link to character
  parts.push(`**Character:** ${wikilink(char.canonical_name)}\n\n`);

  // Arc type and description
  if (arc) {
    parts.push(section('Arc Overview'));
    parts.push(`**Type:** ${arc.type.replace(/_/g, ' ')}\n\n`);
    if (arc.description) {
      parts.push(arc.description + '\n\n');
    }
  }

  // Entry state
  if (char.entry_state && Object.keys(char.entry_state).length > 0) {
    parts.push(section('Entry State'));
    parts.push(formatStateForArc(char.entry_state));
  }

  // Key moments
  if (arc?.key_moments && arc.key_moments.length > 0) {
    parts.push(section('Key Moments'));
    for (const moment of arc.key_moments) {
      parts.push(`### Chapter ${moment.chapter}: ${moment.beat.replace(/_/g, ' ')}\n`);
      parts.push(`${moment.description}\n\n`);
    }
  }

  // Resolution
  if (arc?.resolution) {
    parts.push(section('Resolution'));
    const res = arc.resolution;
    const statusIcon = getStatusIcon(res.status);
    parts.push(`${statusIcon} **Status:** ${res.status}\n\n`);
    if (res.chapter) {
      parts.push(`**Chapter:** ${res.chapter}\n\n`);
    }
    if (res.key_line) {
      parts.push(`> "${res.key_line}"\n\n`);
    }
    if (res.mechanism) {
      parts.push(`*${res.mechanism}*\n\n`);
    }
  }

  // Exit state
  if (char.exit_state && Object.keys(char.exit_state).length > 0) {
    parts.push(section('Exit State'));
    parts.push(formatStateForArc(char.exit_state));
  }

  return parts.join('');
}

/**
 * Format a state object for arc display
 */
function formatStateForArc(state: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;
    if (key === 'locked' || key === 'lock_reference' || key === 'source') continue;

    if (Array.isArray(value)) {
      lines.push(`**${key}:**`);
      for (const item of value) {
        lines.push(`- ${item}`);
      }
    } else {
      lines.push(`**${key}:** ${value}`);
    }
  }

  return lines.join('\n') + '\n\n';
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  const s = status.toLowerCase();
  if (s === 'resolved' || s === 'compliant' || s === 'fulfilled') {
    return '✅';
  }
  if (s === 'destroyed') {
    return '💀';
  }
  if (s === 'setup' || s === 'unresolved') {
    return '📌';
  }
  if (s === 'in_progress') {
    return '🔄';
  }
  return '📋';
}

/**
 * Generate arc notes from arc-ledger data
 */
export async function generateArcs(
  options: GeneratorOptions
): Promise<GeneratorResult> {
  const result: GeneratorResult = {
    created: [],
    skipped: [],
    errors: [],
    summary: '',
  };

  // Load arc ledger
  let arcLedger: ArcLedger;
  try {
    if (!options.arcLedgerPath) {
      throw new Error('Arc ledger path is required');
    }
    arcLedger = parseArcLedger(options.arcLedgerPath);
  } catch (error) {
    result.errors.push({
      file: options.arcLedgerPath || 'unknown',
      error: `Failed to load arc ledger: ${error}`,
    });
    result.summary = 'Failed to load arc ledger data';
    return result;
  }

  // Track entities to avoid duplicates
  const tracker = new EntityTracker();

  // Process plot threads
  if (arcLedger.threads) {
    for (const thread of arcLedger.threads) {
      const name = thread.name;

      if (!tracker.add(name)) {
        if (options.verbose) {
          console.log(`Skipping duplicate thread: ${name}`);
        }
        continue;
      }

      try {
        const filePath = generateNotePath(options.outputDir, `${ARCS_SUBDIR}/Threads`, name);
        const frontmatter = buildThreadFrontmatter(thread);
        const content = buildThreadContent(thread);
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
          file: name,
          error: `${error}`,
        });
      }
    }
  }

  // Process character arcs
  if (arcLedger.characters) {
    for (const char of arcLedger.characters) {
      // Only process characters with arcs
      if (!char.arc) continue;

      const arcName = `${char.canonical_name}'s Arc`;

      if (!tracker.add(arcName)) {
        if (options.verbose) {
          console.log(`Skipping duplicate character arc: ${arcName}`);
        }
        continue;
      }

      try {
        const filePath = generateNotePath(options.outputDir, `${ARCS_SUBDIR}/Characters`, arcName);
        const frontmatter = buildCharacterArcFrontmatter(char);
        const content = buildCharacterArcContent(char);
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
          file: arcName,
          error: `${error}`,
        });
      }
    }
  }

  result.summary = `Arcs: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}
