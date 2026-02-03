import type { Proposal, Frontmatter } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
import { ProposalValidator } from '../validation/proposal-validator.js';
import { atomicWrite, backupFile } from '../storage/filesystem/writer.js';
import { parseFrontmatter, serializeFrontmatter } from '../parser/frontmatter.js';
import { getLogger } from '../core/logger.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ApprovalWorkflowOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  vaultPath: string;
  createBackups?: boolean;
}

export interface ApplyResult {
  success: boolean;
  proposal: Proposal;
  backupPath?: string;
  error?: string;
}

/**
 * Manages the proposal approval and application workflow
 */
export class ApprovalWorkflow {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private validator: ProposalValidator;
  private vaultPath: string;
  private createBackups: boolean;
  private pendingProposals: Map<string, Proposal> = new Map();

  constructor(options: ApprovalWorkflowOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.vaultPath = options.vaultPath;
    this.createBackups = options.createBackups ?? true;

    this.validator = new ProposalValidator({
      nodeRepository: this.nodeRepo,
      edgeRepository: this.edgeRepo,
      vaultPath: this.vaultPath,
    });
  }

  /**
   * Submit a proposal for review
   */
  submit(proposal: Proposal): Proposal {
    proposal.status = 'pending';
    this.pendingProposals.set(proposal.proposalId, proposal);
    return proposal;
  }

  /**
   * Get all pending proposals
   */
  getPending(): Proposal[] {
    return Array.from(this.pendingProposals.values()).filter((p) => p.status === 'pending');
  }

  /**
   * Get a specific proposal
   */
  getProposal(proposalId: string): Proposal | null {
    return this.pendingProposals.get(proposalId) ?? null;
  }

  /**
   * Approve a proposal
   */
  async approve(proposalId: string): Promise<ApplyResult> {
    const proposal = this.pendingProposals.get(proposalId);
    if (!proposal) {
      return {
        success: false,
        proposal: { proposalId } as Proposal,
        error: 'Proposal not found',
      };
    }

    // Validate before applying
    const validation = await this.validator.validate(proposal);
    if (!validation.valid) {
      return {
        success: false,
        proposal,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Apply the proposal
    return this.apply(proposal);
  }

  /**
   * Reject a proposal
   */
  reject(proposalId: string, reason?: string): Proposal | null {
    const proposal = this.pendingProposals.get(proposalId);
    if (!proposal) return null;

    proposal.status = 'rejected';
    if (reason) {
      proposal.metadata = { ...proposal.metadata, rejectionReason: reason };
    }

    return proposal;
  }

  /**
   * Apply an approved proposal
   */
  private async apply(proposal: Proposal): Promise<ApplyResult> {
    try {
      let backupPath: string | undefined;

      switch (proposal.type) {
        case 'content_edit':
        case 'link_addition':
          backupPath = await this.applyContentChange(proposal);
          break;

        case 'node_creation':
          await this.applyNodeCreation(proposal);
          break;

        case 'node_deletion':
          backupPath = await this.applyNodeDeletion(proposal);
          break;

        case 'metadata_update':
          backupPath = await this.applyMetadataUpdate(proposal);
          break;
      }

      proposal.status = 'applied';
      proposal.appliedAt = new Date().toISOString();

      return {
        success: true,
        proposal,
        ...(backupPath != null && { backupPath }),
      };
    } catch (error) {
      return {
        success: false,
        proposal,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Apply a content change (edit or link addition)
   */
  private async applyContentChange(proposal: Proposal): Promise<string | undefined> {
    const node = await this.nodeRepo.findById(proposal.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    const filePath = path.join(this.vaultPath, node.path);

    // Create backup if enabled
    let backupPath: string | undefined;
    if (this.createBackups && fs.existsSync(filePath)) {
      backupPath = await backupFile(filePath);
    }

    // Write new content
    await atomicWrite(filePath, proposal.diff.after);

    return backupPath;
  }

  /**
   * Apply a node creation
   */
  private async applyNodeCreation(proposal: Proposal): Promise<void> {
    const metadata = proposal.metadata as
      | {
          path?: string;
          title?: string;
          type?: string;
        }
      | undefined;

    if (!metadata?.path) {
      throw new Error('Node creation requires path in metadata');
    }

    const filePath = path.join(this.vaultPath, metadata.path);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      throw new Error(`File already exists: ${metadata.path}`);
    }

    // Create directory if needed
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Write the file
    await atomicWrite(filePath, proposal.diff.after);
  }

  /**
   * Apply a node deletion
   */
  private async applyNodeDeletion(proposal: Proposal): Promise<string | undefined> {
    const node = await this.nodeRepo.findById(proposal.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    const filePath = path.join(this.vaultPath, node.path);

    // Create backup if enabled
    let backupPath: string | undefined;
    if (this.createBackups && fs.existsSync(filePath)) {
      backupPath = await backupFile(filePath);
    }

    // Delete the file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await this.nodeRepo.delete(proposal.nodeId);

    return backupPath;
  }

  /**
   * Apply a metadata update
   */
  private async applyMetadataUpdate(proposal: Proposal): Promise<string | undefined> {
    const metadata = proposal.metadata as { updates?: Record<string, unknown> } | undefined;
    if (!metadata?.updates) {
      throw new Error('Metadata update requires updates in metadata');
    }

    const node = await this.nodeRepo.findById(proposal.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Update node metadata in database
    const newMetadata = { ...node.metadata, ...metadata.updates };
    await this.nodeRepo.update(proposal.nodeId, { metadata: newMetadata });

    // Also update the file's frontmatter
    const filePath = path.join(this.vaultPath, node.path);
    let backupPath: string | undefined;

    if (fs.existsSync(filePath)) {
      try {
        // Create backup if enabled
        if (this.createBackups) {
          backupPath = await backupFile(filePath);
        }

        // Read current file content
        const content = fs.readFileSync(filePath, 'utf-8');

        // Parse existing frontmatter
        const parsed = parseFrontmatter(content, filePath);

        // Merge updates into existing frontmatter
        const existingFrontmatter = parsed.frontmatter ?? {};
        const mergedFrontmatter: Frontmatter = {
          ...existingFrontmatter,
          ...metadata.updates,
        };

        // Serialize and write
        const newContent = serializeFrontmatter(mergedFrontmatter) + parsed.content;
        await atomicWrite(filePath, newContent);
      } catch (error) {
        // If frontmatter update fails, we've already updated the database
        // Log the error but don't fail the entire operation
        const errorMessage = error instanceof Error ? error.message : String(error);
        getLogger().warn(`Failed to update file frontmatter: ${errorMessage}`);
        // Database update succeeded, so we don't throw
      }
    }

    return backupPath;
  }

  /**
   * Batch approve multiple proposals
   */
  async batchApprove(proposalIds: string[]): Promise<ApplyResult[]> {
    const results: ApplyResult[] = [];

    for (const id of proposalIds) {
      const result = await this.approve(id);
      results.push(result);
    }

    return results;
  }

  /**
   * Clear all pending proposals
   */
  clearPending(): number {
    const count = this.pendingProposals.size;
    this.pendingProposals.clear();
    return count;
  }

  /**
   * Get workflow statistics
   */
  getStats(): {
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
  } {
    const proposals = Array.from(this.pendingProposals.values());

    return {
      pending: proposals.filter((p) => p.status === 'pending').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      rejected: proposals.filter((p) => p.status === 'rejected').length,
      applied: proposals.filter((p) => p.status === 'applied').length,
    };
  }
}
