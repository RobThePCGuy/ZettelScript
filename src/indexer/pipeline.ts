import type { Node, Edge, WikiLink, NodeType } from '../core/types/index.js';
import { parseMarkdown, type ParsedMarkdown } from '../parser/markdown.js';
import { createLinkResolver, type LinkResolver } from '../parser/resolver.js';
import type { FileInfo } from '../storage/filesystem/reader.js';
import {
  NodeRepository,
  EdgeRepository,
  VersionRepository,
} from '../storage/database/repositories/index.js';

export interface IndexingResult {
  node: Node;
  links: Array<{
    wikilink: WikiLink;
    targetNodeId: string | null;
    ambiguous: boolean;
  }>;
  edges: Edge[];
  unresolved: WikiLink[];
  ambiguous: WikiLink[];
}

export interface BatchIndexingResult {
  indexed: IndexingResult[];
  errors: Array<{ path: string; error: string }>;
  stats: {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    nodeCount: number;
    edgeCount: number;
    unresolvedCount: number;
    ambiguousCount: number;
    durationMs: number;
  };
}

export interface IndexerOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  versionRepository: VersionRepository;
}

/**
 * Main indexing pipeline
 */
export class IndexingPipeline {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private versionRepo: VersionRepository;
  private resolver: LinkResolver | null = null;

  constructor(options: IndexerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.versionRepo = options.versionRepository;
  }

  /**
   * Initialize the link resolver
   */
  private async getResolver(): Promise<LinkResolver> {
    if (!this.resolver) {
      this.resolver = createLinkResolver(this.nodeRepo);
    }
    return this.resolver;
  }

  /**
   * Clear resolver cache (call after batch operations)
   */
  clearResolverCache(): void {
    if (this.resolver) {
      this.resolver.clearCache();
    }
  }

  /**
   * Index a single file
   */
  async indexFile(file: FileInfo): Promise<IndexingResult> {
    // Parse the markdown
    const parsed = parseMarkdown(file.content, file.relativePath);

    // Create or update the node
    const node = await this.upsertNode(file, parsed);

    // Create version if content changed
    await this.createVersionIfNeeded(node, file.contentHash);

    // Update aliases
    await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);

    // Resolve links and create edges
    const { links, edges, unresolved, ambiguous } = await this.processLinks(node, parsed.links);

