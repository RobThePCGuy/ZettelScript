import { eq, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';
import { DrizzleDB } from '../connection.js';
import { chunks, type ChunkRow, type NewChunkRow } from '../schema.js';
import type { Chunk } from '../../../core/types/index.js';

/**
 * Repository for Chunk CRUD operations including FTS5 queries
 */
export class ChunkRepository {
  constructor(
    private db: DrizzleDB,
    private sqlite: Database.Database
  ) {}

  /**
   * Create a new chunk
   */
  async create(data: Omit<Chunk, 'chunkId'>): Promise<Chunk> {
    const chunkId = nanoid();

    const row: NewChunkRow = {
      chunkId,
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null,
    };

    await this.db.insert(chunks).values(row);

    return this.rowToChunk({ ...row, chunkId } as ChunkRow);
  }

  /**
   * Create multiple chunks
   */
  async createMany(dataArray: Array<Omit<Chunk, 'chunkId'>>): Promise<Chunk[]> {
    if (dataArray.length === 0) return [];

    const rows: NewChunkRow[] = dataArray.map(data => ({
      chunkId: nanoid(),
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null,
    }));

    await this.db.insert(chunks).values(rows);

    return rows.map(row => this.rowToChunk(row as ChunkRow));
  }

  /**
   * Find a chunk by ID
   */
  async findById(chunkId: string): Promise<Chunk | null> {
    const result = await this.db
      .select()
      .from(chunks)
      .where(eq(chunks.chunkId, chunkId))
      .limit(1);

    return result[0] ? this.rowToChunk(result[0]) : null;
  }

  /**
   * Find all chunks for a node
   */
  async findByNodeId(nodeId: string): Promise<Chunk[]> {
    const result = await this.db
      .select()
      .from(chunks)
      .where(eq(chunks.nodeId, nodeId))
      .orderBy(chunks.offsetStart);

    return result.map(this.rowToChunk);
  }

  /**
   * Find chunks by version
   */
  async findByVersionId(versionId: string): Promise<Chunk[]> {
    const result = await this.db
      .select()
      .from(chunks)
      .where(eq(chunks.versionId, versionId))
      .orderBy(chunks.offsetStart);

    return result.map(this.rowToChunk);
  }

  /**
   * Find chunks by IDs
   */
  async findByIds(chunkIds: string[]): Promise<Chunk[]> {
    if (chunkIds.length === 0) return [];

    const result = await this.db
      .select()
      .from(chunks)
      .where(inArray(chunks.chunkId, chunkIds));

    return result.map(this.rowToChunk);
  }

  /**
   * Full-text search using FTS5
   */
  searchFullText(
    query: string,
    limit: number = 20
  ): Array<{ chunkId: string; nodeId: string; text: string; rank: number }> {
    // Escape special FTS5 characters
    const escapedQuery = query
      .replace(/['"]/g, '')
      .replace(/\*/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join(' OR ');

    if (!escapedQuery) return [];

    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        rank
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    return stmt.all(escapedQuery, limit) as Array<{
      chunkId: string;
      nodeId: string;
      text: string;
      rank: number;
    }>;
  }

  /**
   * Full-text search with BM25 ranking
   */
  searchBM25(
    query: string,
    limit: number = 20
  ): Array<{ chunkId: string; nodeId: string; text: string; score: number }> {
    const escapedQuery = query
      .replace(/['"]/g, '')
      .replace(/\*/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join(' OR ');

    if (!escapedQuery) return [];

    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        bm25(chunks_fts) as score
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY bm25(chunks_fts)
      LIMIT ?
    `);

    return stmt.all(escapedQuery, limit) as Array<{
      chunkId: string;
      nodeId: string;
      text: string;
      score: number;
    }>;
  }

  /**
   * Update a chunk
   */
  async update(chunkId: string, data: Partial<Omit<Chunk, 'chunkId'>>): Promise<Chunk> {
    const updateData: Partial<ChunkRow> = {};

    if (data.nodeId !== undefined) updateData.nodeId = data.nodeId;
    if (data.text !== undefined) updateData.text = data.text;
    if (data.offsetStart !== undefined) updateData.offsetStart = data.offsetStart;
    if (data.offsetEnd !== undefined) updateData.offsetEnd = data.offsetEnd;
    if (data.versionId !== undefined) updateData.versionId = data.versionId;
    if (data.tokenCount !== undefined) updateData.tokenCount = data.tokenCount;

    await this.db
      .update(chunks)
      .set(updateData)
      .where(eq(chunks.chunkId, chunkId));

    const updated = await this.findById(chunkId);
    if (!updated) {
      throw new Error(`Chunk ${chunkId} not found after update`);
    }
    return updated;
  }

  /**
   * Delete a chunk
   */
  async delete(chunkId: string): Promise<void> {
    await this.db.delete(chunks).where(eq(chunks.chunkId, chunkId));
  }

  /**
   * Delete all chunks for a node
   */
  async deleteForNode(nodeId: string): Promise<number> {
    const result = await this.db
      .delete(chunks)
      .where(eq(chunks.nodeId, nodeId));

    return result.changes;
  }

  /**
   * Delete chunks by version
   */
  async deleteByVersion(versionId: string): Promise<number> {
    const result = await this.db
      .delete(chunks)
      .where(eq(chunks.versionId, versionId));

    return result.changes;
  }

  /**
   * Count chunks
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(chunks);

    return result[0]?.count ?? 0;
  }

  /**
   * Get total token count
   */
  async getTotalTokens(): Promise<number> {
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(token_count), 0)` })
      .from(chunks);

    return result[0]?.total ?? 0;
  }

  /**
   * Convert database row to Chunk type
   */
  private rowToChunk(row: ChunkRow): Chunk {
    return {
      chunkId: row.chunkId,
      nodeId: row.nodeId,
      text: row.text,
      offsetStart: row.offsetStart,
      offsetEnd: row.offsetEnd,
      versionId: row.versionId,
      ...(row.tokenCount != null && { tokenCount: row.tokenCount }),
    };
  }
}
