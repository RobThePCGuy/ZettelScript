import { sql } from 'drizzle-orm';
import { DrizzleDB } from '../connection.js';
import { unresolvedLinks, nodes } from '../schema.js';

/**
 * Data structure for ghost nodes in the visualization
 */
export interface GhostNodeData {
  /** The unresolved link text (e.g., "Missing Note") */
  targetText: string;
  /** All node IDs that reference this ghost */
  sourceIds: string[];
  /** Number of times this ghost is referenced */
  referenceCount: number;
  /** Timestamp of the earliest reference */
  firstSeen: string;
  /** Most recent reference timestamp (from unresolved_link or referencer's updatedAt) */
  mostRecentRef?: string | undefined;
}

/**
 * Repository for unresolved link operations, primarily for ghost node visualization
 */
export class UnresolvedLinkRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Get all unresolved links grouped by target text for ghost node visualization.
   * Returns ghost node data sorted by reference count (most referenced first).
   */
  async getGhostNodes(): Promise<GhostNodeData[]> {
    const result = await this.db
      .select({
        targetText: unresolvedLinks.targetText,
        sourceIds: sql<string>`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
        referenceCount: sql<number>`COUNT(*)`,
        firstSeen: sql<string>`MIN(${unresolvedLinks.createdAt})`,
      })
      .from(unresolvedLinks)
      .groupBy(unresolvedLinks.targetText)
      .orderBy(sql`COUNT(*) DESC`);

    return result
      .filter(row => row.targetText && row.targetText.trim() !== '')
      .map(row => ({
        targetText: row.targetText,
        sourceIds: row.sourceIds ? row.sourceIds.split(',') : [],
        referenceCount: row.referenceCount,
        firstSeen: row.firstSeen,
      }));
  }

  /**
   * Get ghost nodes with a minimum reference count threshold.
   * Useful for filtering out rarely-referenced unresolved links.
   */
  async getGhostNodesWithThreshold(minReferenceCount: number): Promise<GhostNodeData[]> {
    const result = await this.db
      .select({
        targetText: unresolvedLinks.targetText,
        sourceIds: sql<string>`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
        referenceCount: sql<number>`COUNT(*)`,
        firstSeen: sql<string>`MIN(${unresolvedLinks.createdAt})`,
      })
      .from(unresolvedLinks)
      .groupBy(unresolvedLinks.targetText)
      .having(sql`COUNT(*) >= ${minReferenceCount}`)
      .orderBy(sql`COUNT(*) DESC`);

    return result
      .filter(row => row.targetText && row.targetText.trim() !== '')
      .map(row => ({
        targetText: row.targetText,
        sourceIds: row.sourceIds ? row.sourceIds.split(',') : [],
        referenceCount: row.referenceCount,
        firstSeen: row.firstSeen,
      }));
  }

  /**
   * Count total number of unique unresolved link targets (ghost nodes)
   */
  async countGhostNodes(): Promise<number> {
    const result = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${unresolvedLinks.targetText})`,
      })
      .from(unresolvedLinks);

    return result[0]?.count ?? 0;
  }

  /**
   * Count total number of unresolved link references
   */
  async countReferences(): Promise<number> {
    const result = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(unresolvedLinks);

    return result[0]?.count ?? 0;
  }

  /**
   * Get ghost nodes with most recent reference time included.
   * The most recent reference time is the latest of:
   * - The unresolved_link createdAt timestamp
   * - The referencing node's updatedAt timestamp
   *
   * Returns ghost node data sorted by reference count (most referenced first).
   */
  async getGhostNodesWithRecency(): Promise<GhostNodeData[]> {
    // Use a subquery to get the most recent reference time by joining with nodes
    const result = await this.db
      .select({
        targetText: unresolvedLinks.targetText,
        sourceIds: sql<string>`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
        referenceCount: sql<number>`COUNT(*)`,
        firstSeen: sql<string>`MIN(${unresolvedLinks.createdAt})`,
        mostRecentLinkCreated: sql<string>`MAX(${unresolvedLinks.createdAt})`,
      })
      .from(unresolvedLinks)
      .groupBy(unresolvedLinks.targetText)
      .orderBy(sql`COUNT(*) DESC`);

    // For each ghost, get the most recent referencer's updatedAt
    const ghostsWithRecency = await Promise.all(
      result
        .filter(row => row.targetText && row.targetText.trim() !== '')
        .map(async (row) => {
          const sourceIds = row.sourceIds ? row.sourceIds.split(',') : [];

          // Get the most recent updatedAt from referencing nodes
          let mostRecentReferencerUpdate: string | null = null;
          if (sourceIds.length > 0) {
            const referencerResult = await this.db
              .select({
                maxUpdatedAt: sql<string>`MAX(${nodes.updatedAt})`,
              })
              .from(nodes)
              .where(sql`${nodes.nodeId} IN (${sql.join(sourceIds.map(id => sql`${id}`), sql`, `)})`);

            mostRecentReferencerUpdate = referencerResult[0]?.maxUpdatedAt ?? null;
          }

          // Use the more recent of link creation or referencer update
          const mostRecentRef = [
            row.mostRecentLinkCreated,
            mostRecentReferencerUpdate,
          ]
            .filter((t): t is string => t !== null)
            .sort()
            .reverse()[0];

          return {
            targetText: row.targetText,
            sourceIds,
            referenceCount: row.referenceCount,
            firstSeen: row.firstSeen,
            mostRecentRef,
          };
        })
    );

    return ghostsWithRecency;
  }

  /**
   * Delete unresolved links by target text
   */
  async deleteByTargetText(targetText: string): Promise<number> {
    const result = await this.db
      .delete(unresolvedLinks)
      .where(sql`${unresolvedLinks.targetText} COLLATE NOCASE = ${targetText}`);

    return result.changes;
  }
}
