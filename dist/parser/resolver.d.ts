import type { WikiLink, ResolvedLink, Node } from '../core/types/index.js';
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
export declare class LinkResolver {
    private options;
    private cache;
    constructor(options: LinkResolverOptions);
    /**
     * Resolve a single wikilink
     */
    resolveLink(link: WikiLink): Promise<ResolvedLink>;
    /**
     * Resolve multiple wikilinks
     */
    resolveLinks(links: WikiLink[]): Promise<ResolutionResult>;
    /**
     * Clear the resolution cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hits: number;
    };
}
/**
 * Create a link resolver with repository functions
 */
export declare function createLinkResolver(nodeRepository: {
    findByTitle: (title: string) => Promise<Node[]>;
    findById: (nodeId: string) => Promise<Node | null>;
    findByTitleOrAlias: (text: string) => Promise<Node[]>;
}): LinkResolver;
/**
 * Simple in-memory resolver for testing or single-file parsing
 */
export declare class InMemoryLinkResolver {
    private nodesByTitle;
    private nodesById;
    private nodesByAlias;
    /**
     * Add a node to the resolver
     */
    addNode(node: Node, aliases?: string[]): void;
    /**
     * Resolve a wikilink
     */
    resolveLink(link: WikiLink): ResolvedLink;
    /**
     * Clear all indexed nodes
     */
    clear(): void;
}
//# sourceMappingURL=resolver.d.ts.map