import type { Node, SceneInfo, Frontmatter } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';

export interface SceneNode extends SceneInfo {
  title: string;
  path: string;
}

export interface SceneGraphOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
}

/**
 * Scene graph for managing manuscript chronology
 */
export class SceneGraph {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private scenes: SceneNode[] = [];
  private scenesByOrder: Map<number, SceneNode> = new Map();
  private scenesByPov: Map<string, SceneNode[]> = new Map();

  constructor(options: SceneGraphOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
  }

  /**
   * Load all scenes and build the graph
   */
  async load(): Promise<void> {
    const sceneNodes = await this.nodeRepo.findByType('scene');

    this.scenes = sceneNodes.map((node) => this.nodeToSceneNode(node));

    // Build indexes
    this.scenesByOrder.clear();
    this.scenesByPov.clear();

    for (const scene of this.scenes) {
      if (scene.sceneOrder !== Infinity) {
        this.scenesByOrder.set(scene.sceneOrder, scene);
      }

      if (scene.pov) {
        const povScenes = this.scenesByPov.get(scene.pov) ?? [];
        povScenes.push(scene);
        this.scenesByPov.set(scene.pov, povScenes);
      }
    }
  }

  /**
   * Convert Node to SceneNode
   */
  private nodeToSceneNode(node: Node): SceneNode {
    const metadata = node.metadata as Frontmatter | undefined;

    return {
      nodeId: node.nodeId,
      title: node.title,
      path: node.path,
      sceneOrder: metadata?.scene_order ?? Infinity,
      ...(metadata?.timeline_position != null && { timelinePosition: metadata.timeline_position }),
      ...(metadata?.pov != null && { pov: metadata.pov }),
      characters: metadata?.characters ?? [],
      locations: metadata?.locations ?? [],
    };
  }

  /**
   * Get all scenes sorted by order
   */
  getScenesInOrder(): SceneNode[] {
    return [...this.scenes].sort((a, b) => a.sceneOrder - b.sceneOrder);
  }

  /**
   * Get scenes before a given scene (chronologically)
   */
  getScenesBefore(sceneOrder: number): SceneNode[] {
    return this.scenes
      .filter((s) => s.sceneOrder < sceneOrder)
      .sort((a, b) => a.sceneOrder - b.sceneOrder);
  }

  /**
   * Get scenes after a given scene (chronologically)
   */
  getScenesAfter(sceneOrder: number): SceneNode[] {
    return this.scenes
      .filter((s) => s.sceneOrder > sceneOrder && s.sceneOrder !== Infinity)
      .sort((a, b) => a.sceneOrder - b.sceneOrder);
  }

  /**
   * Get adjacent scenes (previous and next)
   */
  getAdjacentScenes(sceneOrder: number): {
    previous: SceneNode | null;
    next: SceneNode | null;
  } {
    const ordered = this.getScenesInOrder().filter((s) => s.sceneOrder !== Infinity);

    const index = ordered.findIndex((s) => s.sceneOrder === sceneOrder);

    return {
      previous: index > 0 ? (ordered[index - 1] ?? null) : null,
      next: index < ordered.length - 1 ? (ordered[index + 1] ?? null) : null,
    };
  }

  /**
   * Get scenes by POV character
   */
  getScenesByPov(povCharacter: string): SceneNode[] {
    return this.scenesByPov.get(povCharacter) ?? [];
  }

  /**
   * Get scenes where a character is present
   */
  getScenesWithCharacter(characterName: string): SceneNode[] {
    return this.scenes.filter(
      (s) => s.characters.includes(characterName) || s.pov === characterName
    );
  }

  /**
   * Get scenes at a location
   */
  getScenesAtLocation(locationName: string): SceneNode[] {
    return this.scenes.filter((s) => s.locations.includes(locationName));
  }

  /**
   * Get the POV character for a scene
   */
  getPov(sceneNodeId: string): string | null {
    const scene = this.scenes.find((s) => s.nodeId === sceneNodeId);
    return scene?.pov ?? null;
  }

  /**
   * Get scene by order number
   */
  getSceneByOrder(order: number): SceneNode | null {
    return this.scenesByOrder.get(order) ?? null;
  }

  /**
   * Get scene by node ID
   */
  getScene(nodeId: string): SceneNode | null {
    return this.scenes.find((s) => s.nodeId === nodeId) ?? null;
  }

  /**
   * Check if a node/event is visible to POV at a given scene
   * Following spec 11.4 visibility rules
   */
  async isVisibleToPov(
    informationNodeId: string,
    povCharacter: string,
    atSceneOrder: number
  ): Promise<boolean> {
    // Get the information node
    const infoNode = await this.nodeRepo.findById(informationNodeId);
    if (!infoNode) return false;

    // Check if info node is a scene - must be before current scene
    if (infoNode.type === 'scene') {
      const infoMeta = infoNode.metadata as Frontmatter | undefined;
      const infoOrder = infoMeta?.scene_order ?? Infinity;

      if (infoOrder >= atSceneOrder) {
        return false; // Can't know about future scenes
      }

      // Check if POV was present in that scene
      const infoCharacters = infoMeta?.characters ?? [];
      const infoPov = infoMeta?.pov;

      if (infoCharacters.includes(povCharacter) || infoPov === povCharacter) {
        return true;
      }
    }

    // Check for explicit pov_visible_to edges
    const visibilityEdges = await this.edgeRepo.findOutgoing(informationNodeId, ['pov_visible_to']);
    for (const edge of visibilityEdges) {
      const targetNode = await this.nodeRepo.findById(edge.targetId);
      if (targetNode?.title === povCharacter) {
        return true;
      }
    }

    // Check for participation edges
    const participationEdges = await this.edgeRepo.findOutgoing(informationNodeId, [
      'participation',
    ]);
    for (const edge of participationEdges) {
      const targetNode = await this.nodeRepo.findById(edge.targetId);
      if (targetNode?.title === povCharacter) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get timeline gaps (missing scene_order numbers)
   */
  getTimelineGaps(): Array<{ after: number; before: number; gap: number }> {
    const orders = [...this.scenesByOrder.keys()].sort((a, b) => a - b);
    const gaps: Array<{ after: number; before: number; gap: number }> = [];

    for (let i = 1; i < orders.length; i++) {
      const prev = orders[i - 1];
      const curr = orders[i];

      if (prev !== undefined && curr !== undefined) {
        const gap = curr - prev;
        if (gap > 1) {
          gaps.push({ after: prev, before: curr, gap: gap - 1 });
        }
      }
    }

    return gaps;
  }

  /**
   * Get orphan scenes (no scene_order)
   */
  getOrphanScenes(): SceneNode[] {
    return this.scenes.filter((s) => s.sceneOrder === Infinity);
  }

  /**
   * Get all unique POV characters
   */
  getPovCharacters(): string[] {
    return Array.from(this.scenesByPov.keys());
  }

  /**
   * Get all unique characters mentioned in scenes
   */
  getAllCharacters(): string[] {
    const characters = new Set<string>();

    for (const scene of this.scenes) {
      if (scene.pov) characters.add(scene.pov);
      for (const char of scene.characters) {
        characters.add(char);
      }
    }

    return Array.from(characters);
  }

  /**
   * Get all unique locations
   */
  getAllLocations(): string[] {
    const locations = new Set<string>();

    for (const scene of this.scenes) {
      for (const loc of scene.locations) {
        locations.add(loc);
      }
    }

    return Array.from(locations);
  }
}
