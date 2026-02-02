/**
 * Timeline Generator
 * Creates timeline event notes from KB data
 */

import type {
  GeneratorOptions,
  GeneratorResult,
  KBTimelineEvent,
  KBData,
} from './types.js';
import {
  parseKBJson,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  section,
} from './utils.js';

const TIMELINE_SUBDIR = 'Timeline';

/**
 * Build frontmatter for a timeline event note
 */
function buildEventFrontmatter(event: KBTimelineEvent): Record<string, unknown> {
  return {
    id: event.id,
    type: 'event',
    title: formatEventTitle(event),
    chapter: event.chapter,
    locked: event.locked || false,
    tags: buildTags(event),
    timeline_position: `chapter-${event.chapter}`,
  };
}

/**
 * Format a title for the event
 */
function formatEventTitle(event: KBTimelineEvent): string {
  // Create a title from the description
  const desc = event.description;

  // If short enough, use directly
  if (desc.length <= 60) {
    return desc;
  }

  // Otherwise truncate
  return desc.slice(0, 57) + '...';
}

/**
 * Build tags based on event properties
 */
function buildTags(event: KBTimelineEvent): string[] {
  const tags: string[] = ['event', 'timeline'];

  // Chapter tag
  tags.push(`chapter-${event.chapter}`);

  // Locked status
  if (event.locked) {
    tags.push('locked');
  }

  // Significance-based tags
  const sig = event.significance?.toLowerCase() || '';
  if (sig.includes('critical')) {
    tags.push('critical-event');
  }

  return tags;
}

/**
 * Build the content body for a timeline event note
 */
function buildEventContent(event: KBTimelineEvent): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${event.description}\n\n`);

  // Locked indicator
  if (event.locked) {
    parts.push('> 🔒 **This event is locked for continuity.**\n\n');
  }

  // Event details
  parts.push(section('Event Details'));
  parts.push(`**Chapter:** ${event.chapter}\n\n`);

  if (event.significance) {
    parts.push(`**Significance:** ${event.significance}\n\n`);
  }

  // Description (expanded)
  parts.push(section('Description'));
  parts.push(event.description + '\n\n');

  // Connections placeholder
  parts.push(section('Related Notes'));
  parts.push('*Characters, locations, and objects involved in this event:*\n\n');
  parts.push('```dataview\n');
  parts.push(`LIST FROM ""\n`);
  parts.push(`WHERE contains(file.outlinks, this.file.link)\n`);
  parts.push('```\n\n');

  // Timeline context
  parts.push(section('Timeline Context'));
  parts.push('```dataview\n');
  parts.push('TABLE chapter as "Chapter", description as "Event"\n');
  parts.push('FROM #timeline\n');
  parts.push(`WHERE chapter >= ${Math.max(1, event.chapter - 1)} AND chapter <= ${event.chapter + 1}\n`);
  parts.push('SORT chapter ASC\n');
  parts.push('```\n\n');

  return parts.join('');
}

/**
 * Generate a filename for a timeline event
 */
function getEventFilename(event: KBTimelineEvent): string {
  const chapterStr = event.chapter.toString().padStart(2, '0');
  const eventNum = event.id.replace(/[^0-9]/g, '').padStart(3, '0');
  return `Event-${chapterStr}-${eventNum}`;
}

/**
 * Generate timeline event notes from KB data
 */
export async function generateTimeline(
  options: GeneratorOptions
): Promise<GeneratorResult> {
  const result: GeneratorResult = {
    created: [],
    skipped: [],
    errors: [],
    summary: '',
  };

  // Load KB data
  let kb: KBData;
  try {
    if (!options.kbPath) {
      throw new Error('KB path is required');
    }
    kb = parseKBJson(options.kbPath);
  } catch (error) {
    result.errors.push({
      file: options.kbPath || 'unknown',
      error: `Failed to load KB: ${error}`,
    });
    result.summary = 'Failed to load KB data';
    return result;
  }

  // Track entities to avoid duplicates
  const tracker = new EntityTracker();

  // Sort events by chapter
  const sortedEvents = [...kb.timeline].sort((a, b) => a.chapter - b.chapter);

  // Process each event
  for (const event of sortedEvents) {
    const eventId = event.id;

    // Skip duplicates
    if (!tracker.add(eventId)) {
      if (options.verbose) {
        console.log(`Skipping duplicate event: ${eventId}`);
      }
      continue;
    }

    try {
      const filename = getEventFilename(event);
      const filePath = generateNotePath(options.outputDir, TIMELINE_SUBDIR, filename);
      const frontmatter = buildEventFrontmatter(event);
      const content = buildEventContent(event);
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
        file: eventId,
        error: `${error}`,
      });
    }
  }

  result.summary = `Timeline: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

/**
 * Generate a timeline index MOC
 */
export async function generateTimelineIndex(
  options: GeneratorOptions
): Promise<string | null> {
  // Load KB data
  let kb: KBData;
  try {
    if (!options.kbPath) {
      throw new Error('KB path is required');
    }
    kb = parseKBJson(options.kbPath);
  } catch {
    return null;
  }

  const parts: string[] = [];

  parts.push('# Timeline Index\n\n');
  parts.push('A chronological view of events.\n\n');

  // Group events by chapter
  const eventsByChapter = new Map<number, KBTimelineEvent[]>();
  for (const event of kb.timeline) {
    const chapter = event.chapter;
    if (!eventsByChapter.has(chapter)) {
      eventsByChapter.set(chapter, []);
    }
    eventsByChapter.get(chapter)!.push(event);
  }

  // Sort chapters
  const sortedChapters = Array.from(eventsByChapter.keys()).sort((a, b) => a - b);

  for (const chapter of sortedChapters) {
    const events = eventsByChapter.get(chapter)!;
    parts.push(`## Chapter ${chapter}\n\n`);

    for (const event of events) {
      const lockIcon = event.locked ? ' 🔒' : '';
      parts.push(`- ${event.description}${lockIcon}\n`);
    }
    parts.push('\n');
  }

  return parts.join('');
}
