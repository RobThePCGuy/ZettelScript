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
import type { KBData, ComputedRelationship, RelationshipKind, EntityType } from './types.js';
/**
 * Get a human-readable label for a relationship kind
 * @param kind The relationship kind
 * @param perspective 'out' for source→target, 'in' for target→source (inverse)
 */
export declare function labelFor(kind: RelationshipKind, perspective: 'out' | 'in'): string;
/**
 * RelationshipEngine computes relationships between entities from multiple sources:
 * 1. Explicit relationships from kb.relationships[]
 * 2. Inferred relationships from entity fields (equipment, holder, etc.)
 * 3. Co-occurrence relationships from shared chapters
 */
export declare class RelationshipEngine {
    private kb;
    private entityIndex;
    private nameToId;
    private coOccurrenceThreshold;
    constructor(kb: KBData, coOccurrenceThreshold?: number);
    /**
     * Build an index of all entities for quick lookup
     */
    private buildEntityIndex;
    /**
     * Resolve a name or ID to an entity info
     */
    private resolveEntity;
    /**
     * Get all relationships for a given entity
     */
    getRelationshipsFor(entityId: string): ComputedRelationship[];
    /**
     * Extract explicit relationships from kb.relationships[]
     */
    private getExplicitRelationships;
    /**
     * Reverse a relationship type for bidirectional lookup
     */
    private reverseRelationshipType;
    /**
     * Infer relationships from entity fields
     */
    private getInferredRelationships;
    /**
     * Compute co-occurrence relationships based on shared chapters
     */
    private getCoOccurrenceRelationships;
    /**
     * Derive chapter presence for an object from holder relationships
     */
    private deriveObjectChapters;
    /**
     * Group relationships by entity type
     */
    groupByEntityType(relationships: ComputedRelationship[]): Map<EntityType, ComputedRelationship[]>;
    /**
     * Group relationships by relationship kind
     */
    groupByType(relationships: ComputedRelationship[]): Map<RelationshipKind, ComputedRelationship[]>;
}
//# sourceMappingURL=relationships.d.ts.map