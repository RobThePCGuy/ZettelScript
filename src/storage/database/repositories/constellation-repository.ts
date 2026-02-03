import { eq } from 'drizzle-orm';
import { DrizzleDB } from '../connection.js';
import { constellations, ConstellationRow } from '../schema.js';
import { randomUUID } from 'node:crypto';

/**
 * Constellation represents a saved graph view configuration
 */
export interface Constellation {
  constellationId: string;
  name: string;
  description: string | undefined;
  hiddenNodeTypes: string[];
  hiddenEdgeTypes: string[];
  showGhosts: boolean;
  ghostThreshold: number;
  cameraX: number | undefined;
  cameraY: number | undefined;
  cameraZoom: number | undefined;
  focusNodeIds: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new constellation
 */
export interface CreateConstellationInput {
  name: string;
  description?: string;
  hiddenNodeTypes?: string[];
  hiddenEdgeTypes?: string[];
  showGhosts?: boolean;
  ghostThreshold?: number;
  cameraX?: number;
  cameraY?: number;
  cameraZoom?: number;
  focusNodeIds?: string[];
}

/**
 * Input for updating an existing constellation
 */
export interface UpdateConstellationInput {
  name?: string;
  description?: string;
  hiddenNodeTypes?: string[];
  hiddenEdgeTypes?: string[];
  showGhosts?: boolean;
  ghostThreshold?: number;
  cameraX?: number;
  cameraY?: number;
  cameraZoom?: number;
  focusNodeIds?: string[];
}

/**
 * Repository for constellation CRUD operations
 */
export class ConstellationRepository {
  constructor(private db: DrizzleDB) {}

  /**
   * Convert a database row to a Constellation object
   */
  private rowToConstellation(row: ConstellationRow): Constellation {
    return {
      constellationId: row.constellationId,
      name: row.name,
      description: row.description ?? undefined,
      hiddenNodeTypes: (row.hiddenNodeTypes as string[] | null) ?? [],
      hiddenEdgeTypes: (row.hiddenEdgeTypes as string[] | null) ?? [],
      showGhosts: row.showGhosts === 1,
      ghostThreshold: row.ghostThreshold,
      cameraX: row.cameraX ?? undefined,
      cameraY: row.cameraY ?? undefined,
      cameraZoom: row.cameraZoom ?? undefined,
      focusNodeIds: (row.focusNodeIds as string[] | null) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Create a new constellation
   */
  async create(input: CreateConstellationInput): Promise<Constellation> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const row: typeof constellations.$inferInsert = {
      constellationId: id,
      name: input.name,
      description: input.description ?? null,
      hiddenNodeTypes: input.hiddenNodeTypes ?? [],
      hiddenEdgeTypes: input.hiddenEdgeTypes ?? [],
      showGhosts: input.showGhosts !== false ? 1 : 0,
      ghostThreshold: input.ghostThreshold ?? 1,
      cameraX: input.cameraX ?? null,
      cameraY: input.cameraY ?? null,
      cameraZoom: input.cameraZoom ?? null,
      focusNodeIds: input.focusNodeIds ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(constellations).values(row);

    return this.rowToConstellation(row as ConstellationRow);
  }

  /**
   * Find a constellation by ID
   */
  async findById(id: string): Promise<Constellation | null> {
    const rows = await this.db
      .select()
      .from(constellations)
      .where(eq(constellations.constellationId, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.rowToConstellation(row);
  }

  /**
   * Find a constellation by name
   */
  async findByName(name: string): Promise<Constellation | null> {
    const rows = await this.db
      .select()
      .from(constellations)
      .where(eq(constellations.name, name))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.rowToConstellation(row);
  }

  /**
   * Find all constellations
   */
  async findAll(): Promise<Constellation[]> {
    const rows = await this.db.select().from(constellations);
    return rows.map((row) => this.rowToConstellation(row));
  }

  /**
   * Update an existing constellation
   */
  async update(id: string, input: UpdateConstellationInput): Promise<Constellation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    const updates: Partial<typeof constellations.$inferInsert> = {
      updatedAt: now,
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.hiddenNodeTypes !== undefined) updates.hiddenNodeTypes = input.hiddenNodeTypes;
    if (input.hiddenEdgeTypes !== undefined) updates.hiddenEdgeTypes = input.hiddenEdgeTypes;
    if (input.showGhosts !== undefined) updates.showGhosts = input.showGhosts ? 1 : 0;
    if (input.ghostThreshold !== undefined) updates.ghostThreshold = input.ghostThreshold;
    if (input.cameraX !== undefined) updates.cameraX = input.cameraX;
    if (input.cameraY !== undefined) updates.cameraY = input.cameraY;
    if (input.cameraZoom !== undefined) updates.cameraZoom = input.cameraZoom;
    if (input.focusNodeIds !== undefined) updates.focusNodeIds = input.focusNodeIds;

    await this.db.update(constellations).set(updates).where(eq(constellations.constellationId, id));

    return this.findById(id);
  }

  /**
   * Delete a constellation by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(constellations)
      .where(eq(constellations.constellationId, id));

    return (result as { changes?: number }).changes !== 0;
  }

  /**
   * Delete a constellation by name
   */
  async deleteByName(name: string): Promise<boolean> {
    const result = await this.db.delete(constellations).where(eq(constellations.name, name));

    return (result as { changes?: number }).changes !== 0;
  }
}
