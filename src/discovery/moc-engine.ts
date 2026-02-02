import type { Node, ZettelScriptConfig } from '../core/types/index.js';
import { DEFAULT_CONFIG } from '../core/types/index.js';
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
export class MOCEngine {
  private nodeRepo: NodeRepository;
  private graphEngine: GraphEngine;
  private config: ZettelScriptConfig;
  private cache: Map<string, { result: MOCQueryResult; timestamp: number }> = new Map();
  private cacheMaxAge: number;

  constructor(options: MOCEngineOptions) {
    this.nodeRepo = options.nodeRepository;
    this.graphEngine = options.graphEngine;
    this.config = options.config ?? DEFAULT_CONFIG;
    this.cacheMaxAge = this.config.cache.mocTtlMs;
  }

  /**
   * Generate a MOC for a specific node (what it connects to)
   */
  async generateForNode(nodeId: string): Promise<MOCQueryResult> {
    const cacheKey = `node:${nodeId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      return { entries: [], query: nodeId, cached: false };
    }

    const entries: MOCEntry[] = [];

    // Get all connected nodes via graph expansion
    const expansion = await this.graphEngine.expandGraph({
      seedNodes: [{ nodeId, score: 1 }],
      maxDepth: this.config.graph.defaultMaxDepth,
      budget: this.config.graph.defaultBudget,
      includeIncoming: true,
    });

    // Fetch node details for expanded nodes
    const expandedIds = expansion.filter(e => e.nodeId !== nodeId).map(e => e.nodeId);
    const expandedNodes = await this.nodeRepo.findByIds(expandedIds);
    const nodeMap = new Map(expandedNodes.map(n => [n.nodeId, n]));

    for (const exp of expansion) {
      if (exp.nodeId === nodeId) continue;

      const connectedNode = nodeMap.get(exp.nodeId);
      if (!connectedNode) continue;

      entries.push({
        nodeId: connectedNode.nodeId,
        title: connectedNode.title,
        type: connectedNode.type,
        path: connectedNode.path,
        score: exp.score,
        reason: exp.depth === 1 ? 'direct_link' : `${exp.depth}_hops`,
      });
    }

    // Sort by score
    entries.sort((a, b) => b.score - a.score);

    const result: MOCQueryResult = {
      entries,
      query: node.title,
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Generate a MOC by type
   */
  async generateByType(type: string): Promise<MOCQueryResult> {
    const cacheKey = `type:${type}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const nodes = await this.nodeRepo.findByType(type as Node['type']);

    // Score nodes by connectivity
    const entries: MOCEntry[] = [];

    for (const node of nodes) {
      const degree = await this.graphEngine.getDegree(node.nodeId);
      const score = Math.log(degree.total + 1) / Math.log(this.config.moc.scoreNormalizationBase);

      entries.push({
        nodeId: node.nodeId,
        title: node.title,
        type: node.type,
        path: node.path,
        score: Math.min(1, score),
        reason: `${degree.in} incoming, ${degree.out} outgoing`,
      });
    }

    // Sort by score
    entries.sort((a, b) => b.score - a.score);

    const result: MOCQueryResult = {
      entries,
      query: `type:${type}`,
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Generate a MOC by tag
   */
  async generateByTag(tag: string): Promise<MOCQueryResult> {
    const cacheKey = `tag:${tag}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const allNodes = await this.nodeRepo.findAll();

    // Filter nodes with this tag
    const nodesWithTag = allNodes.filter(node => {
      const metadata = node.metadata as { tags?: string[] } | undefined;
      return metadata?.tags?.includes(tag);
    });

    // Score nodes
    const entries: MOCEntry[] = [];

    for (const node of nodesWithTag) {
      const degree = await this.graphEngine.getDegree(node.nodeId);
      const score = Math.log(degree.total + 1) / Math.log(this.config.moc.scoreNormalizationBase);

      entries.push({
        nodeId: node.nodeId,
        title: node.title,
        type: node.type,
        path: node.path,
        score: Math.min(1, score),
        reason: `tagged:${tag}`,
      });
    }

    // Sort by score
    entries.sort((a, b) => b.score - a.score);

    const result: MOCQueryResult = {
      entries,
      query: `tag:${tag}`,
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Find hub nodes (potential MOC candidates)
   */
  async findHubs(threshold?: number): Promise<MOCQueryResult> {
    const hubThreshold = threshold ?? this.config.moc.defaultHubThreshold;
    const cacheKey = `hubs:${hubThreshold}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const hubs = await this.graphEngine.findHighInDegreeNodes(hubThreshold);

    const entries: MOCEntry[] = hubs.map(h => ({
      nodeId: h.node.nodeId,
      title: h.node.title,
      type: h.node.type,
      path: h.node.path,
      score: Math.min(1, h.inDegree / this.config.moc.hubScoreNormalization),
      reason: `${h.inDegree} incoming links`,
    }));

    const result: MOCQueryResult = {
      entries,
      query: `hubs:${hubThreshold}`,
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Generate MOC for a cluster (connected component)
   */
  async generateForCluster(seedNodeId: string): Promise<MOCQueryResult> {
    const cacheKey = `cluster:${seedNodeId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const component = await this.graphEngine.getComponentContaining(seedNodeId);
    const nodes = await this.nodeRepo.findByIds(component);

    // Score by centrality within cluster
    const entries: MOCEntry[] = [];

    for (const node of nodes) {
      const degree = await this.graphEngine.getDegree(node.nodeId);

      entries.push({
        nodeId: node.nodeId,
        title: node.title,
        type: node.type,
        path: node.path,
        score: Math.min(1, (degree.in + degree.out) / this.config.moc.clusterScoreNormalization),
        reason: 'cluster_member',
      });
    }

    entries.sort((a, b) => b.score - a.score);

    const result: MOCQueryResult = {
      entries,
      query: `cluster containing ${seedNodeId}`,
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): MOCQueryResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheMaxAge) {
      this.cache.delete(key);
      return null;
    }

    return {
      ...entry.result,
      cached: true,
      cacheAge: age,
    };
  }

  /**
   * Set cache
   */
  private setCache(key: string, result: MOCQueryResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a node and related caches
   */
  invalidateNode(nodeId: string): void {
    this.cache.delete(`node:${nodeId}`);
    this.cache.delete(`cluster:${nodeId}`);

    // Clear type/tag/hub caches that might include this node
    for (const key of this.cache.keys()) {
      if (key.startsWith('type:') || key.startsWith('tag:') || key.startsWith('hubs:')) {
        this.cache.delete(key);
      }
    }
  }
}
