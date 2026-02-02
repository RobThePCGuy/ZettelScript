/**
 * Relationship Engine
 * Computes relationships between entities from explicit data, field inference, and co-occurrence
 *
 * Features:
 * - Explicit relationships from kb.relationships[]
 * - Inferred relationships from entity fields (equipment, holder, etc.)
 * - Event-character inference (characters present in event chapter → participated)
 * - Event-location inference (locations present in event chapter → occurred_at)
 * - Object chapter derivation from existing relationship chapters
 * - Co-occurrence relationships from shared chapters
 */

import type {
  KBData,
  ComputedRelationship,
  RelationshipKind,
  EntityType,
  KBTimelineEvent,
} from './types.js';

const DEFAULT_CO_OCCURRENCE_THRESHOLD = 2;

interface EntityInfo {
  id: string;
  name: string;
  type: EntityType;
  chapters: number[];
  /** Wikilink target (may differ from name for events) */
  linkTarget: string;
  /** Optional display text for wikilink */
  linkDisplay?: string;
}

/**
 * Normalize a name for robust matching (handles whitespace, underscores, case)
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .trim();
}

/**
 * Generate a filename for an event (e.g., "Event-01-001")
 */
function getEventFilename(event: KBTimelineEvent): string {
  const chapterStr = event.chapter.toString().padStart(2, '0');
  const eventNum = event.id.replace(/[^0-9]/g, '').padStart(3, '0');
  return `Event-${chapterStr}-${eventNum}`;
}

/**
 * Get a human-readable label for a relationship kind
 * @param kind The relationship kind
 * @param perspective 'out' for source→target, 'in' for target→source (inverse)
 */
export function labelFor(kind: RelationshipKind, perspective: 'out' | 'in'): string {
  if (kind === 'co_occurrence') return 'co-occurrence';

  if (perspective === 'out') {
    switch (kind) {
      case 'occurred_at':
        return 'occurred at';
      case 'formerly_held':
        return 'formerly held';
      default:
        return kind.replace(/_/g, ' ');
    }
  }

  // Incoming/inverse labels (readable from the other entity's perspective)
  switch (kind) {
    case 'visits':
      return 'visited by';
    case 'resides':
      return 'resided by';
    case 'owns':
      return 'owned by';
    case 'holds':
      return 'held by';
    case 'formerly_held':
      return 'formerly held by';
    case 'participated':
      return 'participant';
    case 'witnessed':
      return 'witness';
    case 'contains':
      return 'contained in';
    case 'occurred_at':
      return 'site of';
    default:
      return kind.replace(/_/g, ' ');
  }
}

/**
 * RelationshipEngine computes relationships between entities from multiple sources:
 * 1. Explicit relationships from kb.relationships[]
 * 2. Inferred relationships from entity fields (equipment, holder, etc.)
 * 3. Co-occurrence relationships from shared chapters
 */
export class RelationshipEngine {
  private kb: KBData;
  private entityIndex: Map<string, EntityInfo>;
  private nameToId: Map<string, string>;
  private coOccurrenceThreshold: number;

  constructor(kb: KBData, coOccurrenceThreshold?: number) {
    this.kb = kb;
    this.coOccurrenceThreshold = coOccurrenceThreshold ?? DEFAULT_CO_OCCURRENCE_THRESHOLD;
    this.entityIndex = new Map();
    this.nameToId = new Map();
    this.buildEntityIndex();
  }

