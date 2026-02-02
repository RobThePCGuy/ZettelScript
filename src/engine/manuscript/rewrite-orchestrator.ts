import type { Node, ImpactAnalysis, Frontmatter, ZettelScriptConfig } from '../../core/types/index.js';
import { DEFAULT_CONFIG } from '../../core/types/index.js';
import { NodeRepository } from '../../storage/database/repositories/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RewriteContext {
  sceneContent: string;
  sceneMetadata: Frontmatter | null;
  goal: string;
  characterContext: Array<{ name: string; description: string; role: string }>;
  timelineContext: Array<{ title: string; order: number; summary: string }>;
  relatedContent: Array<{ title: string; type: string; excerpt: string }>;
  constraints: string[];
}

export interface RewriteOrchestratorOptions {
  nodeRepository: NodeRepository;
  impact: ImpactAnalysis;
  vaultPath?: string;
  config?: ZettelScriptConfig;
}

/**
 * Orchestrates scene rewrites by gathering context and managing constraints
 */
export class RewriteOrchestrator {
  private nodeRepo: NodeRepository;
  private impact: ImpactAnalysis;
  private vaultPath: string;
  private config: ZettelScriptConfig;

  constructor(options: RewriteOrchestratorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.impact = options.impact;
    this.vaultPath = options.vaultPath || process.cwd();
    this.config = options.config ?? DEFAULT_CONFIG;
  }

