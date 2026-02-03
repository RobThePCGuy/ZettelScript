import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DrizzleDB } from '../connection.js';
import {
  mentionCandidates,
  type MentionCandidateRow,
  type NewMentionCandidateRow,
} from '../schema.js';
import type { MentionCandidate, MentionStatus } from '../../../core/types/index.js';

/**
 * Repository for MentionCandidate CRUD operations
 */
export class MentionRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Create a new mention candidate
   */
  async create(data: Omit<MentionCandidate, 'candidateId'>): Promise<MentionCandidate> {
    const candidateId = nanoid();

    const row: NewMentionCandidateRow = {
      candidateId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status,
    };

    await this.db.insert(mentionCandidates).values(row);

    return this.rowToMention({ ...row, candidateId } as MentionCandidateRow);
  }

  /**
   * Create multiple mention candidates
   */
  async createMany(
    dataArray: Array<Omit<MentionCandidate, 'candidateId'>>
  ): Promise<MentionCandidate[]> {
    if (dataArray.length === 0) return [];

    const rows: NewMentionCandidateRow[] = dataArray.map((data) => ({
      candidateId: nanoid(),
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status,
    }));

    await this.db.insert(mentionCandidates).values(rows);

    return rows.map((row) => this.rowToMention(row as MentionCandidateRow));
  }

  /**
   * Find a mention by ID
   */
  async findById(candidateId: string): Promise<MentionCandidate | null> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(eq(mentionCandidates.candidateId, candidateId))
      .limit(1);

    return result[0] ? this.rowToMention(result[0]) : null;
  }

  /**
   * Find mentions by source node
   */
  async findBySourceId(sourceId: string): Promise<MentionCandidate[]> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(eq(mentionCandidates.sourceId, sourceId));

    return result.map(this.rowToMention);
  }

  /**
   * Find mentions by target node
   */
  async findByTargetId(targetId: string): Promise<MentionCandidate[]> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(eq(mentionCandidates.targetId, targetId));

    return result.map(this.rowToMention);
  }

  /**
   * Find mentions by status
   */
  async findByStatus(status: MentionStatus): Promise<MentionCandidate[]> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(eq(mentionCandidates.status, status));

    return result.map(this.rowToMention);
  }

  /**
   * Find new (pending review) mentions for a source
   */
  async findNewForSource(sourceId: string): Promise<MentionCandidate[]> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(and(eq(mentionCandidates.sourceId, sourceId), eq(mentionCandidates.status, 'new')));

    return result.map(this.rowToMention);
  }

  /**
   * Check if a mention already exists
   */
  async exists(
    sourceId: string,
    targetId: string,
    spanStart: number,
    spanEnd: number
  ): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(mentionCandidates)
      .where(
        and(
          eq(mentionCandidates.sourceId, sourceId),
          eq(mentionCandidates.targetId, targetId),
          eq(mentionCandidates.spanStart, spanStart),
          eq(mentionCandidates.spanEnd, spanEnd)
        )
      );

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Update mention status
   */
  async updateStatus(candidateId: string, status: MentionStatus): Promise<MentionCandidate> {
    await this.db
      .update(mentionCandidates)
      .set({ status })
      .where(eq(mentionCandidates.candidateId, candidateId));

    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }

  /**
   * Approve a mention (converts to edge)
   */
  async approve(candidateId: string): Promise<MentionCandidate> {
    return this.updateStatus(candidateId, 'approved');
  }

  /**
   * Reject a mention
   */
  async reject(candidateId: string): Promise<MentionCandidate> {
    return this.updateStatus(candidateId, 'rejected');
  }

  /**
   * Defer a mention for later review
   */
  async defer(candidateId: string): Promise<MentionCandidate> {
    return this.updateStatus(candidateId, 'deferred');
  }

  /**
   * Update confidence score
   */
  async updateConfidence(candidateId: string, confidence: number): Promise<MentionCandidate> {
    await this.db
      .update(mentionCandidates)
      .set({ confidence })
      .where(eq(mentionCandidates.candidateId, candidateId));

    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }

  /**
   * Delete a mention
   */
  async delete(candidateId: string): Promise<void> {
    await this.db.delete(mentionCandidates).where(eq(mentionCandidates.candidateId, candidateId));
  }

  /**
   * Delete all mentions for a source
   */
  async deleteForSource(sourceId: string): Promise<number> {
    const result = await this.db
      .delete(mentionCandidates)
      .where(eq(mentionCandidates.sourceId, sourceId));

    return result.changes;
  }

  /**
   * Delete rejected mentions
   */
  async deleteRejected(): Promise<number> {
    const result = await this.db
      .delete(mentionCandidates)
      .where(eq(mentionCandidates.status, 'rejected'));

    return result.changes;
  }

  /**
   * Count mentions
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(mentionCandidates);

    return result[0]?.count ?? 0;
  }

  /**
   * Count mentions by status
   */
  async countByStatus(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        status: mentionCandidates.status,
        count: sql<number>`count(*)`,
      })
      .from(mentionCandidates)
      .groupBy(mentionCandidates.status);

    const counts: Record<string, number> = {};
    for (const row of result) {
      if (row.status) {
        counts[row.status] = row.count;
      }
    }
    return counts;
  }

  /**
   * Get top mentions by confidence
   */
  async getTopByConfidence(limit: number = 10): Promise<MentionCandidate[]> {
    const result = await this.db
      .select()
      .from(mentionCandidates)
      .where(eq(mentionCandidates.status, 'new'))
      .orderBy(sql`${mentionCandidates.confidence} DESC`)
      .limit(limit);

    return result.map(this.rowToMention);
  }

  /**
   * Convert database row to MentionCandidate type
   */
  private rowToMention(row: MentionCandidateRow): MentionCandidate {
    return {
      candidateId: row.candidateId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      surfaceText: row.surfaceText,
      confidence: row.confidence,
      status: (row.status ?? 'new') as MentionStatus,
      ...(row.spanStart != null && { spanStart: row.spanStart }),
      ...(row.spanEnd != null && { spanEnd: row.spanEnd }),
      ...(row.reasons != null && { reasons: row.reasons as string[] }),
    };
  }
}
