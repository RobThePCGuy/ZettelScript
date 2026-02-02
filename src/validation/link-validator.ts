import type { Node } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';

export interface BrokenLink {
  sourceId: string;
  sourcePath: string;
  targetText: string;
  spanStart?: number;
  spanEnd?: number;
}

export interface AmbiguousLink {
  sourceId: string;
  sourcePath: string;
  targetText: string;
  candidates: string[];  // Node IDs
  candidateTitles: string[];
}

export interface LinkValidationResult {
  broken: BrokenLink[];
  ambiguous: AmbiguousLink[];
  valid: number;
  total: number;
}

export interface LinkValidatorOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
}

/**
 * Validates links in the graph
 */
export class LinkValidator {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;

  constructor(options: LinkValidatorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
  }

  /**
   * Validate all links in the graph
   */
  async validate(): Promise<LinkValidationResult> {
    const broken: BrokenLink[] = [];
    const ambiguous: AmbiguousLink[] = [];
    let valid = 0;

    // Get all nodes
    const nodes = await this.nodeRepo.findAll();
    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));

    // Get all explicit_link edges
    const edges = await this.edgeRepo.findByType('explicit_link');

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.sourceId);
      const targetNode = nodeMap.get(edge.targetId);

      if (!sourceNode) {
        // Source node missing (shouldn't happen due to FK constraints)
        continue;
      }

      if (!targetNode) {
        // Target node missing - broken link
        const attributes = edge.attributes as { displayText?: string; position?: { start: number; end: number } } | undefined;
        broken.push({
          sourceId: edge.sourceId,
          sourcePath: sourceNode.path,
          targetText: attributes?.displayText || edge.targetId,
          ...(attributes?.position?.start != null && { spanStart: attributes.position.start }),
          ...(attributes?.position?.end != null && { spanEnd: attributes.position.end }),
        });
      } else {
        valid++;
      }
    }

    // Note: Ambiguous links are tracked during indexing, not in edges
    // They would be stored separately if we wanted to validate them

    return {
      broken,
      ambiguous,
      valid,
      total: edges.length,
    };
  }

  /**
   * Validate links for a specific node
   */
  async validateNode(nodeId: string): Promise<{
    broken: BrokenLink[];
    valid: number;
  }> {
    const broken: BrokenLink[] = [];
    let valid = 0;

    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      return { broken, valid: 0 };
    }

    const edges = await this.edgeRepo.findOutgoing(nodeId, ['explicit_link']);

    for (const edge of edges) {
      const targetNode = await this.nodeRepo.findById(edge.targetId);

      if (!targetNode) {
        const attributes = edge.attributes as { displayText?: string; position?: { start: number; end: number } } | undefined;
        broken.push({
          sourceId: nodeId,
          sourcePath: node.path,
          targetText: attributes?.displayText || edge.targetId,
          ...(attributes?.position?.start != null && { spanStart: attributes.position.start }),
          ...(attributes?.position?.end != null && { spanEnd: attributes.position.end }),
        });
      } else {
        valid++;
      }
    }

    return { broken, valid };
  }

  /**
   * Find all nodes that link to a given node
   */
  async findLinkers(targetNodeId: string): Promise<Node[]> {
    const edges = await this.edgeRepo.findBacklinks(targetNodeId);
    const sourceIds = edges.map(e => e.sourceId);
    return this.nodeRepo.findByIds(sourceIds);
  }

  /**
   * Check if a link would create a cycle
   */
  async wouldCreateCycle(
    sourceId: string,
    targetId: string,
    maxDepth: number = 10
  ): Promise<boolean> {
    // BFS from target to see if we can reach source
    const visited = new Set<string>([targetId]);
    let frontier = [targetId];

    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const nextFrontier: string[] = [];

      for (const nodeId of frontier) {
        const outgoing = await this.edgeRepo.findOutgoing(nodeId, ['explicit_link']);

        for (const edge of outgoing) {
          if (edge.targetId === sourceId) {
            return true; // Found cycle
          }

          if (!visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            nextFrontier.push(edge.targetId);
          }
        }
      }

      frontier = nextFrontier;
    }

    return false;
  }

  /**
   * Get link statistics
   */
  async getStats(): Promise<{
    totalNodes: number;
    totalLinks: number;
    avgLinksPerNode: number;
    nodesWithNoLinks: number;
    nodesWithNoIncoming: number;
    nodesWithNoOutgoing: number;
  }> {
    const nodes = await this.nodeRepo.findAll();
    const edges = await this.edgeRepo.findByType('explicit_link');

    // Count links per node
    const outgoingCount = new Map<string, number>();
    const incomingCount = new Map<string, number>();

    for (const edge of edges) {
      outgoingCount.set(edge.sourceId, (outgoingCount.get(edge.sourceId) || 0) + 1);
      incomingCount.set(edge.targetId, (incomingCount.get(edge.targetId) || 0) + 1);
    }

    let nodesWithNoLinks = 0;
    let nodesWithNoIncoming = 0;
    let nodesWithNoOutgoing = 0;

    for (const node of nodes) {
      const out = outgoingCount.get(node.nodeId) || 0;
      const inc = incomingCount.get(node.nodeId) || 0;

      if (out === 0 && inc === 0) nodesWithNoLinks++;
      if (inc === 0) nodesWithNoIncoming++;
      if (out === 0) nodesWithNoOutgoing++;
    }

    return {
      totalNodes: nodes.length,
      totalLinks: edges.length,
      avgLinksPerNode: nodes.length > 0 ? edges.length / nodes.length : 0,
      nodesWithNoLinks,
      nodesWithNoIncoming,
      nodesWithNoOutgoing,
    };
  }
}
