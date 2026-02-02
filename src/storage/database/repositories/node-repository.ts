import { eq, like, and, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import { nodes, aliases, type NodeRow, type NewNodeRow } from '../schema.js';
import type { Node, NodeType } from '../../../core/types/index.js';

/**
 * Repository for Node CRUD operations
 */
export class NodeRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new node
   */
  async create(data: Omit<Node, 'nodeId'>): Promise<Node> {
    const nodeId = nanoid();
    const now = new Date().toISOString();

    const row: NewNodeRow = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null,
    };

    await this.db.insert(nodes).values(row);

    return this.rowToNode({ ...row, nodeId } as NodeRow);
  }

  /**
   * Create or update a node by path
   */
  async upsert(data: Omit<Node, 'nodeId'> & { nodeId?: string }): Promise<Node> {
    const now = new Date().toISOString();
    const nodeId = data.nodeId || nanoid();

    const existing = await this.findByPath(data.path);

    if (existing) {
      return this.update(existing.nodeId, {
        ...data,
        updatedAt: now,
      });
    }

    const row: NewNodeRow = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null,
    };

    await this.db.insert(nodes).values(row);

    return this.rowToNode({ ...row, nodeId } as NodeRow);
  }

  /**
   * Find a node by ID
   */
  async findById(nodeId: string): Promise<Node | null> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.nodeId, nodeId))
      .limit(1);

    return result[0] ? this.rowToNode(result[0]) : null;
  }

  /**
   * Find a node by path
   */
  async findByPath(path: string): Promise<Node | null> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.path, path))
      .limit(1);

    return result[0] ? this.rowToNode(result[0]) : null;
  }

  /**
   * Find a node by title (case-insensitive)
   */
  async findByTitle(title: string): Promise<Node[]> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(sql`${nodes.title} COLLATE NOCASE = ${title}`);

    return result.map(this.rowToNode);
  }

  /**
   * Find a node by title or alias
   */
  async findByTitleOrAlias(text: string): Promise<Node[]> {
    // First check exact title match
    const titleMatches = await this.db
      .select()
      .from(nodes)
      .where(sql`${nodes.title} COLLATE NOCASE = ${text}`);

    // Then check aliases
    const aliasMatches = await this.db
      .select({ node: nodes })
      .from(aliases)
      .innerJoin(nodes, eq(aliases.nodeId, nodes.nodeId))
      .where(sql`${aliases.alias} COLLATE NOCASE = ${text}`);

    // Combine and deduplicate
    const nodeMap = new Map<string, NodeRow>();
    for (const row of titleMatches) {
      nodeMap.set(row.nodeId, row);
    }
    for (const { node } of aliasMatches) {
      nodeMap.set(node.nodeId, node);
    }

    return Array.from(nodeMap.values()).map(this.rowToNode);
  }

  /**
   * Find nodes by type
   */
  async findByType(type: NodeType): Promise<Node[]> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.type, type));

    return result.map(this.rowToNode);
  }

  /**
   * Get all nodes
   */
  async findAll(): Promise<Node[]> {
    const result = await this.db.select().from(nodes);
    return result.map(this.rowToNode);
  }

  /**
   * Find nodes by IDs
   */
  async findByIds(nodeIds: string[]): Promise<Node[]> {
    if (nodeIds.length === 0) return [];

    const result = await this.db
      .select()
      .from(nodes)
      .where(inArray(nodes.nodeId, nodeIds));

    return result.map(this.rowToNode);
  }

  /**
   * Search nodes by title pattern
   */
  async searchByTitle(pattern: string): Promise<Node[]> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(like(nodes.title, `%${pattern}%`));

    return result.map(this.rowToNode);
  }

  /**
   * Update a node
   */
  async update(nodeId: string, data: Partial<Omit<Node, 'nodeId'>>): Promise<Node> {
    const updateData: Partial<NodeRow> = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.contentHash !== undefined) updateData.contentHash = data.contentHash;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    updateData.updatedAt = data.updatedAt || new Date().toISOString();

    await this.db
      .update(nodes)
      .set(updateData)
      .where(eq(nodes.nodeId, nodeId));

    const updated = await this.findById(nodeId);
    if (!updated) {
      throw new Error(`Node ${nodeId} not found after update`);
    }
    return updated;
  }

  /**
   * Delete a node
   */
  async delete(nodeId: string): Promise<void> {
    await this.db.delete(nodes).where(eq(nodes.nodeId, nodeId));
  }

  /**
   * Delete nodes by path pattern
   */
  async deleteByPathPattern(pattern: string): Promise<number> {
    const result = await this.db
      .delete(nodes)
      .where(like(nodes.path, pattern));

    return result.changes;
  }

  /**
   * Count nodes
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(nodes);

    return result[0]?.count ?? 0;
  }

  /**
   * Count nodes by type
   */
  async countByType(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        type: nodes.type,
        count: sql<number>`count(*)`,
      })
      .from(nodes)
      .groupBy(nodes.type);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }

  /**
   * Add an alias for a node
   */
  async addAlias(nodeId: string, alias: string): Promise<void> {
    await this.db.insert(aliases).values({
      aliasId: nanoid(),
      nodeId,
      alias,
    });
  }

  /**
   * Remove an alias
   */
  async removeAlias(nodeId: string, alias: string): Promise<void> {
    await this.db
      .delete(aliases)
      .where(and(
        eq(aliases.nodeId, nodeId),
        sql`${aliases.alias} COLLATE NOCASE = ${alias}`
      ));
  }

  /**
   * Get aliases for a node
   */
  async getAliases(nodeId: string): Promise<string[]> {
    const result = await this.db
      .select({ alias: aliases.alias })
      .from(aliases)
      .where(eq(aliases.nodeId, nodeId));

    return result.map(r => r.alias);
  }

  /**
   * Set aliases for a node (replaces existing)
   */
  async setAliases(nodeId: string, newAliases: string[]): Promise<void> {
    // Delete existing aliases
    await this.db.delete(aliases).where(eq(aliases.nodeId, nodeId));

    // Insert new aliases
    if (newAliases.length > 0) {
      await this.db.insert(aliases).values(
        newAliases.map(alias => ({
          aliasId: nanoid(),
          nodeId,
          alias,
        }))
      );
    }
  }

  /**
   * Convert database row to Node type
   */
  private rowToNode(row: NodeRow): Node {
    return {
      nodeId: row.nodeId,
      type: row.type as NodeType,
      title: row.title,
      path: row.path,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(row.contentHash != null && { contentHash: row.contentHash }),
      ...(row.metadata != null && { metadata: row.metadata as Record<string, unknown> }),
    };
  }
}
