import type { Node, Chunk, Frontmatter } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository, ChunkRepository } from '../../storage/database/repositories/index.js';
import { SceneGraph } from './scene-graph.js';
import { CharacterTracker } from './character-tracker.js';

export interface PovFilterOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  chunkRepository: ChunkRepository;
  sceneGraph: SceneGraph;
  characterTracker: CharacterTracker;
}

export interface FilteredContent {
  chunks: Chunk[];
  nodes: Node[];
  filtered: Array<{
    nodeId: string;
    reason: string;
  }>;
}

/**
 * Filters content based on POV visibility rules
 * Following spec 11.4:
 * - Node is in/before target scene chronologically AND
 *   - Has participation edge to POV character, OR
 *   - Has pov_visible_to edge to POV character, OR
 *   - Is narrator-visible (if configured)
 */
export class PovFilter {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private chunkRepo: ChunkRepository;
  private sceneGraph: SceneGraph;
  private characterTracker: CharacterTracker;

  constructor(options: PovFilterOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.chunkRepo = options.chunkRepository;
    this.sceneGraph = options.sceneGraph;
    this.characterTracker = options.characterTracker;
  }

  /**
   * Filter content visible to a POV character at a specific scene
   */
  async filterForPov(
    povCharacter: string,
    atSceneNodeId: string,
    content: { chunks: Chunk[]; nodes: Node[] }
  ): Promise<FilteredContent> {
    const scene = this.sceneGraph.getScene(atSceneNodeId);
    if (!scene) {
      return { ...content, filtered: [] };
    }

    const visibleChunks: Chunk[] = [];
    const visibleNodes: Node[] = [];
    const filtered: Array<{ nodeId: string; reason: string }> = [];

    // Check each node
    const checkedNodes = new Set<string>();

    for (const node of content.nodes) {
      if (checkedNodes.has(node.nodeId)) continue;
      checkedNodes.add(node.nodeId);

      const { visible, reason } = await this.isVisibleToPov(
        node,
        povCharacter,
        scene.sceneOrder
      );

      if (visible) {
        visibleNodes.push(node);
      } else {
        filtered.push({ nodeId: node.nodeId, reason });
      }
    }

    // Filter chunks based on visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(n => n.nodeId));
    for (const chunk of content.chunks) {
      if (visibleNodeIds.has(chunk.nodeId)) {
        visibleChunks.push(chunk);
      }
    }

    return {
      chunks: visibleChunks,
      nodes: visibleNodes,
      filtered,
    };
  }

  /**
   * Check if a node is visible to a POV character
   */
  private async isVisibleToPov(
    node: Node,
    povCharacter: string,
    atSceneOrder: number
  ): Promise<{ visible: boolean; reason: string }> {
    // Scene nodes - must be before or at current scene
    if (node.type === 'scene') {
      const metadata = node.metadata as Frontmatter | undefined;
      const nodeOrder = metadata?.scene_order ?? Infinity;

      if (nodeOrder > atSceneOrder) {
        return { visible: false, reason: 'Future scene' };
      }

      // Check if POV was present in that scene
      const characters = metadata?.characters ?? [];
      const scenePov = metadata?.pov;

      if (characters.includes(povCharacter) || scenePov === povCharacter) {
        return { visible: true, reason: 'Present in scene' };
      }

      return { visible: false, reason: 'POV not present in scene' };
    }

    // Character knowledge check
    if (this.characterTracker.knowsAbout(povCharacter, node.nodeId, atSceneOrder)) {
      return { visible: true, reason: 'Character knows' };
    }

    // Check for explicit visibility edges
    const visibilityEdges = await this.edgeRepo.findIncoming(node.nodeId, ['pov_visible_to']);
    for (const edge of visibilityEdges) {
      const sourceNode = await this.nodeRepo.findById(edge.sourceId);
      if (sourceNode?.title === povCharacter) {
        return { visible: true, reason: 'Explicit visibility' };
      }
    }

    // Check for participation edges
    const participationEdges = await this.edgeRepo.findConnected(node.nodeId, ['participation']);
    for (const edge of participationEdges) {
      const otherId = edge.sourceId === node.nodeId ? edge.targetId : edge.sourceId;
      const otherNode = await this.nodeRepo.findById(otherId);
      if (otherNode?.title === povCharacter) {
        return { visible: true, reason: 'Participation' };
      }
    }

    // Default: visible (general knowledge, narrator-visible)
    // This could be made configurable
    const generallyVisible = ['concept', 'location', 'moc', 'timeline'];
    if (generallyVisible.includes(node.type)) {
      return { visible: true, reason: 'General knowledge' };
    }

    return { visible: false, reason: 'Unknown to POV' };
  }

  /**
   * Get all content visible to a POV at a scene
   */
  async getVisibleContent(
    povCharacter: string,
    atSceneNodeId: string
  ): Promise<FilteredContent> {
    const scene = this.sceneGraph.getScene(atSceneNodeId);
    if (!scene) {
      return { chunks: [], nodes: [], filtered: [] };
    }

    // Get all scenes before this one
    const previousScenes = this.sceneGraph.getScenesBefore(scene.sceneOrder);

    // Collect all nodes from those scenes
    const relevantNodeIds = new Set<string>();
    for (const prevScene of previousScenes) {
      relevantNodeIds.add(prevScene.nodeId);

      // Get linked nodes
      const links = await this.edgeRepo.findOutgoing(prevScene.nodeId);
      for (const link of links) {
        relevantNodeIds.add(link.targetId);
      }
    }

    // Fetch nodes
    const nodes = await this.nodeRepo.findByIds(Array.from(relevantNodeIds));

    // Fetch chunks
    const chunks: Chunk[] = [];
    for (const nodeId of relevantNodeIds) {
      const nodeChunks = await this.chunkRepo.findByNodeId(nodeId);
      chunks.push(...nodeChunks);
    }

    return this.filterForPov(povCharacter, atSceneNodeId, { chunks, nodes });
  }

  /**
   * Check for POV consistency in a scene
   */
  async checkPovConsistency(sceneNodeId: string): Promise<Array<{
    type: 'error' | 'warning';
    message: string;
    nodeId?: string;
  }>> {
    const issues: Array<{ type: 'error' | 'warning'; message: string; nodeId?: string }> = [];

    const scene = this.sceneGraph.getScene(sceneNodeId);
    if (!scene) {
      issues.push({ type: 'error', message: 'Scene not found' });
      return issues;
    }

    if (!scene.pov) {
      issues.push({ type: 'warning', message: 'Scene has no POV character' });
      return issues;
    }

    // Get all links from this scene
    const links = await this.edgeRepo.findOutgoing(sceneNodeId);

    for (const link of links) {
      const targetNode = await this.nodeRepo.findById(link.targetId);
      if (!targetNode) continue;

      const { visible, reason } = await this.isVisibleToPov(
        targetNode,
        scene.pov,
        scene.sceneOrder
      );

      if (!visible) {
        issues.push({
          type: 'error',
          message: `POV "${scene.pov}" references "${targetNode.title}" but shouldn't know about it: ${reason}`,
          nodeId: targetNode.nodeId,
        });
      }
    }

    return issues;
  }
}
