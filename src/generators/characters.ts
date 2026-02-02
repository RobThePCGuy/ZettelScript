/**
 * Character Generator
 * Extracts character metadata from KB and creates character notes
 */

import type {
  GeneratorOptions,
  GeneratorResult,
  KBCharacter,
  KBData,
  CharacterArc,
} from './types.js';
import {
  parseKBJson,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  wikilink,
  section,
  blockquote,
  formatChapters,
  formatList,
  kvPair,
} from './utils.js';
import { RelationshipEngine } from './relationships.js';
import { buildRelatedEntitiesSection, shouldIncludeRelatedEntities } from './related-entities.js';

const CHARACTERS_SUBDIR = 'Characters';

/**
 * Build frontmatter for a character note
 */
function buildCharacterFrontmatter(char: KBCharacter): Record<string, unknown> {
  return {
    id: char.id,
    type: 'character',
    title: char.canonical_name,
    aliases: formatList(char.aliases),
    role: char.role,
    tags: buildTags(char),
    first_appearance: char.first_appearance,
    last_appearance: char.last_appearance,
    chapters: formatList(char.chapters_present?.map(String)),
    age: char.age,
    arc_type: char.arc?.type,
    arc_status: char.arc?.resolution?.status,
  };
}

/**
 * Build tags based on character properties
 */
function buildTags(char: KBCharacter): string[] {
  const tags: string[] = ['character'];

  // Role-based tags
  const role = char.role.toLowerCase();
  if (role.includes('protagonist')) {
    tags.push('protagonist');
  } else if (role.includes('antagonist')) {
    tags.push('antagonist');
  } else if (role.includes('supporting')) {
    tags.push('supporting-character');
  } else if (role.includes('mentor')) {
    tags.push('mentor');
  } else if (role.includes('minor')) {
    tags.push('minor-character');
  }

  // Arc status tags
  if (char.arc?.resolution?.status) {
    const status = char.arc.resolution.status.toLowerCase();
    if (status === 'resolved') {
      tags.push('arc-resolved');
    } else if (status === 'destroyed') {
      tags.push('arc-destroyed');
    } else if (status === 'setup') {
      tags.push('arc-setup');
    }
  }

  return tags;
}

/**
 * Build the content body for a character note
 */
function buildCharacterContent(
  char: KBCharacter,
  relationshipEngine?: RelationshipEngine,
  includeRelated?: boolean
): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${char.canonical_name}\n\n`);

  // Quick reference
  parts.push(section('Overview'));
  const overview: string[] = [];
  overview.push(kvPair('Role', char.role));
  if (char.age) {
    overview.push(kvPair('Age', char.age));
  }
  if (char.chapters_present) {
    overview.push(kvPair('Chapters', formatChapters(char.chapters_present)));
  }
  if (char.relationship_to_protagonist) {
    overview.push(kvPair('Relationship', char.relationship_to_protagonist));
  }
  parts.push(overview.filter(Boolean).join('\n') + '\n\n');

  // Aliases
  if (char.aliases && char.aliases.length > 0) {
    parts.push(section('Aliases', 3));
    parts.push(char.aliases.map(a => `- ${a}`).join('\n') + '\n\n');
  }

  // Physical description
  if (char.physical && Object.keys(char.physical).length > 0) {
    parts.push(section('Physical Description'));
    for (const [key, value] of Object.entries(char.physical)) {
      if (Array.isArray(value)) {
        parts.push(`**${key}:**\n`);
        parts.push(value.map((v: unknown) => `- ${v}`).join('\n') + '\n\n');
      } else if (value) {
        parts.push(`- **${key}:** ${value}\n`);
      }
    }
    parts.push('\n');
  }

  // Personality
  if (char.personality && char.personality.length > 0) {
    parts.push(section('Personality'));
    parts.push(char.personality.map(p => `- ${p}`).join('\n') + '\n\n');
  }

  // Abilities
  if (char.abilities && Object.keys(char.abilities).length > 0) {
    parts.push(section('Abilities'));
    for (const [name, details] of Object.entries(char.abilities)) {
      if (typeof details === 'object' && details !== null) {
        const d = details as Record<string, unknown>;
        parts.push(`### ${name}\n`);
        if (d.status) {
          parts.push(`- **Status:** ${d.status}\n`);
        }
        if (d.notes) {
          parts.push(`- **Notes:** ${d.notes}\n`);
        }
        parts.push('\n');
      } else {
        parts.push(`- **${name}:** ${details}\n`);
      }
    }
    parts.push('\n');
  }

  // Equipment
  if (char.equipment && char.equipment.length > 0) {
    parts.push(section('Equipment'));
    parts.push(char.equipment.map(e => `- ${wikilink(e)}`).join('\n') + '\n\n');
  }

  // Related Entities
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(char.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }

  // Coping mechanism
  if (char.coping_mechanism) {
    parts.push(section('Coping Mechanism'));
    const cm = char.coping_mechanism;
    if (typeof cm === 'object') {
      for (const [key, value] of Object.entries(cm)) {
        parts.push(`- **${key}:** ${value}\n`);
      }
    } else {
      parts.push(`${cm}\n`);
    }
    parts.push('\n');
  }

  // Character arc
  if (char.arc) {
    parts.push(buildArcSection(char.arc));
  }

  // Key quote
  if (char.key_quote) {
    parts.push(section('Key Quote'));
    parts.push(blockquote(char.key_quote) + '\n\n');
  }

  // Final words
  if (char.final_words) {
    parts.push(section('Final Words'));
    parts.push(blockquote(char.final_words) + '\n\n');
  }

  // Backstory
  if (char.backstory && Object.keys(char.backstory).length > 0) {
    parts.push(section('Backstory'));
    for (const [key, value] of Object.entries(char.backstory)) {
      parts.push(`- **${key}:** ${value}\n`);
    }
    parts.push('\n');
  }

  // Entry state
  if (char.entry_state && Object.keys(char.entry_state).length > 0) {
    parts.push(section('Entry State'));
    parts.push(formatStateObject(char.entry_state));
  }

  // Exit state
  if (char.exit_state && Object.keys(char.exit_state).length > 0) {
    parts.push(section('Exit State'));
    parts.push(formatStateObject(char.exit_state));
  }

  return parts.join('');
}

