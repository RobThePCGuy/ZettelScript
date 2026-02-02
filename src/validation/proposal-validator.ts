import type { Proposal, Node } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
import * as fs from 'node:fs';

export interface ProposalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProposalValidatorOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  vaultPath: string;
}

/**
 * Validates proposals before they can be applied
 */
export class ProposalValidator {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private vaultPath: string;

  constructor(options: ProposalValidatorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.vaultPath = options.vaultPath;
  }

  /**
   * Validate a proposal
   */
  async validate(proposal: Proposal): Promise<ProposalValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check node exists
    const node = await this.nodeRepo.findById(proposal.nodeId);
    if (!node) {
      errors.push(`Target node not found: ${proposal.nodeId}`);
      return { valid: false, errors, warnings };
    }

    // Check proposal type-specific validation
    switch (proposal.type) {
      case 'content_edit':
        await this.validateContentEdit(proposal, node, errors, warnings);
        break;

      case 'link_addition':
        await this.validateLinkAddition(proposal, node, errors, warnings);
        break;

      case 'node_creation':
        await this.validateNodeCreation(proposal, errors, warnings);
        break;

      case 'node_deletion':
        await this.validateNodeDeletion(proposal, node, errors, warnings);
        break;

      case 'metadata_update':
        this.validateMetadataUpdate(proposal, node, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate content edit proposal
   */
  private async validateContentEdit(
    proposal: Proposal,
    node: Node,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const filePath = `${this.vaultPath}/${node.path}`;

    // Check file exists
    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${node.path}`);
      return;
    }

    // Check diff.before matches current content if provided
    if (proposal.diff.before) {
      const currentContent = fs.readFileSync(filePath, 'utf-8');

      // Simple check - in production, use proper diff matching
      if (!currentContent.includes(proposal.diff.before)) {
        errors.push('Content has changed since proposal was created. Please regenerate.');
      }
    }

    // Warn about large changes
    const afterLength = proposal.diff.after.length;
    if (afterLength > 10000) {
      warnings.push('Large content change (>10KB). Review carefully.');
    }
  }

  /**
   * Validate link addition proposal
   */
  private async validateLinkAddition(
    proposal: Proposal,
    _node: Node,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check target exists in the proposed link
    const linkMatch = proposal.diff.after.match(/\[\[([^\]|]+)/);
    if (!linkMatch) {
      errors.push('Invalid link format in proposal');
      return;
    }

    const targetText = linkMatch[1];
    if (!targetText) {
      errors.push('Empty link target');
      return;
    }

    // Check if target resolves
    const idMatch = targetText.match(/^id:(.+)$/);
    if (idMatch?.[1]) {
      const targetNode = await this.nodeRepo.findById(idMatch[1]);
      if (!targetNode) {
        warnings.push(`Link target not found by ID: ${idMatch[1]}`);
      }
    } else {
      const targetNodes = await this.nodeRepo.findByTitleOrAlias(targetText);
      if (targetNodes.length === 0) {
        warnings.push(`Link target may not resolve: [[${targetText}]]`);
      } else if (targetNodes.length > 1) {
        warnings.push(`Link target is ambiguous: [[${targetText}]] (${targetNodes.length} matches)`);
      }
    }
  }

  /**
   * Validate node creation proposal
   */
  private async validateNodeCreation(
    proposal: Proposal,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check path is provided in metadata
    const metadata = proposal.metadata as { path?: string } | undefined;
    if (!metadata?.path) {
      errors.push('Node creation requires path in metadata');
      return;
    }

    // Check path doesn't already exist
    const existing = await this.nodeRepo.findByPath(metadata.path);
    if (existing) {
      errors.push(`Path already exists: ${metadata.path}`);
      return;
    }

    // Check file doesn't exist
    const filePath = `${this.vaultPath}/${metadata.path}`;
    if (fs.existsSync(filePath)) {
      errors.push(`File already exists: ${metadata.path}`);
    }

    // Warn about non-standard paths
    if (!metadata.path.endsWith('.md')) {
      warnings.push('Path does not end with .md');
    }
  }

  /**
   * Validate node deletion proposal
   */
  private async validateNodeDeletion(
    proposal: Proposal,
    node: Node,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for actual backlinks to this node
    const backlinks = await this.edgeRepo.findBacklinks(node.nodeId);

    if (backlinks.length > 0) {
      // Get source node details for better error messages
      const sourceIds = backlinks.map(e => e.sourceId);
      const sourceNodes = await this.nodeRepo.findByIds(sourceIds);
      const sourceNames = sourceNodes.map(n => n.title).slice(0, 5);
      const moreCount = backlinks.length > 5 ? ` and ${backlinks.length - 5} more` : '';

      // Check if force flag is set in metadata
      const metadata = proposal.metadata as { force?: boolean } | undefined;
      if (metadata?.force) {
        warnings.push(
          `Deleting "${node.title}" will break ${backlinks.length} incoming link(s) from: ${sourceNames.join(', ')}${moreCount}`
        );
      } else {
        errors.push(
          `Cannot delete "${node.title}": ${backlinks.length} incoming link(s) would break (from: ${sourceNames.join(', ')}${moreCount}). Use force flag to override.`
        );
      }
    }

    // Check for other edge types (not just explicit_link backlinks)
    const allIncoming = await this.edgeRepo.findIncoming(node.nodeId);
    const nonBacklinks = allIncoming.filter(e => e.edgeType !== 'explicit_link');
    if (nonBacklinks.length > 0) {
      const edgeTypes = [...new Set(nonBacklinks.map(e => e.edgeType))];
      warnings.push(
        `Node has ${nonBacklinks.length} other incoming relationship(s) of type: ${edgeTypes.join(', ')}`
      );
    }

    // Check if file still exists
    const filePath = `${this.vaultPath}/${node.path}`;
    if (!fs.existsSync(filePath)) {
      warnings.push('File already deleted from filesystem');
    }
  }

  /**
   * Validate metadata update proposal
   */
  private validateMetadataUpdate(
    proposal: Proposal,
    _node: Node,
    errors: string[],
    warnings: string[]
  ): void {
    // Parse the proposed metadata
    try {
      const newMetadata = JSON.parse(proposal.diff.after);

      // Check for required fields based on type
      if (newMetadata.type === 'scene') {
        if (!newMetadata.pov) {
          warnings.push('Scene without POV character');
        }
      }
    } catch {
      errors.push('Invalid JSON in metadata proposal');
    }
  }

  /**
   * Batch validate multiple proposals
   */
  async validateBatch(proposals: Proposal[]): Promise<Map<string, ProposalValidationResult>> {
    const results = new Map<string, ProposalValidationResult>();

    for (const proposal of proposals) {
      const result = await this.validate(proposal);
      results.set(proposal.proposalId, result);
    }

    return results;
  }
}
