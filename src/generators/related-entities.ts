/**
 * Related Entities Section Builder
 * Generates markdown sections for cross-linking between entities
 */

import type { ComputedRelationship, EntityType, RelationshipKind } from './types.js';
import { section, wikilink } from './utils.js';

/**
 * Format chapter numbers for display
 */
function formatChapterList(chapters: number[] | undefined): string {
  if (!chapters || chapters.length === 0) {
    return '';
  }

  // Detect ranges for cleaner display
  const ranges: string[] = [];
  let rangeStart = chapters[0]!;
  let rangeEnd = chapters[0]!;

  for (let i = 1; i <= chapters.length; i++) {
    if (i < chapters.length && chapters[i] === rangeEnd + 1) {
      rangeEnd = chapters[i]!;
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(String(rangeStart));
      } else if (rangeEnd === rangeStart + 1) {
        ranges.push(`${rangeStart}, ${rangeEnd}`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < chapters.length) {
        rangeStart = chapters[i]!;
        rangeEnd = chapters[i]!;
      }
    }
  }

  return `Ch. ${ranges.join(', ')}`;
}

/**
 * Format a relationship type for display
 */
function formatRelationshipType(type: RelationshipKind): string {
  switch (type) {
    case 'ally':
      return 'ally';
    case 'enemy':
      return 'enemy';
    case 'family':
      return 'family';
    case 'mentor':
      return 'mentor';
    case 'rival':
      return 'rival';
    case 'visits':
      return 'visits';
    case 'resides':
      return 'residence';
    case 'owns':
      return 'owns';
    case 'holds':
      return 'held by';
    case 'formerly_held':
      return 'formerly held by';
    case 'participated':
      return 'participated';
    case 'witnessed':
      return 'witnessed';
    case 'contains':
      return 'contains';
    case 'occurred_at':
      return 'occurred at';
    case 'co_occurrence':
      return 'appears with';
    case 'associated':
      return 'associated';
    default:
      return type;
  }
}

/**
 * Get the display name for an entity type section
 */
function getEntityTypeSectionName(type: EntityType): string {
  switch (type) {
    case 'character':
      return 'Characters';
    case 'location':
      return 'Locations';
    case 'object':
      return 'Objects';
    case 'event':
      return 'Events';
    default:
      return 'Other';
  }
}

/**
 * Build a single relationship line
 */
function buildRelationshipLine(rel: ComputedRelationship): string {
  // Use linkTarget and linkDisplay if available (e.g., for events)
  const link = rel.linkDisplay
    ? wikilink(rel.linkTarget || rel.targetName, rel.linkDisplay)
    : wikilink(rel.linkTarget || rel.targetName);
  const relType = formatRelationshipType(rel.relationshipType);
  const chapters = formatChapterList(rel.chapters);

  let line = `- ${link}`;

  // Add relationship type if it's not just co_occurrence
  if (rel.relationshipType !== 'co_occurrence') {
    line += ` - ${relType}`;
  }

  // Add chapter info if available
  if (chapters) {
    line += ` (${chapters})`;
  }

  return line;
}

/**
 * Build the Related Entities section for a note
 */
export function buildRelatedEntitiesSection(
  relationships: ComputedRelationship[]
): string {
  if (relationships.length === 0) {
    return '';
  }

  const parts: string[] = [];
  parts.push(section('Related Entities'));

  // Group by entity type
  const grouped = new Map<EntityType, ComputedRelationship[]>();
  for (const rel of relationships) {
    const existing = grouped.get(rel.targetType) || [];
    existing.push(rel);
    grouped.set(rel.targetType, existing);
  }

  // Order: characters, locations, objects, events
  const typeOrder: EntityType[] = ['character', 'location', 'object', 'event'];

  for (const entityType of typeOrder) {
    const rels = grouped.get(entityType);
    if (!rels || rels.length === 0) continue;

    // Sort by relationship type (explicit/inferred first, then co_occurrence)
    // Then by name alphabetically
    rels.sort((a, b) => {
      // Prioritize explicit and inferred over co_occurrence
      const sourceOrder = { explicit: 0, inferred: 1, co_occurrence: 2 };
      const sourceCompare = sourceOrder[a.source] - sourceOrder[b.source];
      if (sourceCompare !== 0) return sourceCompare;

      // Then alphabetically by name
      return a.targetName.localeCompare(b.targetName);
    });

    parts.push(section(getEntityTypeSectionName(entityType), 3));
    for (const rel of rels) {
      parts.push(buildRelationshipLine(rel) + '\n');
    }
    parts.push('\n');
  }

  return parts.join('');
}

/**
 * Check if Related Entities section should be included
 * Returns true by default unless explicitly disabled
 */
export function shouldIncludeRelatedEntities(
  includeRelatedEntities?: boolean
): boolean {
  // Default to true if not specified
  return includeRelatedEntities !== false;
}
