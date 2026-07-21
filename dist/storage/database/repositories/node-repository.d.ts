import { DrizzleDB } from '../connection.js';
import type { Node, NodeType } from '../../../core/types/index.js';
/**
 * Repository for Node CRUD operations
 */
export declare class NodeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new node
     */
    create(data: Omit<Node, 'nodeId'>): Promise<Node>;
    /**
     * Create or update a node by path
     */
    upsert(data: Omit<Node, 'nodeId'> & {
        nodeId?: string;
    }): Promise<Node>;
    /**
     * Find a node by ID
     */
    findById(nodeId: string): Promise<Node | null>;
    /**
     * Find a node by path
     */
    findByPath(path: string): Promise<Node | null>;
    /**
     * Find a node by title (case-insensitive)
     */
    findByTitle(title: string): Promise<Node[]>;
    /**
     * Find a node by title or alias
     */
    findByTitleOrAlias(text: string): Promise<Node[]>;
    /**
     * Find nodes by type
     */
    findByType(type: NodeType): Promise<Node[]>;
    /**
     * Get all nodes
     */
    findAll(): Promise<Node[]>;
    /**
     * Find nodes by IDs
     */
    findByIds(nodeIds: string[]): Promise<Node[]>;
    /**
     * Search nodes by title pattern
     */
    searchByTitle(pattern: string): Promise<Node[]>;
    /**
     * Update a node
     */
    update(nodeId: string, data: Partial<Omit<Node, 'nodeId'>>): Promise<Node>;
    /**
     * Delete a node
     */
    delete(nodeId: string): Promise<void>;
    /**
     * Delete nodes by path pattern
     */
    deleteByPathPattern(pattern: string): Promise<number>;
    /**
     * Count nodes
     */
    count(): Promise<number>;
    /**
     * Count nodes by type
     */
    countByType(): Promise<Record<string, number>>;
    /**
     * Add an alias for a node
     */
    addAlias(nodeId: string, alias: string): Promise<void>;
    /**
     * Remove an alias
     */
    removeAlias(nodeId: string, alias: string): Promise<void>;
    /**
     * Get aliases for a node
     */
    getAliases(nodeId: string): Promise<string[]>;
    /**
     * Set aliases for a node (replaces existing)
     */
    setAliases(nodeId: string, newAliases: string[]): Promise<void>;
    /**
     * Find all ghost nodes
     */
    findGhosts(): Promise<Node[]>;
    /**
     * Find all non-ghost (real) nodes
     */
    findRealNodes(): Promise<Node[]>;
    /**
     * Count ghost nodes
     */
    countGhosts(): Promise<number>;
    /**
     * Create or find a ghost node by title.
     * Ghosts are placeholder nodes for unresolved references.
     * They have a synthetic path based on title.
     */
    getOrCreateGhost(title: string): Promise<Node>;
    /**
     * Materialize a ghost - convert it to a real node when the file is created.
     * Updates the ghost to be a real node with the actual path.
     */
    materializeGhost(nodeId: string, realPath: string): Promise<Node>;
    /**
     * Convert database row to Node type
     */
    private rowToNode;
}
//# sourceMappingURL=node-repository.d.ts.map