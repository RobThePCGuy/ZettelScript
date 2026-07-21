import type { ZettelScriptConfig } from '../core/types/index.js';
export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    tags: string[];
}
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
}
export interface CacheManagerOptions {
    defaultTtl?: number;
    maxSize?: number;
    config?: ZettelScriptConfig;
}
/**
 * Generic cache manager with TTL and tag-based invalidation
 */
export declare class CacheManager<T = unknown> {
    private cache;
    private tagIndex;
    private hits;
    private misses;
    private defaultTtl;
    private maxSize;
    constructor(options?: CacheManagerOptions);
    /**
     * Get a value from cache
     */
    get(key: string): T | undefined;
    /**
     * Set a value in cache
     */
    set(key: string, value: T, options?: {
        ttl?: number;
        tags?: string[];
    }): void;
    /**
     * Delete a key from cache
     */
    delete(key: string): boolean;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Invalidate all entries with a given tag
     */
    invalidateByTag(tag: string): number;
    /**
     * Invalidate entries related to a node
     */
    invalidateForNode(nodeId: string): number;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get or compute a value
     */
    getOrCompute(key: string, compute: () => Promise<T>, options?: {
        ttl?: number;
        tags?: string[];
    }): Promise<T>;
    /**
     * Evict oldest entries to make room
     */
    private evictOldest;
    /**
     * Clean up expired entries
     */
    cleanup(): number;
    /**
     * Get all keys
     */
    keys(): string[];
    /**
     * Get all tags
     */
    tags(): string[];
}
/**
 * Specialized cache for mention detection results
 */
export declare class MentionCache extends CacheManager<Array<{
    targetId: string;
    surfaceText: string;
    confidence: number;
}>> {
    constructor(config?: ZettelScriptConfig);
    /**
     * Invalidate mentions for a source node
     */
    invalidateSource(sourceNodeId: string): void;
    /**
     * Invalidate mentions that might include a target
     */
    invalidateTarget(targetNodeId: string): void;
}
/**
 * Specialized cache for MOC queries
 */
export declare class MOCCache extends CacheManager<{
    entries: Array<{
        nodeId: string;
        title: string;
        score: number;
    }>;
    query: string;
}> {
    constructor(config?: ZettelScriptConfig);
}
//# sourceMappingURL=cache-manager.d.ts.map