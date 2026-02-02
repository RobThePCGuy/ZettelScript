import type { ZettelScriptConfig } from '../core/types/index.js';
import { DEFAULT_CONFIG } from '../core/types/index.js';

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
export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private defaultTtl: number;
  private maxSize: number;

  constructor(options: CacheManagerOptions = {}) {
    const config = options.config ?? DEFAULT_CONFIG;
    this.defaultTtl = options.defaultTtl ?? config.cache.defaultTtlMs;
    this.maxSize = options.maxSize ?? config.cache.defaultMaxSize;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl ?? this.defaultTtl,
      tags: options.tags ?? [],
    };

    this.cache.set(key, entry);

    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)?.add(key);
    }
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Remove from tag index
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }

    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate all entries with a given tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }

    this.tagIndex.delete(tag);
    return count;
  }

  /**
   * Invalidate entries related to a node
   */
  invalidateForNode(nodeId: string): number {
    return this.invalidateByTag(`node:${nodeId}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get or compute a value
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, options);
    return value;
  }

  /**
   * Evict oldest entries to make room
   */
  private evictOldest(): void {
    let oldest: { key: string; timestamp: number } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: entry.timestamp };
      }
    }

    if (oldest) {
      this.delete(oldest.key);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all tags
   */
  tags(): string[] {
    return Array.from(this.tagIndex.keys());
  }
}

/**
 * Specialized cache for mention detection results
 */
export class MentionCache extends CacheManager<Array<{
  targetId: string;
  surfaceText: string;
  confidence: number;
}>> {
  constructor(config?: ZettelScriptConfig) {
    const cfg = config ?? DEFAULT_CONFIG;
    super({
      defaultTtl: cfg.cache.mentionTtlMs,
      maxSize: cfg.cache.mentionMaxSize,
      config: cfg,
    });
  }

  /**
   * Invalidate mentions for a source node
   */
  invalidateSource(sourceNodeId: string): void {
    this.delete(`mentions:${sourceNodeId}`);
  }

  /**
   * Invalidate mentions that might include a target
   */
  invalidateTarget(targetNodeId: string): void {
    this.invalidateByTag(`target:${targetNodeId}`);
  }
}

/**
 * Specialized cache for MOC queries
 */
export class MOCCache extends CacheManager<{
  entries: Array<{ nodeId: string; title: string; score: number }>;
  query: string;
}> {
  constructor(config?: ZettelScriptConfig) {
    const cfg = config ?? DEFAULT_CONFIG;
    super({
      defaultTtl: cfg.cache.mocTtlMs,
      maxSize: cfg.cache.mocMaxSize,
      config: cfg,
    });
  }
}