  /**
   * Build an index of all entities for quick lookup
   */
  private buildEntityIndex(): void {
    // Index characters
    for (const char of this.kb.characters) {
      const info: EntityInfo = {
        id: char.id,
        name: char.canonical_name,
        type: 'character',
        chapters: char.chapters_present || [],
        linkTarget: char.canonical_name,
      };
      this.entityIndex.set(char.id, info);
      this.nameToId.set(normalizeName(char.canonical_name), char.id);
      // Index aliases too
      if (char.aliases) {
        for (const alias of char.aliases) {
          this.nameToId.set(normalizeName(alias), char.id);
        }
      }
    }

    // Index name normalization table if present
    if (this.kb.name_normalization) {
      for (const nn of this.kb.name_normalization) {
        const canonId = this.nameToId.get(normalizeName(nn.canonical));
        if (!canonId) continue;
        for (const variant of nn.variants || []) {
          this.nameToId.set(normalizeName(variant), canonId);
        }
      }
    }

    // Index locations
    for (const loc of this.kb.locations) {
      const info: EntityInfo = {
        id: loc.id,
        name: loc.name,
        type: 'location',
        chapters: loc.chapters_seen || [],
        linkTarget: loc.name,
      };
      this.entityIndex.set(loc.id, info);
      this.nameToId.set(normalizeName(loc.name), loc.id);
    }

    // Index objects
    for (const obj of this.kb.objects) {
      const info: EntityInfo = {
        id: obj.id,
        name: obj.name,
        type: 'object',
        chapters: [], // Objects don't have chapter info directly - derived later
        linkTarget: obj.name,
      };
      this.entityIndex.set(obj.id, info);
      this.nameToId.set(normalizeName(obj.name), obj.id);
    }

    // Index timeline events with proper link targets
    for (const event of this.kb.timeline) {
      const info: EntityInfo = {
        id: event.id,
        name: event.description,
        type: 'event',
        chapters: [event.chapter],
        linkTarget: getEventFilename(event),
        linkDisplay: event.description,
      };
      this.entityIndex.set(event.id, info);
    }
  }

  /**
   * Resolve a name or ID to an entity info
   */
  private resolveEntity(nameOrId: string): EntityInfo | undefined {
    // Try direct ID lookup first
    if (this.entityIndex.has(nameOrId)) {
      return this.entityIndex.get(nameOrId);
    }
    // Try normalized name lookup
    const id = this.nameToId.get(normalizeName(nameOrId));
    if (id) {
      return this.entityIndex.get(id);
    }
    return undefined;
  }

  /**
   * Get all relationships for a given entity
   */
  getRelationshipsFor(entityId: string): ComputedRelationship[] {
    const relationships: ComputedRelationship[] = [];
    const seen = new Set<string>();

    // 1. Extract explicit relationships
    const explicit = this.getExplicitRelationships(entityId);
    for (const rel of explicit) {
      const key = `${rel.targetId}:${rel.relationshipType}`;
      if (!seen.has(key)) {
        seen.add(key);
        relationships.push(rel);
      }
    }

    // 2. Infer relationships from entity fields
    const inferred = this.getInferredRelationships(entityId);
    for (const rel of inferred) {
      const key = `${rel.targetId}:${rel.relationshipType}`;
      if (!seen.has(key)) {
        seen.add(key);
        relationships.push(rel);
      }
    }

    // 3. Compute co-occurrence relationships
    const coOccurrence = this.getCoOccurrenceRelationships(entityId);
    for (const rel of coOccurrence) {
      // Only add if we don't already have a more specific relationship
      const hasExisting = relationships.some(r => r.targetId === rel.targetId);
      if (!hasExisting) {
        relationships.push(rel);
      }
    }

    return relationships;
  }

