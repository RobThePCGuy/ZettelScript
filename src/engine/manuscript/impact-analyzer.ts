import type { ImpactAnalysis, Frontmatter, ZettelScriptConfig } from '../../core/types/index.js';
import { DEFAULT_CONFIG } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import { GraphEngine } from '../../core/graph/engine.js';

export interface ImpactAnalyzerOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  graphEngine: GraphEngine;
  config?: ZettelScriptConfig;
}

/**
 * Analyzes the impact of changes to a scene
 */
export class ImpactAnalyzer {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private graphEngine: GraphEngine;
  private config: ZettelScriptConfig;

  constructor(options: ImpactAnalyzerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.graphEngine = options.graphEngine;
    this.config = options.config ?? DEFAULT_CONFIG;
  }

  /**
   * Analyze the impact of modifying a scene
   */
  async analyze(sceneNodeId: string): Promise<ImpactAnalysis> {
    const scene = await this.nodeRepo.findById(sceneNodeId);
    if (!scene) {
      return {
        directImpact: [],
        transitiveImpact: [],
        povImpact: [],
        timelineImpact: [],
        characterImpact: [],
      };
    }

    const metadata = scene.metadata as Frontmatter | undefined;

    // Direct impact: nodes directly linked to this scene
    const directImpact = await this.getDirectImpact(sceneNodeId);

    // Transitive impact: nodes reachable via graph expansion
    const transitiveImpact = await this.getTransitiveImpact(sceneNodeId, directImpact);

    // POV impact: other scenes with the same POV
    const povImpact = metadata?.pov ? await this.getPovImpact(metadata.pov, sceneNodeId) : [];

    // Timeline impact: adjacent scenes in timeline
    const timelineImpact =
      metadata?.scene_order !== undefined
        ? await this.getTimelineImpact(metadata.scene_order, sceneNodeId)
        : [];

    // Character impact: characters whose knowledge might change
    const characterImpact = await this.getCharacterImpact(sceneNodeId, metadata);

    return {
      directImpact,
      transitiveImpact,
      povImpact,
      timelineImpact,
      characterImpact,
    };
  }

  /**
   * Get directly linked nodes
   */
  private async getDirectImpact(nodeId: string): Promise<string[]> {
    const outgoing = await this.edgeRepo.findOutgoing(nodeId);
    const incoming = await this.edgeRepo.findIncoming(nodeId);

    const impacted = new Set<string>();

    for (const edge of outgoing) {
      impacted.add(edge.targetId);
    }

    for (const edge of incoming) {
      impacted.add(edge.sourceId);
    }

    return Array.from(impacted);
  }

  /**
   * Get transitively impacted nodes via graph expansion
   */
  private async getTransitiveImpact(nodeId: string, directImpact: string[]): Promise<string[]> {
    const expansion = await this.graphEngine.expandGraph({
      seedNodes: [{ nodeId, score: 1 }],
      maxDepth: this.config.impact.maxTransitiveDepth,
      budget: this.config.impact.maxTransitiveBudget,
      includeIncoming: true,
    });

    const directSet = new Set(directImpact);
    directSet.add(nodeId);

    // Return nodes that are transitively reachable but not direct
    return expansion.filter((e) => e.depth > 1 && !directSet.has(e.nodeId)).map((e) => e.nodeId);
  }

  /**
   * Get scenes with the same POV character
   */
  private async getPovImpact(povCharacter: string, excludeNodeId: string): Promise<string[]> {
    const scenes = await this.nodeRepo.findByType('scene');

    return scenes
      .filter((s) => {
        const meta = s.metadata as Frontmatter | undefined;
        return meta?.pov === povCharacter && s.nodeId !== excludeNodeId;
      })
      .map((s) => s.nodeId);
  }

  /**
   * Get adjacent scenes in the timeline
   */
  private async getTimelineImpact(sceneOrder: number, excludeNodeId: string): Promise<string[]> {
    const scenes = await this.nodeRepo.findByType('scene');

    // Get scenes within configured range of the current scene order
    const range = this.config.impact.timelineRange;
    return scenes
      .filter((s) => {
        const meta = s.metadata as Frontmatter | undefined;
        const order = meta?.scene_order;
        if (order === undefined || s.nodeId === excludeNodeId) return false;
        return Math.abs(order - sceneOrder) <= range;
      })
      .map((s) => s.nodeId);
  }

  /**
   * Get characters whose knowledge might be affected
   */
  private async getCharacterImpact(
    sceneNodeId: string,
    metadata: Frontmatter | undefined
  ): Promise<string[]> {
    const characters = new Set<string>();

    // POV character
    if (metadata?.pov) {
      characters.add(metadata.pov);
    }

    // Characters listed in scene
    if (metadata?.characters) {
      for (const char of metadata.characters) {
        characters.add(char);
      }
    }

    // Characters linked from the scene
    const links = await this.edgeRepo.findOutgoing(sceneNodeId);
    for (const link of links) {
      const targetNode = await this.nodeRepo.findById(link.targetId);
      if (targetNode?.type === 'character') {
        characters.add(targetNode.title);
      }
    }

    return Array.from(characters);
  }

  /**
   * Get detailed impact report
   */
  async getDetailedReport(sceneNodeId: string): Promise<{
    impact: ImpactAnalysis;
    summary: {
      totalAffected: number;
      directCount: number;
      transitiveCount: number;
      characterCount: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    recommendations: string[];
  }> {
    const impact = await this.analyze(sceneNodeId);

    const totalAffected = new Set([
      ...impact.directImpact,
      ...impact.transitiveImpact,
      ...impact.povImpact,
      ...impact.timelineImpact,
    ]).size;

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalAffected > 20 || impact.characterImpact.length > 5) {
      riskLevel = 'high';
    } else if (totalAffected > 10 || impact.characterImpact.length > 3) {
      riskLevel = 'medium';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (impact.povImpact.length > 3) {
      recommendations.push('Review other scenes with the same POV for consistency');
    }

    if (impact.timelineImpact.length > 5) {
      recommendations.push('Check timeline continuity with adjacent scenes');
    }

    if (impact.characterImpact.length > 0) {
      recommendations.push(
        `Verify character knowledge for: ${impact.characterImpact.slice(0, 3).join(', ')}`
      );
    }

    if (impact.transitiveImpact.length > 10) {
      recommendations.push('Large transitive impact - consider breaking change into smaller edits');
    }

    return {
      impact,
      summary: {
        totalAffected,
        directCount: impact.directImpact.length,
        transitiveCount: impact.transitiveImpact.length,
        characterCount: impact.characterImpact.length,
        riskLevel,
      },
      recommendations,
    };
  }
}
