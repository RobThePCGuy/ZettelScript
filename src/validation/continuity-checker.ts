import type { Node, ContinuityIssue, Frontmatter, SceneInfo } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';

export interface ContinuityCheckResult {
  issues: ContinuityIssue[];
  stats: {
    scenesChecked: number;
    povIssues: number;
    timelineIssues: number;
    setupPayoffIssues: number;
    knowledgeIssues: number;
  };
}

export interface ContinuityCheckerOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  config: {
    validatePov: boolean;
    validateTimeline: boolean;
    validateSetupPayoff: boolean;
  };
}

/**
 * Checks manuscript continuity for POV, timeline, and setup/payoff consistency
 */
export class ContinuityChecker {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private config: ContinuityCheckerOptions['config'];

  constructor(options: ContinuityCheckerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.config = options.config;
  }

  /**
   * Run all continuity checks
   */
  async check(): Promise<ContinuityCheckResult> {
    const issues: ContinuityIssue[] = [];

    // Get all scenes
    const scenes = await this.nodeRepo.findByType('scene');

    if (scenes.length === 0) {
      return {
        issues: [],
        stats: {
          scenesChecked: 0,
          povIssues: 0,
          timelineIssues: 0,
          setupPayoffIssues: 0,
          knowledgeIssues: 0,
        },
      };
    }

    // Extract scene info
    const sceneInfos = scenes.map((s) => this.extractSceneInfo(s));

    // POV validation
    if (this.config.validatePov) {
      const povIssues = await this.checkPovConsistency(scenes, sceneInfos);
      issues.push(...povIssues);
    }

    // Timeline validation
    if (this.config.validateTimeline) {
      const timelineIssues = await this.checkTimelineConsistency(scenes, sceneInfos);
      issues.push(...timelineIssues);
    }

    // Setup/payoff validation
    if (this.config.validateSetupPayoff) {
      const setupPayoffIssues = await this.checkSetupPayoff(scenes);
      issues.push(...setupPayoffIssues);
    }

    return {
      issues,
      stats: {
        scenesChecked: scenes.length,
        povIssues: issues.filter((i) => i.type === 'pov_leakage').length,
        timelineIssues: issues.filter((i) => i.type === 'timeline_inconsistency').length,
        setupPayoffIssues: issues.filter(
          (i) => i.type === 'missing_setup' || i.type === 'orphaned_payoff'
        ).length,
        knowledgeIssues: issues.filter((i) => i.type === 'character_knowledge').length,
      },
    };
  }

  /**
   * Extract scene info from node metadata
   */
  private extractSceneInfo(node: Node): SceneInfo {
    const metadata = node.metadata as Frontmatter | undefined;

    return {
      nodeId: node.nodeId,
      sceneOrder: metadata?.scene_order ?? Infinity,
      ...(metadata?.timeline_position != null && { timelinePosition: metadata.timeline_position }),
      ...(metadata?.pov != null && { pov: metadata.pov }),
      characters: metadata?.characters ?? [],
      locations: metadata?.locations ?? [],
    };
  }

  /**
   * Check POV consistency - ensure POV character knows information they reveal
   */
  private async checkPovConsistency(
    scenes: Node[],
    sceneInfos: SceneInfo[]
  ): Promise<ContinuityIssue[]> {
    const issues: ContinuityIssue[] = [];

    // Sort scenes by order
    const sortedScenes = [...sceneInfos].sort((a, b) => a.sceneOrder - b.sceneOrder);

    // Track what each character knows
    const characterKnowledge = new Map<string, Set<string>>();

    for (const scene of sortedScenes) {
      const sceneNode = scenes.find((s) => s.nodeId === scene.nodeId);
      if (!sceneNode) continue;

      if (!scene.pov) {
        issues.push({
          type: 'pov_leakage',
          severity: 'warning',
          nodeId: scene.nodeId,
          description: 'Scene has no POV character defined',
          suggestion: 'Add "pov: CharacterName" to frontmatter',
        });
        continue;
      }

      // Get links from this scene to other nodes
      const outgoing = await this.edgeRepo.findOutgoing(scene.nodeId);

      for (const edge of outgoing) {
        // Check if target is a character
        const targetNode = await this.nodeRepo.findById(edge.targetId);
        if (!targetNode) continue;

        if (targetNode.type === 'character' && targetNode.title !== scene.pov) {
          // POV character is referencing another character
          // This is generally fine, but check if POV should know about them
          if (!scene.characters.includes(targetNode.title)) {
            issues.push({
              type: 'pov_leakage',
              severity: 'info',
              nodeId: scene.nodeId,
              description: `POV (${scene.pov}) references ${targetNode.title} who is not listed in scene characters`,
              suggestion: `Add "${targetNode.title}" to characters list if they are present`,
            });
          }
        }
      }

      // Update character knowledge for characters in this scene
      for (const char of scene.characters) {
        if (!characterKnowledge.has(char)) {
          characterKnowledge.set(char, new Set());
        }
        // Character now knows about events in this scene
        characterKnowledge.get(char)?.add(scene.nodeId);
      }
    }

    return issues;
  }

