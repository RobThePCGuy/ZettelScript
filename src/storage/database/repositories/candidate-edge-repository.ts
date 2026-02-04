import { eq, and, inArray, sql } from 'drizzle-orm';
import { DrizzleDB } from '../connection.js';
import { candidateEdges, type CandidateEdgeRow, type NewCandidateEdgeRow } from '../schema.js';
import type {
  CandidateEdge,
  CandidateEdgeStatus,
  CandidateEdgeSignals,
  CandidateEdgeProvenance,
  EdgeType,
} from '../../../core/types/index.js';

/**
 * Input for creating a new candidate edge
 */
export interface CreateCandidateEdgeInput {
  suggestionId: string;
  fromId: string;
  toId: string;
  suggestedEdgeType: EdgeType;
  signals?: CandidateEdgeSignals;
  reasons?: string[];
  provenance?: CandidateEdgeProvenance[];
}

/**
 * Input for updating a candidate edge
 */
export interface UpdateCandidateEdgeInput {
  status?: CandidateEdgeStatus;
  signals?: CandidateEdgeSignals;
  reasons?: string[];
  provenance?: CandidateEdgeProvenance[];
  writebackStatus?: string;
  writebackReason?: string;
  approvedEdgeId?: string;
}

/**
 * Repository for candidate edge CRUD operations.
 * Candidate edges are suggestions that may be approved or rejected.
 */
