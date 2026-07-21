/**
 * Related Entities Section Builder
 * Generates markdown sections for cross-linking between entities
 */
import type { ComputedRelationship } from './types.js';
/**
 * Build the Related Entities section for a note
 */
export declare function buildRelatedEntitiesSection(relationships: ComputedRelationship[]): string;
/**
 * Check if Related Entities section should be included
 * Returns true by default unless explicitly disabled
 */
export declare function shouldIncludeRelatedEntities(includeRelatedEntities?: boolean): boolean;
//# sourceMappingURL=related-entities.d.ts.map