/**
 * Build the arc section
 */
function buildArcSection(arc: CharacterArc): string {
  const parts: string[] = [];

  parts.push(section('Character Arc'));
  parts.push(`**Type:** ${arc.type}\n\n`);
  parts.push(`${arc.description}\n\n`);

  // Key moments
  if (arc.key_moments && arc.key_moments.length > 0) {
    parts.push(section('Key Moments', 3));
    for (const moment of arc.key_moments) {
      parts.push(`- **Chapter ${moment.chapter} - ${moment.beat}:** ${moment.description}\n`);
    }
    parts.push('\n');
  }

  // Resolution
  if (arc.resolution) {
    parts.push(section('Resolution', 3));
    parts.push(`**Status:** ${arc.resolution.status}\n\n`);
    if (arc.resolution.chapter) {
      parts.push(`**Chapter:** ${arc.resolution.chapter}\n\n`);
    }
    if (arc.resolution.key_line) {
      parts.push(blockquote(arc.resolution.key_line) + '\n\n');
    }
    if (arc.resolution.mechanism) {
      parts.push(`*${arc.resolution.mechanism}*\n\n`);
    }
  }

  return parts.join('');
}

/**
 * Format a state object (entry_state or exit_state)
 */
function formatStateObject(state: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`- **${key}:**`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'object') {
      lines.push(`- **${key}:**`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  - ${k}: ${v}`);
      }
    } else {
      lines.push(`- **${key}:** ${value}`);
    }
  }

  return lines.join('\n') + '\n\n';
}

/**
 * Generate character notes from KB data
 */
export async function generateCharacters(
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

  // Create relationship engine for cross-linking
  const relationshipEngine = new RelationshipEngine(kb, options.coOccurrenceThreshold);
  const includeRelated = shouldIncludeRelatedEntities(options.includeRelatedEntities);

  // Process each character
  for (const char of kb.characters) {
    const name = char.canonical_name;

    // Skip duplicates
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate character: ${name}`);
      }
      continue;
    }

    try {
      const filePath = generateNotePath(options.outputDir, CHARACTERS_SUBDIR, name);
      const frontmatter = buildCharacterFrontmatter(char);
      const content = buildCharacterContent(char, relationshipEngine, includeRelated);
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

  result.summary = `Characters: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}