  /**
   * Gather all context needed for a rewrite
   */
  async gatherContext(sceneNodeId: string, goal: string): Promise<RewriteContext> {
    const scene = await this.nodeRepo.findById(sceneNodeId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneNodeId}`);
    }

    // Read scene content
    const sceneContent = await this.readNodeContent(scene);
    const sceneMetadata = scene.metadata as Frontmatter | null;

    // Gather character context
    const characterContext = await this.gatherCharacterContext(sceneNodeId, sceneMetadata);

    // Gather timeline context
    const timelineContext = await this.gatherTimelineContext(sceneMetadata?.scene_order);

    // Gather related content
    const relatedContent = await this.gatherRelatedContent(sceneNodeId);

    // Build constraints
    const constraints = this.buildConstraints(sceneMetadata);

    return {
      sceneContent,
      sceneMetadata,
      goal,
      characterContext,
      timelineContext,
      relatedContent,
      constraints,
    };
  }

  /**
   * Read content from a node's file
   */
  private async readNodeContent(node: Node): Promise<string> {
    const filePath = path.join(this.vaultPath, node.path);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Gather context about characters in the scene
   */
  private async gatherCharacterContext(
    _sceneNodeId: string,
    sceneMetadata: Frontmatter | null
  ): Promise<RewriteContext['characterContext']> {
    const context: RewriteContext['characterContext'] = [];
    const characterNames = new Set<string>();

    // POV character
    if (sceneMetadata?.pov) {
      characterNames.add(sceneMetadata.pov);
    }

    // Listed characters
    if (sceneMetadata?.characters) {
      for (const char of sceneMetadata.characters) {
        characterNames.add(char);
      }
    }

    // Characters from impact analysis
    for (const charName of this.impact.characterImpact) {
      characterNames.add(charName);
    }

    // Fetch character nodes
    for (const charName of characterNames) {
      const nodes = await this.nodeRepo.findByTitle(charName);
      const charNode = nodes.find(n => n.type === 'character');

      if (charNode) {
        const charMeta = charNode.metadata as { description?: string } | undefined;
        const content = await this.readNodeContent(charNode);

        // Extract first paragraph as description
        const firstPara = content.split('\n\n')[1]?.trim() || charMeta?.description || '';

        context.push({
          name: charNode.title,
          description: firstPara.slice(0, 500),
          role: sceneMetadata?.pov === charName ? 'POV' : 'present',
        });
      }
    }

    return context;
  }

  /**
   * Gather context about adjacent scenes in timeline
   */
  private async gatherTimelineContext(
    sceneOrder: number | undefined
  ): Promise<RewriteContext['timelineContext']> {
    if (sceneOrder === undefined) return [];

    const context: RewriteContext['timelineContext'] = [];
    const scenes = await this.nodeRepo.findByType('scene');

    // Get scenes within configured range of current (use half of impact range for context)
    const range = Math.ceil(this.config.impact.timelineRange / 2);
    const adjacentScenes = scenes
      .filter(s => {
        const meta = s.metadata as Frontmatter | undefined;
        const order = meta?.scene_order;
        return order !== undefined && Math.abs(order - sceneOrder) <= range && order !== sceneOrder;
      })
      .sort((a, b) => {
        const orderA = (a.metadata as Frontmatter | undefined)?.scene_order ?? 0;
        const orderB = (b.metadata as Frontmatter | undefined)?.scene_order ?? 0;
        return orderA - orderB;
      });

    for (const scene of adjacentScenes) {
      const meta = scene.metadata as Frontmatter | undefined;
      const content = await this.readNodeContent(scene);

      // Extract summary (first paragraph after frontmatter)
      const parts = content.split('---');
      const body = parts.length > 2 ? parts.slice(2).join('---') : content;
      const summary = body.trim().split('\n\n')[0]?.slice(0, 300) || '';

      context.push({
        title: scene.title,
        order: meta?.scene_order ?? 0,
        summary,
      });
    }

    return context;
  }

  /**
   * Gather related content from direct links
   */
  private async gatherRelatedContent(
    _sceneNodeId: string
  ): Promise<RewriteContext['relatedContent']> {
    const content: RewriteContext['relatedContent'] = [];

    // Get directly linked nodes (excluding characters, handled separately)
    const directIds = this.impact.directImpact;
    const nodes = await this.nodeRepo.findByIds(directIds);

    for (const node of nodes.slice(0, 10)) { // Limit to 10
      if (node.type === 'character') continue;

      const nodeContent = await this.readNodeContent(node);
      const excerpt = nodeContent.trim().slice(0, 300);

      content.push({
        title: node.title,
        type: node.type,
        excerpt,
      });
    }

    return content;
  }

  /**
   * Build constraints based on metadata and impact
   */
  private buildConstraints(sceneMetadata: Frontmatter | null): string[] {
    const constraints: string[] = [];

    if (sceneMetadata?.pov) {
      constraints.push(`Maintain POV: ${sceneMetadata.pov} - only reveal information they would know`);
    }

    if (sceneMetadata?.scene_order !== undefined) {
      constraints.push(`Timeline position: Scene ${sceneMetadata.scene_order} - maintain continuity with adjacent scenes`);
    }

    if (sceneMetadata?.locations?.length) {
      constraints.push(`Location: ${sceneMetadata.locations.join(', ')}`);
    }

    if (this.impact.characterImpact.length > 0) {
      constraints.push(`Characters to consider: ${this.impact.characterImpact.join(', ')}`);
    }

    if (this.impact.povImpact.length > 5) {
      constraints.push('This POV appears in many scenes - maintain character voice consistency');
    }

    return constraints;
  }

  /**
   * Format context for LLM prompt
   */
  formatContextForPrompt(context: RewriteContext): string {
    const sections: string[] = [];

    // Goal
    sections.push(`## Rewrite Goal\n\n${context.goal}`);

    // Constraints
    if (context.constraints.length > 0) {
      sections.push(`## Constraints\n\n${context.constraints.map(c => `- ${c}`).join('\n')}`);
    }

    // Characters
    if (context.characterContext.length > 0) {
      const charSection = context.characterContext.map(c =>
        `### ${c.name} (${c.role})\n\n${c.description}`
      ).join('\n\n');
      sections.push(`## Characters\n\n${charSection}`);
    }

    // Timeline
    if (context.timelineContext.length > 0) {
      const timelineSection = context.timelineContext.map(t =>
        `### Scene ${t.order}: ${t.title}\n\n${t.summary}`
      ).join('\n\n');
      sections.push(`## Timeline Context\n\n${timelineSection}`);
    }

    // Related content
    if (context.relatedContent.length > 0) {
      const relatedSection = context.relatedContent.map(r =>
        `### ${r.title} (${r.type})\n\n${r.excerpt}`
      ).join('\n\n');
      sections.push(`## Related Content\n\n${relatedSection}`);
    }

    // Current scene
    sections.push(`## Current Scene Content\n\n${context.sceneContent}`);

    return sections.join('\n\n---\n\n');
  }

  /**
   * Get a summary of the rewrite context
   */
  getContextSummary(context: RewriteContext): {
    characterCount: number;
    timelineSceneCount: number;
    relatedContentCount: number;
    constraintCount: number;
    totalContextLength: number;
  } {
    return {
      characterCount: context.characterContext.length,
      timelineSceneCount: context.timelineContext.length,
      relatedContentCount: context.relatedContent.length,
      constraintCount: context.constraints.length,
      totalContextLength: JSON.stringify(context).length,
    };
  }
}
