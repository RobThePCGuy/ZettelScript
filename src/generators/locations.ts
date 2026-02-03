/**
 * Location Generator
 * Creates location notes from KB data with realm classification
 */

import type { GeneratorOptions, GeneratorResult, KBLocation, KBData, RealmType } from './types.js';
import {
  parseKBJson,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  section,
  formatChapters,
  formatList,
  kvPair,
} from './utils.js';
import { classifyRealm } from './types.js';
import { RelationshipEngine } from './relationships.js';
import { buildRelatedEntitiesSection, shouldIncludeRelatedEntities } from './related-entities.js';

const LOCATIONS_SUBDIR = 'Locations';

/**
 * Build frontmatter for a location note
 */
function buildLocationFrontmatter(loc: KBLocation): Record<string, unknown> {
  const realm = classifyRealm(loc);

  return {
    id: loc.id,
    type: 'location',
    title: loc.name,
    location_type: loc.type,
    realm: realm,
    tags: buildTags(loc, realm),
    first_appearance: loc.first_appearance,
    chapters: formatList(loc.chapters_seen?.map(String)),
  };
}

/**
 * Build tags based on location properties
 */
function buildTags(loc: KBLocation, realm: RealmType): string[] {
  const tags: string[] = ['location'];

  // Realm-based tags
  switch (realm) {
    case 'dimensional':
      tags.push('dimensional');
      break;
    case 'real_world':
      tags.push('real-world');
      break;
    case 'liminal':
      tags.push('liminal');
      break;
  }

  // Type-based tags
  const locType = loc.type.toLowerCase().replace(/[_\s]+/g, '-');
  if (locType && !tags.includes(locType)) {
    tags.push(locType);
  }

  return tags;
}

/**
 * Build the content body for a location note
 */
function buildLocationContent(
  loc: KBLocation,
  relationshipEngine?: RelationshipEngine,
  includeRelated?: boolean
): string {
  const parts: string[] = [];
  const realm = classifyRealm(loc);

  // Title
  parts.push(`# ${loc.name}\n\n`);

  // Overview section
  parts.push(section('Overview'));
  const overview: string[] = [];
  overview.push(kvPair('Type', loc.type.replace(/_/g, ' ')));
  overview.push(kvPair('Realm', formatRealmName(realm)));
  if (loc.first_appearance) {
    overview.push(kvPair('First Appearance', `Chapter ${loc.first_appearance}`));
  }
  if (loc.chapters_seen) {
    overview.push(kvPair('Chapters', formatChapters(loc.chapters_seen)));
  }
  parts.push(overview.filter(Boolean).join('\n') + '\n\n');

  // Description
  if (loc.description) {
    parts.push(section('Description'));
    parts.push(loc.description + '\n\n');
  }

  // Features
  if (loc.features && loc.features.length > 0) {
    parts.push(section('Features'));
    parts.push(loc.features.map((f) => `- ${f}`).join('\n') + '\n\n');
  }

  // Related Entities
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(loc.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }

  // Realm-specific sections
  if (realm === 'dimensional') {
    parts.push(section('Dimensional Properties'));
    parts.push('*This location exists in a dimensional space.*\n\n');
    parts.push('- [ ] Portal access documented\n');
    parts.push('- [ ] Time dilation effects noted\n');
    parts.push('- [ ] Environmental hazards catalogued\n\n');
  }

  // Connections placeholder
  parts.push(section('Connections'));
  parts.push('*Characters and events associated with this location:*\n\n');
  parts.push('```dataview\n');
  parts.push(`LIST FROM ""\n`);
  parts.push(`WHERE contains(locations, "${loc.name}")\n`);
  parts.push('```\n\n');

  return parts.join('');
}

/**
 * Format realm name for display
 */
function formatRealmName(realm: RealmType): string {
  switch (realm) {
    case 'real_world':
      return 'Real World';
    case 'dimensional':
      return 'Dimensional';
    case 'liminal':
      return 'Liminal Space';
    case 'unknown':
      return 'Unknown';
  }
}

/**
 * Generate location notes from KB data
 */
export async function generateLocations(options: GeneratorOptions): Promise<GeneratorResult> {
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

  // Process each location
  for (const loc of kb.locations) {
    const name = loc.name;

    // Skip duplicates
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate location: ${name}`);
      }
      continue;
    }

    try {
      const filePath = generateNotePath(options.outputDir, LOCATIONS_SUBDIR, name);
      const frontmatter = buildLocationFrontmatter(loc);
      const content = buildLocationContent(loc, relationshipEngine, includeRelated);
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

  result.summary = `Locations: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}
