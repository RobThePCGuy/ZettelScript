import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import { edges, nodes, type EdgeRow, type NewEdgeRow } from '../schema.js';
import type { Edge, EdgeType, EdgeProvenance } from '../../../core/types/index.js';

/**
 * Repository for Edge CRUD operations
 */
export class EdgeRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new edge
   */
  async create(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge> {
    const edgeId = nanoid();
    const now = new Date().toISOString();

    const row: NewEdgeRow = {
      edgeId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      edgeType: data.edgeType,
      strength: data.strength ?? null,
      provenance: data.provenance,
      createdAt: now,
      versionStart: data.versionStart ?? null,
      versionEnd: data.versionEnd ?? null,
      attributes: data.attributes ?? null,
    };

    await this.db.insert(edges).values(row);

    return this.rowToEdge({ ...row, edgeId, createdAt: now } as EdgeRow);
  }

  /**
   * Create or update an edge
   */
  async upsert(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge> {
    // Check for existing edge with same source, target, and type
    const existing = await this.findBySourceTargetType(
      data.sourceId,
      data.targetId,
      data.edgeType
    );

    if (existing) {
      return this.update(existing.edgeId, data);
    }

    return this.create(data);
  }

  /**
   * Find an edge by ID
   */
  async findById(edgeId: string): Promise<Edge | null> {
    const result = await this.db
      .select()
      .from(edges)
      .where(eq(edges.edgeId, edgeId))
      .limit(1);

    return result[0] ? this.rowToEdge(result[0]) : null;
  }

  /**
   * Find edge by source, target, and type
   */
  async findBySourceTargetType(
    sourceId: string,
    targetId: string,
    edgeType: EdgeType
  ): Promise<Edge | null> {
    const result = await this.db
      .select()
      .from(edges)
      .where(and(
        eq(edges.sourceId, sourceId),
        eq(edges.targetId, targetId),
        eq(edges.edgeType, edgeType)
      ))
      .limit(1);

    return result[0] ? this.rowToEdge(result[0]) : null;
  }

  /**
   * Find all outgoing edges from a node
   */
  async findOutgoing(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]> {
    let query = this.db
      .select()
      .from(edges)
      .where(eq(edges.sourceId, nodeId));

    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db
        .select()
        .from(edges)
        .where(and(
          eq(edges.sourceId, nodeId),
          inArray(edges.edgeType, edgeTypes)
        ));
    }

    const result = await query;
    return result.map(this.rowToEdge);
  }

  /**
   * Find all incoming edges to a node
   */
  async findIncoming(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]> {
    let query = this.db
      .select()
      .from(edges)
      .where(eq(edges.targetId, nodeId));

    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db
        .select()
        .from(edges)
        .where(and(
          eq(edges.targetId, nodeId),
          inArray(edges.edgeType, edgeTypes)
        ));
    }

    const result = await query;
    return result.map(this.rowToEdge);
  }

  /**
   * Find all edges connected to a node (both directions)
   */
  async findConnected(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]> {
    const condition = or(
      eq(edges.sourceId, nodeId),
      eq(edges.targetId, nodeId)
    );

    let result;
    if (edgeTypes && edgeTypes.length > 0) {
      result = await this.db
        .select()
        .from(edges)
        .where(and(condition, inArray(edges.edgeType, edgeTypes)));
    } else {
      result = await this.db.select().from(edges).where(condition);
    }

    return result.map(this.rowToEdge);
  }

  /**
   * Find edges by type
   */
  async findByType(edgeType: EdgeType): Promise<Edge[]> {
    const result = await this.db
      .select()
      .from(edges)
      .where(eq(edges.edgeType, edgeType));

    return result.map(this.rowToEdge);
  }

  /**
   * Get all edges
   */
  async findAll(): Promise<Edge[]> {
    const result = await this.db.select().from(edges);
    return result.map(this.rowToEdge);
  }

  /**
   * Find backlinks (explicit_link edges targeting a node)
   */
  async findBacklinks(nodeId: string): Promise<Edge[]> {
    const result = await this.db
      .select()
      .from(edges)
      .where(and(
        eq(edges.targetId, nodeId),
        eq(edges.edgeType, 'explicit_link')
      ));

    return result.map(this.rowToEdge);
  }

  /**
   * Update an edge
   */
  async update(edgeId: string, data: Partial<Omit<Edge, 'edgeId' | 'createdAt'>>): Promise<Edge> {
    const updateData: Partial<EdgeRow> = {};

    if (data.sourceId !== undefined) updateData.sourceId = data.sourceId;
    if (data.targetId !== undefined) updateData.targetId = data.targetId;
    if (data.edgeType !== undefined) updateData.edgeType = data.edgeType;
    if (data.strength !== undefined) updateData.strength = data.strength;
    if (data.provenance !== undefined) updateData.provenance = data.provenance;
    if (data.versionStart !== undefined) updateData.versionStart = data.versionStart;
    if (data.versionEnd !== undefined) updateData.versionEnd = data.versionEnd;
    if (data.attributes !== undefined) updateData.attributes = data.attributes;

    await this.db
      .update(edges)
      .set(updateData)
      .where(eq(edges.edgeId, edgeId));

    const updated = await this.findById(edgeId);
    if (!updated) {
      throw new Error(`Edge ${edgeId} not found after update`);
    }
    return updated;
  }

  /**
   * Delete an edge
   */
  async delete(edgeId: string): Promise<void> {
    await this.db.delete(edges).where(eq(edges.edgeId, edgeId));
  }

  /**
   * Delete all edges for a node
   */
  async deleteForNode(nodeId: string): Promise<number> {
    const result = await this.db
      .delete(edges)
      .where(or(
        eq(edges.sourceId, nodeId),
        eq(edges.targetId, nodeId)
      ));

    return result.changes;
  }

  /**
   * Delete edges by source and type
   */
  async deleteBySourceAndType(sourceId: string, edgeType: EdgeType): Promise<number> {
    const result = await this.db
      .delete(edges)
      .where(and(
        eq(edges.sourceId, sourceId),
        eq(edges.edgeType, edgeType)
      ));

    return result.changes;
  }

  /**
   * Count edges
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(edges);

    return result[0]?.count ?? 0;
  }

  /**
   * Count edges by type
   */
  async countByType(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        type: edges.edgeType,
        count: sql<number>`count(*)`,
      })
      .from(edges)
      .groupBy(edges.edgeType);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }

  /**
   * Find neighbors with node info
   */
  async findNeighborsWithNodes(nodeId: string, edgeTypes?: EdgeType[]): Promise<Array<{
    edge: Edge;
    node: { nodeId: string; title: string; type: string; path: string };
    direction: 'incoming' | 'outgoing';
  }>> {
    const outgoing = await this.findOutgoing(nodeId, edgeTypes);
    const incoming = await this.findIncoming(nodeId, edgeTypes);

    const results: Array<{
      edge: Edge;
      node: { nodeId: string; title: string; type: string; path: string };
      direction: 'incoming' | 'outgoing';
    }> = [];

    // Get target nodes for outgoing edges
    if (outgoing.length > 0) {
      const targetIds = outgoing.map(e => e.targetId);
      const targetNodes = await this.db
        .select({
          nodeId: nodes.nodeId,
          title: nodes.title,
          type: nodes.type,
          path: nodes.path,
        })
        .from(nodes)
        .where(inArray(nodes.nodeId, targetIds));

      const nodeMap = new Map(targetNodes.map(n => [n.nodeId, n]));

      for (const edge of outgoing) {
        const node = nodeMap.get(edge.targetId);
        if (node) {
          results.push({ edge, node, direction: 'outgoing' });
        }
      }
    }

    // Get source nodes for incoming edges
    if (incoming.length > 0) {
      const sourceIds = incoming.map(e => e.sourceId);
      const sourceNodes = await this.db
        .select({
          nodeId: nodes.nodeId,
          title: nodes.title,
          type: nodes.type,
          path: nodes.path,
        })
        .from(nodes)
        .where(inArray(nodes.nodeId, sourceIds));

      const nodeMap = new Map(sourceNodes.map(n => [n.nodeId, n]));

      for (const edge of incoming) {
        const node = nodeMap.get(edge.sourceId);
        if (node) {
          results.push({ edge, node, direction: 'incoming' });
        }
      }
    }

    return results;
  }

  /**
   * Convert database row to Edge type
   */
  private rowToEdge(row: EdgeRow): Edge {
    return {
      edgeId: row.edgeId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      edgeType: row.edgeType as EdgeType,
      provenance: row.provenance as EdgeProvenance,
      createdAt: row.createdAt,
      ...(row.strength != null && { strength: row.strength }),
      ...(row.versionStart != null && { versionStart: row.versionStart }),
      ...(row.versionEnd != null && { versionEnd: row.versionEnd }),
      ...(row.attributes != null && { attributes: row.attributes as Record<string, unknown> }),
    };
  }
}
