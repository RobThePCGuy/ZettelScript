import type { Proposal, ProposalType } from '../core/types/index.js';
import { NodeRepository } from '../storage/database/repositories/index.js';
import { nanoid } from 'nanoid';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProposalBuilderOptions {
  nodeRepository: NodeRepository;
  vaultPath?: string;
}

export interface LinkAdditionProposal {
  nodeId: string;
  targetText: string;
  linkTarget: string;
  position?: { start: number; end: number };
  useIdPrefix?: boolean;
}

export interface ContentEditProposal {
  nodeId: string;
  oldContent: string;
  newContent: string;
  description: string;
}

export interface NodeCreationProposal {
  title: string;
  type: string;
  path: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MetadataUpdateProposal {
  nodeId: string;
  updates: Record<string, unknown>;
}

/**
 * Builds proposals for various types of changes
 */
export class ProposalBuilder {
  private nodeRepo: NodeRepository;
  private vaultPath: string;

  constructor(options: ProposalBuilderOptions) {
    this.nodeRepo = options.nodeRepository;
    this.vaultPath = options.vaultPath || process.cwd();
  }

  /**
   * Build a link addition proposal
   */
  async buildLinkAddition(data: LinkAdditionProposal): Promise<Proposal> {
    const node = await this.nodeRepo.findById(data.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${data.nodeId}`);
    }

    // Read current content
    const filePath = path.join(this.vaultPath, node.path);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Build the new link
    const linkPrefix = data.useIdPrefix ? 'id:' : '';
    const newLink = `[[${linkPrefix}${data.linkTarget}]]`;

    let newContent: string;
    let before: string | undefined;

    if (data.position) {
      // Replace at specific position
      before = content.slice(data.position.start, data.position.end);
      newContent =
        content.slice(0, data.position.start) +
        newLink +
        content.slice(data.position.end);
    } else {
      // Find and replace the target text
      const index = content.indexOf(data.targetText);
      if (index === -1) {
        throw new Error(`Target text "${data.targetText}" not found in document`);
      }
      before = data.targetText;
      newContent =
        content.slice(0, index) +
        newLink +
        content.slice(index + data.targetText.length);
    }

    return this.createProposal('link_addition', data.nodeId, {
      description: `Add link to "${data.linkTarget}" replacing "${data.targetText}"`,
      diff: { before, after: newContent },
      metadata: {
        targetText: data.targetText,
        linkTarget: data.linkTarget,
      },
    });
  }

  /**
   * Build a content edit proposal
   */
  async buildContentEdit(data: ContentEditProposal): Promise<Proposal> {
    const node = await this.nodeRepo.findById(data.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${data.nodeId}`);
    }

    return this.createProposal('content_edit', data.nodeId, {
      description: data.description,
      diff: { before: data.oldContent, after: data.newContent },
    });
  }

  /**
   * Build a node creation proposal
   */
  buildNodeCreation(data: NodeCreationProposal): Proposal {
    // Create a temporary node ID for the proposal
    const tempNodeId = `new:${nanoid()}`;

    return this.createProposal('node_creation', tempNodeId, {
      description: `Create new ${data.type}: "${data.title}"`,
      diff: { after: data.content },
      metadata: {
        path: data.path,
        title: data.title,
        type: data.type,
        frontmatter: data.metadata,
      },
    });
  }

  /**
   * Build a node deletion proposal
   */
  async buildNodeDeletion(nodeId: string, reason: string): Promise<Proposal> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Read current content for the diff
    const filePath = path.join(this.vaultPath, node.path);
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8')
      : '';

    return this.createProposal('node_deletion', nodeId, {
      description: `Delete "${node.title}": ${reason}`,
      diff: { before: content, after: '' },
      metadata: { title: node.title, path: node.path },
    });
  }

  /**
   * Build a metadata update proposal
   */
  async buildMetadataUpdate(data: MetadataUpdateProposal): Promise<Proposal> {
    const node = await this.nodeRepo.findById(data.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${data.nodeId}`);
    }

    const currentMetadata = node.metadata || {};
    const newMetadata = { ...currentMetadata, ...data.updates };

    return this.createProposal('metadata_update', data.nodeId, {
      description: `Update metadata: ${Object.keys(data.updates).join(', ')}`,
      diff: {
        before: JSON.stringify(currentMetadata, null, 2),
        after: JSON.stringify(newMetadata, null, 2),
      },
      metadata: { updates: data.updates },
    });
  }

  /**
   * Build multiple link addition proposals from mention candidates
   * Returns both successful proposals and any errors encountered
   */
  async buildFromMentions(
    mentions: Array<{
      sourceId: string;
      targetId: string;
      surfaceText: string;
      spanStart: number;
      spanEnd: number;
    }>
  ): Promise<{
    proposals: Proposal[];
    errors: Array<{ mention: typeof mentions[0]; error: string }>;
  }> {
    const proposals: Proposal[] = [];
    const errors: Array<{ mention: typeof mentions[0]; error: string }> = [];

    for (const mention of mentions) {
      const targetNode = await this.nodeRepo.findById(mention.targetId);
      if (!targetNode) {
        errors.push({
          mention,
          error: `Target node not found: ${mention.targetId}`,
        });
        continue;
      }

      try {
        const proposal = await this.buildLinkAddition({
          nodeId: mention.sourceId,
          targetText: mention.surfaceText,
          linkTarget: targetNode.title,
          position: { start: mention.spanStart, end: mention.spanEnd },
        });
        proposals.push(proposal);
      } catch (error) {
        errors.push({
          mention,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { proposals, errors };
  }

  /**
   * Create a proposal object
   */
  private createProposal(
    type: ProposalType,
    nodeId: string,
    data: {
      description: string;
      diff: { before?: string; after: string };
      metadata?: Record<string, unknown>;
    }
  ): Proposal {
    return {
      proposalId: nanoid(),
      type,
      nodeId,
      description: data.description,
      diff: data.diff,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...(data.metadata != null && { metadata: data.metadata }),
    };
  }
}
