import { eq, and, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import { wormholeRejections, type WormholeRejectionRow, type NewWormholeRejectionRow } from '../schema.js';

/**
 * Interface for a wormhole rejection
 */
export interface WormholeRejection {
  rejectionId: string;
  sourceId: string;
  targetId: string;
  sourceContentHash: string;
  targetContentHash: string;
  rejectedAt: string;
}

export interface CreateRejectionInput {
  sourceId: string;
  targetId: string;
  sourceContentHash: string;
  targetContentHash: string;
}

/**
 * Repository for Wormhole Rejection CRUD operations
 */
export class WormholeRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new rejection
   */
  async createRejection(data: CreateRejectionInput): Promise<WormholeRejection> {
    const rejectionId = nanoid();
    const now = new Date().toISOString();

    // Normalize pair order (smaller ID first) for consistent lookups
    const [normalizedSourceId, normalizedTargetId, normalizedSourceHash, normalizedTargetHash] =
      data.sourceId < data.targetId
        ? [data.sourceId, data.targetId, data.sourceContentHash, data.targetContentHash]
        : [data.targetId, data.sourceId, data.targetContentHash, data.sourceContentHash];

    const row: NewWormholeRejectionRow = {
      rejectionId,
      sourceId: normalizedSourceId,
      targetId: normalizedTargetId,
      sourceContentHash: normalizedSourceHash,
      targetContentHash: normalizedTargetHash,
      rejectedAt: now,
    };

    await this.db.insert(wormholeRejections).values(row);

    return this.rowToRejection({ ...row, rejectionId, rejectedAt: now } as WormholeRejectionRow);
  }

  /**
   * Check if a pair is rejected (considering content hashes)
   * Returns true if the pair was rejected AND the content hasn't changed
   */
  async isRejected(
    sourceId: string,
    targetId: string,
    sourceContentHash: string,
    targetContentHash: string
  ): Promise<boolean> {
    // Normalize pair order
    const [normalizedSourceId, normalizedTargetId, normalizedSourceHash, normalizedTargetHash] =
      sourceId < targetId
        ? [sourceId, targetId, sourceContentHash, targetContentHash]
        : [targetId, sourceId, targetContentHash, sourceContentHash];

    const result = await this.db
      .select()
      .from(wormholeRejections)
      .where(and(
        eq(wormholeRejections.sourceId, normalizedSourceId),
        eq(wormholeRejections.targetId, normalizedTargetId),
        eq(wormholeRejections.sourceContentHash, normalizedSourceHash),
        eq(wormholeRejections.targetContentHash, normalizedTargetHash)
      ))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Check if any rejection exists for a pair (regardless of content hash)
   */
  async hasAnyRejection(sourceId: string, targetId: string): Promise<boolean> {
    // Normalize pair order
    const [normalizedSourceId, normalizedTargetId] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];

    const result = await this.db
      .select()
      .from(wormholeRejections)
      .where(and(
        eq(wormholeRejections.sourceId, normalizedSourceId),
        eq(wormholeRejections.targetId, normalizedTargetId)
      ))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find all rejections
   */
  async findAll(): Promise<WormholeRejection[]> {
    const result = await this.db.select().from(wormholeRejections);
    return result.map(row => this.rowToRejection(row));
  }

  /**
   * Find rejections for a specific node
   */
  async findByNodeId(nodeId: string): Promise<WormholeRejection[]> {
    const result = await this.db
      .select()
      .from(wormholeRejections)
      .where(or(
        eq(wormholeRejections.sourceId, nodeId),
        eq(wormholeRejections.targetId, nodeId)
      ));

    return result.map(row => this.rowToRejection(row));
  }

  /**
   * Delete a rejection by ID
   */
  async delete(rejectionId: string): Promise<void> {
    await this.db.delete(wormholeRejections).where(eq(wormholeRejections.rejectionId, rejectionId));
  }

  /**
   * Delete rejections for a node pair
   */
  async deleteForPair(sourceId: string, targetId: string): Promise<void> {
    // Normalize pair order
    const [normalizedSourceId, normalizedTargetId] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];

    await this.db
      .delete(wormholeRejections)
      .where(and(
        eq(wormholeRejections.sourceId, normalizedSourceId),
        eq(wormholeRejections.targetId, normalizedTargetId)
      ));
  }

  /**
   * Delete all rejections for a node
   */
  async deleteForNode(nodeId: string): Promise<number> {
    const result = await this.db
      .delete(wormholeRejections)
      .where(or(
        eq(wormholeRejections.sourceId, nodeId),
        eq(wormholeRejections.targetId, nodeId)
      ));

    return result.changes;
  }

  /**
   * Clear all rejections
   */
  async clearAll(): Promise<number> {
    const result = await this.db.delete(wormholeRejections);
    return result.changes;
  }

  /**
   * Count rejections
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(wormholeRejections);

    return result[0]?.count ?? 0;
  }

  /**
   * Convert database row to WormholeRejection type
   */
  private rowToRejection(row: WormholeRejectionRow): WormholeRejection {
    return {
      rejectionId: row.rejectionId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      sourceContentHash: row.sourceContentHash,
      targetContentHash: row.targetContentHash,
      rejectedAt: row.rejectedAt,
    };
  }
}
