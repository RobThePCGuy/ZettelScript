import type { WikiLink, ResolvedLink, Node } from '../core/types/index.js';
import { normalizeTarget, targetsMatch } from './wikilink.js';

export interface LinkResolverOptions {
  /**
   * Function to find nodes by title (case-insensitive)
   */
  findByTitle: (title: string) => Promise<Node[]>;

  /**
   * Function to find a node by ID
   */
  findById: (nodeId: string) => Promise<Node | null>;

  /**
   * Function to find nodes by title or alias
   */
  findByTitleOrAlias: (text: string) => Promise<Node[]>;
}

export interface ResolutionResult {
  resolved: ResolvedLink[];
  unresolved: WikiLink[];
  ambiguous: WikiLink[];
}

/**
 * Link resolver following the spec:
 * 1. If id: prefix → direct node_id lookup
 * 2. Else normalize text:
 *    a. Exact title match (case-insensitive)
 *    b. Alias match
 * 3. Multiple matches → ambiguous (prompt user)
 * 4. No matches → unresolved (record separately)
 */
export class LinkResolver {
  private cache: Map<string, Node[]> = new Map();

  constructor(private options: LinkResolverOptions) {}

  /**
   * Resolve a single wikilink
   */
  async resolveLink(link: WikiLink): Promise<ResolvedLink> {
    // Case 1: Direct ID reference
    if (link.isIdLink) {
      const node = await this.options.findById(link.target);
      return {
        ...link,
        resolvedNodeId: node?.nodeId ?? null,
        ambiguous: false,
        candidates: node ? [node.nodeId] : [],
      };
    }

    // Case 2: Title/alias resolution
    const normalizedTarget = normalizeTarget(link.target);

    // Check cache first
    let candidates = this.cache.get(normalizedTarget.toLowerCase());

    if (!candidates) {
      // Find by title or alias
      candidates = await this.options.findByTitleOrAlias(normalizedTarget);
      this.cache.set(normalizedTarget.toLowerCase(), candidates);
    }

    if (candidates.length === 0) {
      // No matches - unresolved
      return {
        ...link,
        resolvedNodeId: null,
        ambiguous: false,
        candidates: [],
      };
    }

    if (candidates.length === 1) {
      // Single match - resolved
      return {
        ...link,
        resolvedNodeId: candidates[0]?.nodeId ?? null,
        ambiguous: false,
        candidates: [candidates[0]?.nodeId ?? ''],
      };
    }

    // Multiple matches - ambiguous
    // Try to disambiguate by exact title match
    const exactMatch = candidates.find((c) => targetsMatch(c.title, normalizedTarget));

    if (exactMatch) {
      return {
        ...link,
        resolvedNodeId: exactMatch.nodeId,
        ambiguous: false,
        candidates: candidates.map((c) => c.nodeId),
      };
    }

    // Still ambiguous
    return {
      ...link,
      resolvedNodeId: null,
      ambiguous: true,
      candidates: candidates.map((c) => c.nodeId),
    };
  }

  /**
   * Resolve multiple wikilinks
   */
  async resolveLinks(links: WikiLink[]): Promise<ResolutionResult> {
    const resolved: ResolvedLink[] = [];
    const unresolved: WikiLink[] = [];
    const ambiguous: WikiLink[] = [];

    for (const link of links) {
      const result = await this.resolveLink(link);

      if (result.ambiguous) {
        ambiguous.push(link);
      } else if (result.resolvedNodeId === null) {
        unresolved.push(link);
      }

      resolved.push(result);
    }

    return { resolved, unresolved, ambiguous };
  }

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need to track this separately
    };
  }
}

/**
 * Create a link resolver with repository functions
 */
export function createLinkResolver(nodeRepository: {
  findByTitle: (title: string) => Promise<Node[]>;
  findById: (nodeId: string) => Promise<Node | null>;
  findByTitleOrAlias: (text: string) => Promise<Node[]>;
}): LinkResolver {
  return new LinkResolver({
    findByTitle: nodeRepository.findByTitle.bind(nodeRepository),
    findById: nodeRepository.findById.bind(nodeRepository),
    findByTitleOrAlias: nodeRepository.findByTitleOrAlias.bind(nodeRepository),
  });
}

/**
 * Simple in-memory resolver for testing or single-file parsing
 */
export class InMemoryLinkResolver {
  private nodesByTitle: Map<string, Node[]> = new Map();
  private nodesById: Map<string, Node> = new Map();
  private nodesByAlias: Map<string, Node[]> = new Map();

  /**
   * Add a node to the resolver
   */
  addNode(node: Node, aliases: string[] = []): void {
    this.nodesById.set(node.nodeId, node);

    // Index by title
    const titleLower = node.title.toLowerCase();
    const titleNodes = this.nodesByTitle.get(titleLower) || [];
    titleNodes.push(node);
    this.nodesByTitle.set(titleLower, titleNodes);

    // Index by aliases
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      const aliasNodes = this.nodesByAlias.get(aliasLower) || [];
      aliasNodes.push(node);
      this.nodesByAlias.set(aliasLower, aliasNodes);
    }
  }

  /**
   * Resolve a wikilink
   */
  resolveLink(link: WikiLink): ResolvedLink {
    // Case 1: Direct ID reference
    if (link.isIdLink) {
      const node = this.nodesById.get(link.target);
      return {
        ...link,
        resolvedNodeId: node?.nodeId ?? null,
        ambiguous: false,
        candidates: node ? [node.nodeId] : [],
      };
    }

    // Case 2: Title/alias resolution
    const normalized = normalizeTarget(link.target).toLowerCase();

    // Find by title
    const titleMatches = this.nodesByTitle.get(normalized) || [];

    // Find by alias
    const aliasMatches = this.nodesByAlias.get(normalized) || [];

    // Combine and deduplicate
    const candidateMap = new Map<string, Node>();
    for (const node of [...titleMatches, ...aliasMatches]) {
      candidateMap.set(node.nodeId, node);
    }

    const candidates = Array.from(candidateMap.values());

    if (candidates.length === 0) {
      return {
        ...link,
        resolvedNodeId: null,
        ambiguous: false,
        candidates: [],
      };
    }

    if (candidates.length === 1) {
      return {
        ...link,
        resolvedNodeId: candidates[0]?.nodeId ?? null,
        ambiguous: false,
        candidates: [candidates[0]?.nodeId ?? ''],
      };
    }

    // Try exact title match for disambiguation
    const exactMatch = candidates.find((c) => targetsMatch(c.title, link.target));

    if (exactMatch) {
      return {
        ...link,
        resolvedNodeId: exactMatch.nodeId,
        ambiguous: false,
        candidates: candidates.map((c) => c.nodeId),
      };
    }

    return {
      ...link,
      resolvedNodeId: null,
      ambiguous: true,
      candidates: candidates.map((c) => c.nodeId),
    };
  }

  /**
   * Clear all indexed nodes
   */
  clear(): void {
    this.nodesByTitle.clear();
    this.nodesById.clear();
    this.nodesByAlias.clear();
  }
}
