import { DrizzleDB } from '../connection.js';
import type { Edge, EdgeType } from '../../../core/types/index.js';
/**
 * Repository for Edge CRUD operations
 */
export declare class EdgeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new edge
     */
    create(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge>;
    /**
     * Create or update an edge
     */
    upsert(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge>;
    /**
     * Find an edge by ID
     */
    findById(edgeId: string): Promise<Edge | null>;
    /**
     * Find edge by source, target, and type
     */
    findBySourceTargetType(sourceId: string, targetId: string, edgeType: EdgeType): Promise<Edge | null>;
    /**
     * Find all outgoing edges from a node
     */
    findOutgoing(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find all incoming edges to a node
     */
    findIncoming(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find all edges connected to a node (both directions)
     */
    findConnected(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find edges by type
     */
    findByType(edgeType: EdgeType): Promise<Edge[]>;
    /**
     * Get all edges, optionally filtered by edge types
     */
    findAll(edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find backlinks (explicit_link edges targeting a node)
     */
    findBacklinks(nodeId: string): Promise<Edge[]>;
    /**
     * Update an edge
     */
    update(edgeId: string, data: Partial<Omit<Edge, 'edgeId' | 'createdAt'>>): Promise<Edge>;
    /**
     * Delete an edge
     */
    delete(edgeId: string): Promise<void>;
    /**
     * Delete all edges for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Delete edges by source and type
     */
    deleteBySourceAndType(sourceId: string, edgeType: EdgeType): Promise<number>;
    /**
     * Count edges
     */
    count(): Promise<number>;
    /**
     * Count edges by type
     */
    countByType(): Promise<Record<string, number>>;
    /**
     * Find neighbors with node info
     */
    findNeighborsWithNodes(nodeId: string, edgeTypes?: EdgeType[]): Promise<Array<{
        edge: Edge;
        node: {
            nodeId: string;
            title: string;
            type: string;
            path: string;
        };
        direction: 'incoming' | 'outgoing';
    }>>;
    /**
     * Convert database row to Edge type
     */
    private rowToEdge;
}
//# sourceMappingURL=edge-repository.d.ts.map