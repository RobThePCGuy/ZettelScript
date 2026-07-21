import type { ZettelScriptConfig } from '../core/types/index.js';
import { NodeRepository } from '../storage/database/repositories/index.js';
import { GraphEngine } from '../core/graph/engine.js';
export interface MOCEntry {
    nodeId: string;
    title: string;
    type: string;
    path: string;
    score: number;
    reason: string;
}
export interface MOCQueryResult {
    entries: MOCEntry[];
    query: string;
    cached: boolean;
    cacheAge?: number;
}
export interface MOCEngineOptions {
    nodeRepository: NodeRepository;
    graphEngine: GraphEngine;
    config?: ZettelScriptConfig;
}
/**
 * Dynamic Map of Content engine
 * Generates MOCs based on graph structure, tags, and relationships
 */
export declare class MOCEngine {
    private nodeRepo;
    private graphEngine;
    private config;
    private cache;
    private cacheMaxAge;
    constructor(options: MOCEngineOptions);
    /**
     * Generate a MOC for a specific node (what it connects to)
     */
    generateForNode(nodeId: string): Promise<MOCQueryResult>;
    /**
     * Generate a MOC by type
     */
    generateByType(type: string): Promise<MOCQueryResult>;
    /**
     * Generate a MOC by tag
     */
    generateByTag(tag: string): Promise<MOCQueryResult>;
    /**
     * Find hub nodes (potential MOC candidates)
     */
    findHubs(threshold?: number): Promise<MOCQueryResult>;
    /**
     * Generate MOC for a cluster (connected component)
     */
    generateForCluster(seedNodeId: string): Promise<MOCQueryResult>;
    /**
     * Get from cache
     */
    private getFromCache;
    /**
     * Set cache
     */
    private setCache;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Invalidate cache for a node and related caches
     */
    invalidateNode(nodeId: string): void;
}
//# sourceMappingURL=moc-engine.d.ts.map