export class CandidateEdgeRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new candidate edge
   */
  async create(data: CreateCandidateEdgeInput): Promise<CandidateEdge> {
    const now = new Date().toISOString();

    // Compute normalized IDs for undirected uniqueness
    const [fromIdNorm, toIdNorm] =
      data.fromId < data.toId ? [data.fromId, data.toId] : [data.toId, data.fromId];

    const row: NewCandidateEdgeRow = {
      suggestionId: data.suggestionId,
      fromId: data.fromId,
      toId: data.toId,
      suggestedEdgeType: data.suggestedEdgeType,
      fromIdNorm,
      toIdNorm,
      status: 'suggested',
      signals: data.signals ?? null,
      reasons: data.reasons ?? null,
      provenance: data.provenance ?? null,
      createdAt: now,
      lastComputedAt: now,
    };

    await this.db.insert(candidateEdges).values(row);

    return this.rowToCandidateEdge({
      ...row,
      statusChangedAt: null,
      lastSeenAt: null,
      writebackStatus: null,
      writebackReason: null,
      approvedEdgeId: null,
    } as CandidateEdgeRow);
  }

  /**
   * Create or update a candidate edge (upsert by suggestionId)
   */
  async upsert(data: CreateCandidateEdgeInput): Promise<CandidateEdge> {
    const existing = await this.findById(data.suggestionId);

    if (existing) {
      // Update existing - merge signals and reasons
      const mergedSignals = { ...existing.signals, ...data.signals };
      const mergedReasons = [...new Set([...(existing.reasons || []), ...(data.reasons || [])])];
      const mergedProvenance = [...(existing.provenance || []), ...(data.provenance || [])];

      return this.update(data.suggestionId, {
        signals: mergedSignals,
        reasons: mergedReasons.slice(0, 3), // Keep top 3
        provenance: mergedProvenance,
      });
    }

    return this.create(data);
  }

  /**
   * Find a candidate edge by ID
   */
  async findById(suggestionId: string): Promise<CandidateEdge | null> {
    const result = await this.db
      .select()
      .from(candidateEdges)
      .where(eq(candidateEdges.suggestionId, suggestionId))
      .limit(1);

    return result[0] ? this.rowToCandidateEdge(result[0]) : null;
  }

  /**
   * Find candidate edges by status
   */
  async findByStatus(status: CandidateEdgeStatus): Promise<CandidateEdge[]> {
    const result = await this.db
      .select()
      .from(candidateEdges)
      .where(eq(candidateEdges.status, status));

    return result.map((row) => this.rowToCandidateEdge(row));
  }

  /**
   * Find candidate edges involving a specific node (as source or target)
   */
  async findByNodeId(nodeId: string): Promise<CandidateEdge[]> {
    const result = await this.db
      .select()
      .from(candidateEdges)
      .where(sql`${candidateEdges.fromId} = ${nodeId} OR ${candidateEdges.toId} = ${nodeId}`);

    return result.map((row) => this.rowToCandidateEdge(row));
  }

  /**
   * Find suggested candidate edges for nodes in a given set
   */
  async findSuggestedForNodes(nodeIds: string[]): Promise<CandidateEdge[]> {
    if (nodeIds.length === 0) return [];

    const result = await this.db
      .select()
      .from(candidateEdges)
      .where(
        and(
          eq(candidateEdges.status, 'suggested'),
          sql`(${candidateEdges.fromId} IN ${nodeIds} OR ${candidateEdges.toId} IN ${nodeIds})`
        )
      );

    return result.map((row) => this.rowToCandidateEdge(row));
  }

  /**
   * Find by normalized pair (for checking duplicates)
   */
  async findByNormalizedPair(
    nodeId1: string,
    nodeId2: string,
    edgeType: EdgeType
  ): Promise<CandidateEdge | null> {
    const [fromIdNorm, toIdNorm] = nodeId1 < nodeId2 ? [nodeId1, nodeId2] : [nodeId2, nodeId1];

    const result = await this.db
      .select()
      .from(candidateEdges)
      .where(
        and(
          eq(candidateEdges.fromIdNorm, fromIdNorm),
          eq(candidateEdges.toIdNorm, toIdNorm),
          eq(candidateEdges.suggestedEdgeType, edgeType)
        )
      )
      .limit(1);

    return result[0] ? this.rowToCandidateEdge(result[0]) : null;
  }

  /**
   * Update a candidate edge
   */
  async update(suggestionId: string, data: UpdateCandidateEdgeInput): Promise<CandidateEdge> {
    const updateData: Partial<CandidateEdgeRow> = {
      lastComputedAt: new Date().toISOString(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.statusChangedAt = new Date().toISOString();
    }
    if (data.signals !== undefined) updateData.signals = data.signals;
    if (data.reasons !== undefined) updateData.reasons = data.reasons;
    if (data.provenance !== undefined) updateData.provenance = data.provenance;
    if (data.writebackStatus !== undefined) updateData.writebackStatus = data.writebackStatus;
    if (data.writebackReason !== undefined) updateData.writebackReason = data.writebackReason;
    if (data.approvedEdgeId !== undefined) updateData.approvedEdgeId = data.approvedEdgeId;

    await this.db
      .update(candidateEdges)
      .set(updateData)
      .where(eq(candidateEdges.suggestionId, suggestionId));

    const updated = await this.findById(suggestionId);
    if (!updated) {
      throw new Error(`Candidate edge ${suggestionId} not found after update`);
    }
    return updated;
  }

  /**
   * Update status of a candidate edge
   */
  async updateStatus(
    suggestionId: string,
    status: CandidateEdgeStatus,
    approvedEdgeId?: string
  ): Promise<CandidateEdge> {
    const updateData: UpdateCandidateEdgeInput = { status };
    if (approvedEdgeId !== undefined) {
      updateData.approvedEdgeId = approvedEdgeId;
    }
    return this.update(suggestionId, updateData);
  }

  /**
   * Mark last seen time for candidate edges (for pruning stale suggestions)
   */
  async markSeen(suggestionIds: string[]): Promise<void> {
    if (suggestionIds.length === 0) return;

    await this.db
      .update(candidateEdges)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(inArray(candidateEdges.suggestionId, suggestionIds));
  }

  /**
   * Delete a candidate edge
   */
  async delete(suggestionId: string): Promise<void> {
    await this.db.delete(candidateEdges).where(eq(candidateEdges.suggestionId, suggestionId));
  }

  /**
   * Delete all candidate edges for a node
   */
  async deleteForNode(nodeId: string): Promise<number> {
    const result = await this.db
      .delete(candidateEdges)
      .where(sql`${candidateEdges.fromId} = ${nodeId} OR ${candidateEdges.toId} = ${nodeId}`);

    return result.changes;
  }

  /**
   * Count candidate edges by status
   */
  async countByStatus(): Promise<Record<CandidateEdgeStatus, number>> {
    const result = await this.db
      .select({
        status: candidateEdges.status,
        count: sql<number>`count(*)`,
      })
      .from(candidateEdges)
      .groupBy(candidateEdges.status);

    const counts: Record<string, number> = {
      suggested: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of result) {
      counts[row.status] = row.count;
    }
    return counts as Record<CandidateEdgeStatus, number>;
  }

  /**
   * Count total candidate edges
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(candidateEdges);
    return result[0]?.count ?? 0;
  }

  /**
   * Convert database row to CandidateEdge type
   */
  private rowToCandidateEdge(row: CandidateEdgeRow): CandidateEdge {
    const result: CandidateEdge = {
      suggestionId: row.suggestionId,
      fromId: row.fromId,
      toId: row.toId,
      suggestedEdgeType: row.suggestedEdgeType as EdgeType,
      status: row.status as CandidateEdgeStatus,
      createdAt: row.createdAt,
      lastComputedAt: row.lastComputedAt,
    };

    if (row.statusChangedAt) result.statusChangedAt = row.statusChangedAt;
    if (row.signals) result.signals = row.signals as CandidateEdgeSignals;
    if (row.reasons) result.reasons = row.reasons as string[];
    if (row.provenance) result.provenance = row.provenance as CandidateEdgeProvenance[];
    if (row.lastSeenAt) result.lastSeenAt = row.lastSeenAt;
    if (row.writebackStatus) result.writebackStatus = row.writebackStatus;
    if (row.writebackReason) result.writebackReason = row.writebackReason;
    if (row.approvedEdgeId) result.approvedEdgeId = row.approvedEdgeId;

    return result;
  }
}