  /**
   * Check timeline consistency - ensure scene_order is sequential and logical
   */
  private async checkTimelineConsistency(
    scenes: Node[],
    sceneInfos: SceneInfo[]
  ): Promise<ContinuityIssue[]> {
    const issues: ContinuityIssue[] = [];

    // Check for missing scene_order
    const withoutOrder = sceneInfos.filter((s) => s.sceneOrder === Infinity);
    for (const scene of withoutOrder) {
      const sceneNode = scenes.find((s) => s.nodeId === scene.nodeId);
      issues.push({
        type: 'timeline_inconsistency',
        severity: 'warning',
        nodeId: scene.nodeId,
        description: `Scene "${sceneNode?.title}" has no scene_order`,
        suggestion: 'Add "scene_order: N" to frontmatter for timeline tracking',
      });
    }

    // Check for duplicate scene_order
    const orderCounts = new Map<number, string[]>();
    for (const scene of sceneInfos) {
      if (scene.sceneOrder !== Infinity) {
        const existing = orderCounts.get(scene.sceneOrder) || [];
        existing.push(scene.nodeId);
        orderCounts.set(scene.sceneOrder, existing);
      }
    }

    for (const [order, nodeIds] of orderCounts) {
      if (nodeIds.length > 1) {
        for (const nodeId of nodeIds) {
          const sceneNode = scenes.find((s) => s.nodeId === nodeId);
          issues.push({
            type: 'timeline_inconsistency',
            severity: 'error',
            nodeId,
            description: `Scene "${sceneNode?.title}" has duplicate scene_order ${order}`,
            suggestion: 'Ensure each scene has a unique scene_order',
          });
        }
      }
    }

    // Check for large gaps in scene_order
    const orderedScenes = sceneInfos
      .filter((s) => s.sceneOrder !== Infinity)
      .sort((a, b) => a.sceneOrder - b.sceneOrder);

    for (let i = 1; i < orderedScenes.length; i++) {
      const prev = orderedScenes[i - 1];
      const curr = orderedScenes[i];
      if (prev && curr) {
        const gap = curr.sceneOrder - prev.sceneOrder;
        if (gap > 10) {
          issues.push({
            type: 'timeline_inconsistency',
            severity: 'info',
            nodeId: curr.nodeId,
            description: `Large gap (${gap}) in scene_order between scenes`,
            suggestion: 'Consider renumbering scenes for clarity',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check setup/payoff consistency using edges
   */
  private async checkSetupPayoff(_scenes: Node[]): Promise<ContinuityIssue[]> {
    const issues: ContinuityIssue[] = [];

    // Get all setup_payoff edges
    const setupPayoffEdges = await this.edgeRepo.findByType('setup_payoff');

    // Track setups and payoffs
    const setups = new Set<string>();
    const payoffs = new Set<string>();

    for (const edge of setupPayoffEdges) {
      setups.add(edge.sourceId);
      payoffs.add(edge.targetId);
    }

    // Check for setups without payoffs
    for (const setupId of setups) {
      const hasPayoff = setupPayoffEdges.some((e) => e.sourceId === setupId);
      if (!hasPayoff) {
        const node = await this.nodeRepo.findById(setupId);
        if (node) {
          issues.push({
            type: 'orphaned_payoff',
            severity: 'warning',
            nodeId: setupId,
            description: `Setup in "${node.title}" has no linked payoff`,
            suggestion: 'Ensure this setup is resolved later in the narrative',
          });
        }
      }
    }

    // Check for payoffs without setups
    for (const payoffId of payoffs) {
      const hasSetup = setupPayoffEdges.some((e) => e.targetId === payoffId);
      if (!hasSetup) {
        const node = await this.nodeRepo.findById(payoffId);
        if (node) {
          issues.push({
            type: 'missing_setup',
            severity: 'warning',
            nodeId: payoffId,
            description: `Payoff in "${node.title}" has no linked setup`,
            suggestion: 'Ensure this payoff is properly foreshadowed earlier',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check if a character could know about something at a given scene
   */
  async canCharacterKnow(
    characterName: string,
    informationNodeId: string,
    atSceneOrder: number
  ): Promise<boolean> {
    // Get all scenes where character is present up to atSceneOrder
    const scenes = await this.nodeRepo.findByType('scene');

    for (const scene of scenes) {
      const metadata = scene.metadata as Frontmatter | undefined;
      const sceneOrder = metadata?.scene_order ?? Infinity;

      if (sceneOrder > atSceneOrder) continue;

      const characters = metadata?.characters ?? [];
      if (!characters.includes(characterName)) continue;

      // Check if this scene connects to the information
      const edges = await this.edgeRepo.findOutgoing(scene.nodeId);
      if (edges.some((e) => e.targetId === informationNodeId)) {
        return true;
      }
    }

    return false;
  }
}
