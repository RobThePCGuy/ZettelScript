import { eq, and, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import { versions, type VersionRow, type NewVersionRow } from '../schema.js';
import type { Version } from '../../../core/types/index.js';

/**
 * Repository for Version CRUD operations
 */
export class VersionRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new version
   */
  async create(data: Omit<Version, 'versionId' | 'createdAt'>): Promise<Version> {
    const versionId = nanoid();
    const now = new Date().toISOString();

    const row: NewVersionRow = {
      versionId,
      nodeId: data.nodeId,
      contentHash: data.contentHash,
      parentVersionId: data.parentVersionId ?? null,
      createdAt: now,
      summary: data.summary ?? null,
    };

    await this.db.insert(versions).values(row);

    return this.rowToVersion({ ...row, versionId, createdAt: now } as VersionRow);
  }

  /**
   * Find a version by ID
   */
  async findById(versionId: string): Promise<Version | null> {
    const result = await this.db
      .select()
      .from(versions)
      .where(eq(versions.versionId, versionId))
      .limit(1);

    return result[0] ? this.rowToVersion(result[0]) : null;
  }

  /**
   * Find all versions for a node
   */
  async findByNodeId(nodeId: string): Promise<Version[]> {
    const result = await this.db
      .select()
      .from(versions)
      .where(eq(versions.nodeId, nodeId))
      .orderBy(desc(versions.createdAt));

    return result.map(this.rowToVersion);
  }

  /**
   * Find the latest version for a node
   */
  async findLatest(nodeId: string): Promise<Version | null> {
    const result = await this.db
      .select()
      .from(versions)
      .where(eq(versions.nodeId, nodeId))
      .orderBy(desc(versions.createdAt))
      .limit(1);

    return result[0] ? this.rowToVersion(result[0]) : null;
  }

  /**
   * Find version by content hash
   */
  async findByContentHash(nodeId: string, contentHash: string): Promise<Version | null> {
    const result = await this.db
      .select()
      .from(versions)
      .where(and(eq(versions.nodeId, nodeId), eq(versions.contentHash, contentHash)))
      .limit(1);

    return result[0] ? this.rowToVersion(result[0]) : null;
  }

  /**
   * Get version chain (all ancestors)
   */
  async getVersionChain(versionId: string): Promise<Version[]> {
    const chain: Version[] = [];
    let currentId: string | null = versionId;

    while (currentId) {
      const version = await this.findById(currentId);
      if (!version) break;
      chain.push(version);
      currentId = version.parentVersionId ?? null;
    }

    return chain;
  }

  /**
   * Get child versions
   */
  async findChildren(versionId: string): Promise<Version[]> {
    const result = await this.db
      .select()
      .from(versions)
      .where(eq(versions.parentVersionId, versionId));

    return result.map(this.rowToVersion);
  }

  /**
   * Update a version (mainly for summary)
   */
  async update(versionId: string, data: Pick<Version, 'summary'>): Promise<Version> {
    await this.db
      .update(versions)
      .set({ summary: data.summary ?? null })
      .where(eq(versions.versionId, versionId));

    const updated = await this.findById(versionId);
    if (!updated) {
      throw new Error(`Version ${versionId} not found after update`);
    }
    return updated;
  }

  /**
   * Delete a version
   */
  async delete(versionId: string): Promise<void> {
    await this.db.delete(versions).where(eq(versions.versionId, versionId));
  }

  /**
   * Delete all versions for a node
   */
  async deleteForNode(nodeId: string): Promise<number> {
    const result = await this.db.delete(versions).where(eq(versions.nodeId, nodeId));

    return result.changes;
  }

  /**
   * Count versions
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(versions);

    return result[0]?.count ?? 0;
  }

  /**
   * Count versions per node
   */
  async countPerNode(): Promise<Map<string, number>> {
    const result = await this.db
      .select({
        nodeId: versions.nodeId,
        count: sql<number>`count(*)`,
      })
      .from(versions)
      .groupBy(versions.nodeId);

    return new Map(result.map((r) => [r.nodeId, r.count]));
  }

  /**
   * Convert database row to Version type
   */
  private rowToVersion(row: VersionRow): Version {
    return {
      versionId: row.versionId,
      nodeId: row.nodeId,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
      ...(row.parentVersionId != null && { parentVersionId: row.parentVersionId }),
      ...(row.summary != null && { summary: row.summary }),
    };
  }
}
