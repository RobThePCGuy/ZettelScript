import { eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import {
  nodeEmbeddings,
  nodes,
  type NodeEmbeddingRow,
  type NewNodeEmbeddingRow,
} from '../schema.js';
import { getCircuitBreaker } from '../../../core/circuit-breaker.js';

/**
 * Interface for a node's embedding data
 */
export interface NodeEmbedding {
  embeddingId: string;
  nodeId: string;
  embedding: number[];
  model: string;
  dimensions: number;
  contentHash: string;
  computedAt: string;
}

export interface CreateEmbeddingInput {
  nodeId: string;
  embedding: number[];
  model: string;
  dimensions: number;
  contentHash: string;
}

/**
 * Repository for Node Embedding CRUD operations
 */
export class EmbeddingRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new embedding
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async create(data: CreateEmbeddingInput): Promise<NodeEmbedding | null> {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt('embeddings')) {
      return null;
    }

    const embeddingId = nanoid();
    const now = new Date().toISOString();

    const row: NewNodeEmbeddingRow = {
      embeddingId,
      nodeId: data.nodeId,
      embedding: data.embedding,
      model: data.model,
      dimensions: data.dimensions,
      contentHash: data.contentHash,
      computedAt: now,
    };

    try {
      await this.db.insert(nodeEmbeddings).values(row);
      cb.recordSuccess('embeddings');
      return this.rowToEmbedding({ ...row, embeddingId, computedAt: now } as NodeEmbeddingRow);
    } catch (error) {
      cb.recordFailure('embeddings', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Create or update an embedding for a node
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async upsert(data: CreateEmbeddingInput): Promise<NodeEmbedding | null> {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt('embeddings')) {
      return null;
    }

    const existing = await this.findByNodeId(data.nodeId);

    if (existing) {
      return this.update(existing.embeddingId, data);
    }

    return this.create(data);
  }

  /**
   * Find an embedding by ID
   */
  async findById(embeddingId: string): Promise<NodeEmbedding | null> {
    const result = await this.db
      .select()
      .from(nodeEmbeddings)
      .where(eq(nodeEmbeddings.embeddingId, embeddingId))
      .limit(1);

    return result[0] ? this.rowToEmbedding(result[0]) : null;
  }

  /**
   * Find embedding by node ID
   */
  async findByNodeId(nodeId: string): Promise<NodeEmbedding | null> {
    const result = await this.db
      .select()
      .from(nodeEmbeddings)
      .where(eq(nodeEmbeddings.nodeId, nodeId))
      .limit(1);

    return result[0] ? this.rowToEmbedding(result[0]) : null;
  }

  /**
   * Find all embeddings
   * Protected by vectorDb circuit breaker as this powers similarity search
   */
  async findAll(): Promise<NodeEmbedding[]> {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt('vectorDb')) {
      return [];
    }

    try {
      const result = await this.db.select().from(nodeEmbeddings);
      cb.recordSuccess('vectorDb');
      return result.map((row) => this.rowToEmbedding(row));
    } catch (error) {
      cb.recordFailure('vectorDb', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Find embeddings by model
   */
  async findByModel(model: string): Promise<NodeEmbedding[]> {
    const result = await this.db
      .select()
      .from(nodeEmbeddings)
      .where(eq(nodeEmbeddings.model, model));

    return result.map((row) => this.rowToEmbedding(row));
  }

  /**
   * Find embeddings by node IDs
   * Protected by vectorDb circuit breaker as this powers similarity search
   */
  async findByNodeIds(nodeIds: string[]): Promise<NodeEmbedding[]> {
    if (nodeIds.length === 0) return [];

    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt('vectorDb')) {
      return [];
    }

    try {
      const result = await this.db
        .select()
        .from(nodeEmbeddings)
        .where(inArray(nodeEmbeddings.nodeId, nodeIds));

      cb.recordSuccess('vectorDb');
      return result.map((row) => this.rowToEmbedding(row));
    } catch (error) {
      cb.recordFailure('vectorDb', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Find nodes that need embedding computation
   * Returns nodes where either:
   * - No embedding exists
   * - The content hash has changed since last embedding
   */
  async findDirtyNodeIds(): Promise<string[]> {
    // Get all nodes with their current content hash
    const allNodes = await this.db
      .select({
        nodeId: nodes.nodeId,
        contentHash: nodes.contentHash,
      })
      .from(nodes);

    // Get all existing embeddings
    const embeddings = await this.db
      .select({
        nodeId: nodeEmbeddings.nodeId,
        contentHash: nodeEmbeddings.contentHash,
      })
      .from(nodeEmbeddings);

    const embeddingMap = new Map(embeddings.map((e) => [e.nodeId, e.contentHash]));

    const dirtyNodeIds: string[] = [];
    for (const node of allNodes) {
      const existingHash = embeddingMap.get(node.nodeId);
      // Node is dirty if: no embedding exists, or content hash changed
      if (!existingHash || existingHash !== node.contentHash) {
        dirtyNodeIds.push(node.nodeId);
      }
    }

    return dirtyNodeIds;
  }

  /**
   * Update an embedding
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async update(
    embeddingId: string,
    data: Partial<CreateEmbeddingInput>
  ): Promise<NodeEmbedding | null> {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt('embeddings')) {
      return null;
    }

    const now = new Date().toISOString();
    const updateData: Partial<NodeEmbeddingRow> = {
      computedAt: now,
    };

    if (data.embedding !== undefined) updateData.embedding = data.embedding;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    if (data.contentHash !== undefined) updateData.contentHash = data.contentHash;

    try {
      await this.db
        .update(nodeEmbeddings)
        .set(updateData)
        .where(eq(nodeEmbeddings.embeddingId, embeddingId));

      cb.recordSuccess('embeddings');
      const updated = await this.findById(embeddingId);
      if (!updated) {
        return null;
      }
      return updated;
    } catch (error) {
      cb.recordFailure('embeddings', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Delete an embedding by ID
   */
  async delete(embeddingId: string): Promise<void> {
    await this.db.delete(nodeEmbeddings).where(eq(nodeEmbeddings.embeddingId, embeddingId));
  }

  /**
   * Delete embedding by node ID
   */
  async deleteByNodeId(nodeId: string): Promise<void> {
    await this.db.delete(nodeEmbeddings).where(eq(nodeEmbeddings.nodeId, nodeId));
  }

  /**
   * Delete all embeddings for a model
   */
  async deleteByModel(model: string): Promise<number> {
    const result = await this.db.delete(nodeEmbeddings).where(eq(nodeEmbeddings.model, model));

    return result.changes;
  }

  /**
   * Count embeddings
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(nodeEmbeddings);

    return result[0]?.count ?? 0;
  }

  /**
   * Count embeddings by model
   */
  async countByModel(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        model: nodeEmbeddings.model,
        count: sql<number>`count(*)`,
      })
      .from(nodeEmbeddings)
      .groupBy(nodeEmbeddings.model);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.model] = row.count;
    }
    return counts;
  }

  /**
   * Convert database row to NodeEmbedding type
   */
  private rowToEmbedding(row: NodeEmbeddingRow): NodeEmbedding {
    return {
      embeddingId: row.embeddingId,
      nodeId: row.nodeId,
      embedding: row.embedding as number[],
      model: row.model,
      dimensions: row.dimensions,
      contentHash: row.contentHash,
      computedAt: row.computedAt,
    };
  }
}