    return { node, links, edges, unresolved, ambiguous };
  }

  /**
   * Create or update a node from file info
   */
  private async upsertNode(file: FileInfo, parsed: ParsedMarkdown): Promise<Node> {
    const existing = await this.nodeRepo.findByPath(file.relativePath);

    const nodeData = {
      type: parsed.type as NodeType,
      title: parsed.title,
      path: file.relativePath,
      createdAt: existing?.createdAt || file.stats.createdAt.toISOString(),
      updatedAt: file.stats.modifiedAt.toISOString(),
      contentHash: file.contentHash,
      ...(parsed.frontmatter && { metadata: { ...parsed.frontmatter } }),
    };

    if (existing) {
      return this.nodeRepo.update(existing.nodeId, nodeData);
    }

    return this.nodeRepo.create(nodeData);
  }

  /**
   * Create a version entry if content has changed
   */
  private async createVersionIfNeeded(node: Node, contentHash: string): Promise<void> {
    const latestVersion = await this.versionRepo.findLatest(node.nodeId);

    if (latestVersion?.contentHash === contentHash) {
      return; // No change
    }

    await this.versionRepo.create({
      nodeId: node.nodeId,
      contentHash,
      ...(latestVersion?.versionId && { parentVersionId: latestVersion.versionId }),
    });
  }

  /**
   * Process wikilinks and create edges
   */
  private async processLinks(
    sourceNode: Node,
    wikilinks: WikiLink[]
  ): Promise<{
    links: IndexingResult['links'];
    edges: Edge[];
    unresolved: WikiLink[];
    ambiguous: WikiLink[];
  }> {
    const resolver = await this.getResolver();

    // Delete existing explicit_link edges from this source
    await this.edgeRepo.deleteBySourceAndType(sourceNode.nodeId, 'explicit_link');

    const links: IndexingResult['links'] = [];
    const edges: Edge[] = [];
    const unresolved: WikiLink[] = [];
    const ambiguous: WikiLink[] = [];

    for (const wikilink of wikilinks) {
      const resolved = await resolver.resolveLink(wikilink);

      links.push({
        wikilink,
        targetNodeId: resolved.resolvedNodeId,
        ambiguous: resolved.ambiguous,
      });

      if (resolved.ambiguous) {
        ambiguous.push(wikilink);
      } else if (resolved.resolvedNodeId === null) {
        unresolved.push(wikilink);
      } else {
        // Create edge
        const edge = await this.edgeRepo.create({
          sourceId: sourceNode.nodeId,
          targetId: resolved.resolvedNodeId,
          edgeType: 'explicit_link',
          provenance: 'explicit',
          attributes: {
            displayText: wikilink.display,
            position: { start: wikilink.start, end: wikilink.end },
          },
        });
        edges.push(edge);
      }
    }

    return { links, edges, unresolved, ambiguous };
  }

  /**
   * Two-pass batch indexing for handling circular references
   *
   * Pass 1: Create all nodes (stubs)
   * Pass 2: Process links and create edges
   */
  async batchIndex(files: FileInfo[]): Promise<BatchIndexingResult> {
    const startTime = Date.now();
    const indexed: IndexingResult[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    // Pass 1: Create/update all nodes
    const nodeMap = new Map<string, { node: Node; parsed: ParsedMarkdown; file: FileInfo }>();

    for (const file of files) {
      try {
        const parsed = parseMarkdown(file.content, file.relativePath);
        const node = await this.upsertNode(file, parsed);
        await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);
        nodeMap.set(file.relativePath, { node, parsed, file });
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Clear resolver cache before pass 2 (new nodes are now visible)
    this.clearResolverCache();

    // Pass 2: Process links and create edges
    let totalEdges = 0;
    let totalUnresolved = 0;
    let totalAmbiguous = 0;

    for (const { node, parsed, file } of nodeMap.values()) {
      try {
        // Create version
        await this.createVersionIfNeeded(node, file.contentHash);

        // Process links
        const { links, edges, unresolved, ambiguous } = await this.processLinks(node, parsed.links);

        indexed.push({ node, links, edges, unresolved, ambiguous });
        totalEdges += edges.length;
        totalUnresolved += unresolved.length;
        totalAmbiguous += ambiguous.length;
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      indexed,
      errors,
      stats: {
        totalFiles: files.length,
        successCount: indexed.length,
        errorCount: errors.length,
        nodeCount: nodeMap.size,
        edgeCount: totalEdges,
        unresolvedCount: totalUnresolved,
        ambiguousCount: totalAmbiguous,
        durationMs,
      },
    };
  }

  /**
   * Remove a node and its edges
   */
  async removeNode(nodeId: string): Promise<void> {
    // Edges will be cascade deleted due to foreign key
    await this.nodeRepo.delete(nodeId);
    this.clearResolverCache();
  }

  /**
   * Remove a node by path
   */
  async removeByPath(path: string): Promise<void> {
    const node = await this.nodeRepo.findByPath(path);
    if (node) {
      await this.removeNode(node.nodeId);
    }
  }

  /**
   * Check if a file needs reindexing
   */
  async needsReindex(file: FileInfo): Promise<boolean> {
    const node = await this.nodeRepo.findByPath(file.relativePath);

    if (!node) {
      return true; // New file
    }

    return node.contentHash !== file.contentHash;
  }

  /**
   * Get indexing statistics
   */
  async getStats(): Promise<{
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  }> {
    const [nodeCount, edgeCount, nodesByType, edgesByType] = await Promise.all([
      this.nodeRepo.count(),
      this.edgeRepo.count(),
      this.nodeRepo.countByType(),
      this.edgeRepo.countByType(),
    ]);

    return { nodeCount, edgeCount, nodesByType, edgesByType };
  }
}