  /**
   * Extract explicit relationships from kb.relationships[]
   */
  private getExplicitRelationships(entityId: string): ComputedRelationship[] {
    const relationships: ComputedRelationship[] = [];

    if (!this.kb.relationships) {
      return relationships;
    }

    for (const rel of this.kb.relationships) {
      let targetId: string | null = null;
      let type = rel.type;

      if (rel.sourceId === entityId) {
        targetId = rel.targetId;
      } else if (rel.targetId === entityId) {
        // Reverse the relationship
        targetId = rel.sourceId;
        type = this.reverseRelationshipType(rel.type);
      }

      if (targetId) {
        const targetInfo = this.resolveEntity(targetId);
        if (targetInfo) {
          relationships.push({
            targetId: targetInfo.id,
            targetName: targetInfo.name,
            targetType: targetInfo.type,
            relationshipType: type,
            description: rel.description,
            chapters: rel.chapters,
            source: 'explicit',
            linkTarget: targetInfo.linkTarget,
            linkDisplay: targetInfo.linkDisplay,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Reverse a relationship type for bidirectional lookup
   */
  private reverseRelationshipType(type: RelationshipKind): RelationshipKind {
    // Most relationships are symmetric or have obvious inverses
    switch (type) {
      case 'owns':
      case 'holds':
        return 'holds'; // object is held by
      case 'formerly_held':
        return 'formerly_held';
      case 'mentor':
        return 'mentor'; // mentee relationship
      case 'contains':
        return 'contains'; // contained by
      case 'occurred_at':
        return 'occurred_at';
      default:
        return type; // symmetric relationships
    }
  }

  /**
   * Infer relationships from entity fields
   */
  private getInferredRelationships(entityId: string): ComputedRelationship[] {
    const relationships: ComputedRelationship[] = [];
    const entity = this.entityIndex.get(entityId);

    if (!entity) {
      return relationships;
    }

    if (entity.type === 'character') {
      // Character → equipment (owns)
      const char = this.kb.characters.find(c => c.id === entityId);
      if (char?.equipment) {
        for (const equipName of char.equipment) {
          const objInfo = this.resolveEntity(equipName);
          if (objInfo) {
            relationships.push({
              targetId: objInfo.id,
              targetName: objInfo.name,
              targetType: 'object',
              relationshipType: 'owns',
              source: 'inferred',
              linkTarget: objInfo.linkTarget,
              linkDisplay: objInfo.linkDisplay,
            });
          }
        }
      }

      // Check all objects to see if any have this character as holder
      for (const obj of this.kb.objects) {
        if (obj.holder) {
          const holderInfo = this.resolveEntity(obj.holder);
          if (holderInfo?.id === entityId) {
            const objEntityInfo = this.entityIndex.get(obj.id);
            relationships.push({
              targetId: obj.id,
              targetName: obj.name,
              targetType: 'object',
              relationshipType: 'owns',
              source: 'inferred',
              linkTarget: objEntityInfo?.linkTarget || obj.name,
              linkDisplay: objEntityInfo?.linkDisplay,
            });
          }
        }
      }

      // Character → events (participated) based on shared chapters
      for (const event of this.kb.timeline) {
        if (char?.chapters_present?.includes(event.chapter)) {
          const eventInfo = this.entityIndex.get(event.id);
          if (eventInfo) {
            relationships.push({
              targetId: event.id,
              targetName: event.description,
              targetType: 'event',
              relationshipType: 'participated',
              chapters: [event.chapter],
              source: 'inferred',
              linkTarget: eventInfo.linkTarget,
              linkDisplay: eventInfo.linkDisplay,
            });
          }
        }
      }
    }

    if (entity.type === 'object') {
      // Object → holder (holds)
      const obj = this.kb.objects.find(o => o.id === entityId);
      if (obj?.holder) {
        const charInfo = this.resolveEntity(obj.holder);
        if (charInfo) {
          relationships.push({
            targetId: charInfo.id,
            targetName: charInfo.name,
            targetType: 'character',
            relationshipType: 'holds',
            source: 'inferred',
            linkTarget: charInfo.linkTarget,
            linkDisplay: charInfo.linkDisplay,
          });
        }
      }
      // Object → previous holders (formerly_held)
      if (obj?.holders) {
        for (const holderName of obj.holders) {
          // Skip current holder
          if (obj.holder && normalizeName(holderName) === normalizeName(obj.holder)) continue;
          const charInfo = this.resolveEntity(holderName);
          if (charInfo) {
            relationships.push({
              targetId: charInfo.id,
              targetName: charInfo.name,
              targetType: 'character',
              relationshipType: 'formerly_held',
              source: 'inferred',
              linkTarget: charInfo.linkTarget,
              linkDisplay: charInfo.linkDisplay,
            });
          }
        }
      }
    }

    if (entity.type === 'event') {
      // Event → locations (occurred_at) based on shared chapters
      const event = this.kb.timeline.find(e => e.id === entityId);
      if (event) {
        for (const loc of this.kb.locations) {
          if (loc.chapters_seen?.includes(event.chapter)) {
            const locInfo = this.entityIndex.get(loc.id);
            if (locInfo) {
              relationships.push({
                targetId: loc.id,
                targetName: loc.name,
                targetType: 'location',
                relationshipType: 'occurred_at',
                chapters: [event.chapter],
                source: 'inferred',
                linkTarget: locInfo.linkTarget,
                linkDisplay: locInfo.linkDisplay,
              });
            }
          }
        }

        // Event → characters (participated) - inverse view
        for (const char of this.kb.characters) {
          if (char.chapters_present?.includes(event.chapter)) {
            const charInfo = this.entityIndex.get(char.id);
            if (charInfo) {
              relationships.push({
                targetId: char.id,
                targetName: char.canonical_name,
                targetType: 'character',
                relationshipType: 'participated',
                chapters: [event.chapter],
                source: 'inferred',
                linkTarget: charInfo.linkTarget,
                linkDisplay: charInfo.linkDisplay,
              });
            }
          }
        }
      }
    }

    if (entity.type === 'location') {
      // Location → events (occurred_at inverse - site of)
      const loc = this.kb.locations.find(l => l.id === entityId);
      if (loc?.chapters_seen) {
        for (const event of this.kb.timeline) {
          if (loc.chapters_seen.includes(event.chapter)) {
            const eventInfo = this.entityIndex.get(event.id);
            if (eventInfo) {
              relationships.push({
                targetId: event.id,
                targetName: event.description,
                targetType: 'event',
                relationshipType: 'occurred_at',
                chapters: [event.chapter],
                source: 'inferred',
                linkTarget: eventInfo.linkTarget,
                linkDisplay: eventInfo.linkDisplay,
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Compute co-occurrence relationships based on shared chapters
   */
  private getCoOccurrenceRelationships(entityId: string): ComputedRelationship[] {
    const relationships: ComputedRelationship[] = [];
    const entity = this.entityIndex.get(entityId);

    if (!entity || entity.chapters.length === 0) {
      return relationships;
    }

    const entityChapters = new Set(entity.chapters);

    // Check co-occurrence with all other entities
    for (const [otherId, otherInfo] of this.entityIndex) {
      if (otherId === entityId) continue;

      // Use derived chapters for objects if they have none directly
      let otherChapters = otherInfo.chapters;
      if (otherInfo.type === 'object' && otherChapters.length === 0) {
        otherChapters = this.deriveObjectChapters(otherId);
      }

      if (otherChapters.length === 0) continue;

      // Calculate shared chapters
      const sharedChapters = otherChapters.filter(ch => entityChapters.has(ch));

      if (sharedChapters.length >= this.coOccurrenceThreshold) {
        relationships.push({
          targetId: otherInfo.id,
          targetName: otherInfo.name,
          targetType: otherInfo.type,
          relationshipType: 'co_occurrence',
          chapters: sharedChapters.sort((a, b) => a - b),
          source: 'co_occurrence',
          linkTarget: otherInfo.linkTarget,
          linkDisplay: otherInfo.linkDisplay,
        });
      }
    }

    return relationships;
  }

  /**
   * Derive chapter presence for an object from holder relationships
   */
  private deriveObjectChapters(objectId: string): number[] {
    const chapters = new Set<number>();
    const obj = this.kb.objects.find(o => o.id === objectId);
    if (!obj) return [];

    // Get chapters from current holder
    if (obj.holder) {
      const holderInfo = this.resolveEntity(obj.holder);
      if (holderInfo) {
        for (const ch of holderInfo.chapters) {
          chapters.add(ch);
        }
      }
    }

    // Get chapters from previous holders
    if (obj.holders) {
      for (const holderName of obj.holders) {
        const holderInfo = this.resolveEntity(holderName);
        if (holderInfo) {
          for (const ch of holderInfo.chapters) {
            chapters.add(ch);
          }
        }
      }
    }

    return Array.from(chapters).sort((a, b) => a - b);
  }

  /**
   * Group relationships by entity type
   */
  groupByEntityType(
    relationships: ComputedRelationship[]
  ): Map<EntityType, ComputedRelationship[]> {
    const grouped = new Map<EntityType, ComputedRelationship[]>();

    for (const rel of relationships) {
      const existing = grouped.get(rel.targetType) || [];
      existing.push(rel);
      grouped.set(rel.targetType, existing);
    }

    return grouped;
  }

  /**
   * Group relationships by relationship kind
   */
  groupByType(
    relationships: ComputedRelationship[]
  ): Map<RelationshipKind, ComputedRelationship[]> {
    const grouped = new Map<RelationshipKind, ComputedRelationship[]>();

    for (const rel of relationships) {
      const existing = grouped.get(rel.relationshipType) || [];
      existing.push(rel);
      grouped.set(rel.relationshipType, existing);
    }

    return grouped;
  }
}
