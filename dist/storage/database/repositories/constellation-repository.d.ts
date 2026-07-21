import { DrizzleDB } from '../connection.js';
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
export declare class ConstellationRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Convert a database row to a Constellation object
     */
    private rowToConstellation;
    /**
     * Create a new constellation
     */
    create(input: CreateConstellationInput): Promise<Constellation>;
    /**
     * Find a constellation by ID
     */
    findById(id: string): Promise<Constellation | null>;
    /**
     * Find a constellation by name
     */
    findByName(name: string): Promise<Constellation | null>;
    /**
     * Find all constellations
     */
    findAll(): Promise<Constellation[]>;
    /**
     * Update an existing constellation
     */
    update(id: string, input: UpdateConstellationInput): Promise<Constellation | null>;
    /**
     * Delete a constellation by ID
     */
    delete(id: string): Promise<boolean>;
    /**
     * Delete a constellation by name
     */
    deleteByName(name: string): Promise<boolean>;
}
//# sourceMappingURL=constellation-repository.d.ts.map