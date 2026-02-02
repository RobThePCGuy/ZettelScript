/**
 * Object Generator
 * Creates object/artifact notes from KB data with lock level system
 */

import type {
  GeneratorOptions,
  GeneratorResult,
  KBObject,
  KBData,
  LockLevel,
} from './types.js';
import {
  parseKBJson,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  section,
  wikilink,
  kvPair,
} from './utils.js';
import { getLockLevel } from './types.js';

const OBJECTS_SUBDIR = 'Objects';

/**
 * Build frontmatter for an object note
 */
function buildObjectFrontmatter(obj: KBObject): Record<string, unknown> {
  const lockLevel = getLockLevel(obj);

  return {
    id: obj.id,
    type: 'object',
    title: obj.name,
    object_type: obj.type,
    lock_level: lockLevel,
    locked: obj.locked || false,
    tags: buildTags(obj, lockLevel),
    holder: obj.holder || undefined,
    status: obj.status || undefined,
  };
}

/**
 * Build tags based on object properties
 */
function buildTags(obj: KBObject, lockLevel: LockLevel): string[] {
  const tags: string[] = ['object'];

  // Type-based tags
  const objType = obj.type.toLowerCase().replace(/[_\s]+/g, '-');
  if (objType && !tags.includes(objType)) {
    tags.push(objType);
  }

  // Lock level tags
  if (lockLevel === 'CRITICAL') {
    tags.push('critical-item');
  } else if (lockLevel === 'HIGH') {
    tags.push('important-item');
  }

  // Locked status
  if (obj.locked) {
    tags.push('locked');
  }

  return tags;
}

/**
 * Get lock level icon
 */
function getLockIcon(lockLevel: LockLevel): string {
  switch (lockLevel) {
    case 'CRITICAL':
      return '🔒';
    case 'HIGH':
      return '⚠️';
    case 'MEDIUM':
      return '📌';
    case 'LOW':
      return '📎';
  }
}

/**
 * Build the content body for an object note
 */
function buildObjectContent(obj: KBObject): string {
  const parts: string[] = [];
  const lockLevel = getLockLevel(obj);
  const lockIcon = getLockIcon(lockLevel);

  // Title with lock indicator
  parts.push(`# ${obj.name} ${obj.locked ? lockIcon : ''}\n\n`);

  // Overview section
  parts.push(section('Overview'));
  const overview: string[] = [];
  overview.push(kvPair('Type', obj.type.replace(/_/g, ' ')));
  overview.push(kvPair('Lock Level', `${lockLevel} ${lockIcon}`));
  if (obj.holder) {
    overview.push(kvPair('Current Holder', wikilink(obj.holder)));
  }
  if (obj.holders && obj.holders.length > 0) {
    const holderLinks = obj.holders.map(h => wikilink(h)).join(', ');
    overview.push(kvPair('Holders', holderLinks));
  }
  if (obj.status) {
    overview.push(kvPair('Status', obj.status));
  }
  parts.push(overview.filter(Boolean).join('\n') + '\n\n');

  // Description
  if (obj.description) {
    parts.push(section('Description'));
    parts.push(obj.description + '\n\n');
  }

  // Properties
  if (obj.properties && obj.properties.length > 0) {
    parts.push(section('Properties'));
    parts.push(obj.properties.map(p => `- ${p}`).join('\n') + '\n\n');
  }

  // Significance
  if (obj.significance) {
    parts.push(section('Significance'));
    parts.push(obj.significance + '\n\n');
  }

  // Lock warning for critical items
  if (lockLevel === 'CRITICAL') {
    parts.push(section('Continuity Lock', 3));
    parts.push('> ⚠️ **This item is locked for continuity.**\n');
    parts.push('> Any changes to this item may affect established story elements.\n\n');
  }

  // Connections placeholder
  parts.push(section('Appearances'));
  parts.push('*Scenes and events involving this object:*\n\n');
  parts.push('```dataview\n');
  parts.push(`LIST FROM ""\n`);
  parts.push(`WHERE contains(file.outlinks, this.file.link)\n`);
  parts.push('```\n\n');

  return parts.join('');
}

/**
 * Generate object notes from KB data
 */
export async function generateObjects(
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

  // Process each object
  for (const obj of kb.objects) {
    const name = obj.name;

    // Skip duplicates
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate object: ${name}`);
      }
      continue;
    }

    try {
      const filePath = generateNotePath(options.outputDir, OBJECTS_SUBDIR, name);
      const frontmatter = buildObjectFrontmatter(obj);
      const content = buildObjectContent(obj);
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

  result.summary = `Objects: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}
