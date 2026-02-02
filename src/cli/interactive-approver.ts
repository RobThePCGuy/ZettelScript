import * as readline from 'node:readline';
import type { RankedMention } from '../discovery/mention-ranker.js';
import { EdgeRepository } from '../storage/database/repositories/index.js';
import { DatabaseError } from '../core/errors.js';

export type ApprovalAction = 'approve' | 'reject' | 'defer' | 'skip' | 'quit' | 'approveAll';

export interface ApprovalResult {
  mention: RankedMention;
  action: ApprovalAction;
}

export interface InteractiveApproverOptions {
  edgeRepository: EdgeRepository;
  sourceNodeId: string;
}

/**
 * Interactive mention approver using readline
 * Supports commands: (y)es, (n)o, (d)efer, (a)ll, (s)kip, (q)uit
 */
export class InteractiveApprover {
  private edgeRepo: EdgeRepository;
  private sourceNodeId: string;
  private rl: readline.Interface | null = null;

  constructor(options: InteractiveApproverOptions) {
    this.edgeRepo = options.edgeRepository;
    this.sourceNodeId = options.sourceNodeId;
  }

  /**
   * Check if running in a TTY environment
   */
  isTTY(): boolean {
    return process.stdin.isTTY === true && process.stdout.isTTY === true;
  }

  /**
   * Approve a single mention interactively
   */
  async approveMention(mention: RankedMention): Promise<ApprovalAction> {
    if (!this.isTTY()) {
      console.warn('Not running in interactive mode (non-TTY). Use --batch flag instead.');
      return 'skip';
    }

    // Display mention info
    console.log(`\n  "${mention.surfaceText}" -> ${mention.targetTitle}`);
    console.log(`  Confidence: ${(mention.confidence * 100).toFixed(0)}%`);
    if (mention.reasons && mention.reasons.length > 0) {
      console.log(`  Reasons: ${mention.reasons.join(', ')}`);
    }

    const action = await this.promptAction();
    return action;
  }

  /**
   * Approve multiple mentions interactively
   */
  async approveAll(mentions: RankedMention[]): Promise<ApprovalResult[]> {
    const results: ApprovalResult[] = [];
    let approveRemaining = false;

    for (const mention of mentions) {
      if (approveRemaining) {
        // Auto-approve remaining
        await this.createMentionEdge(mention);
        results.push({ mention, action: 'approve' });
        continue;
      }

      const action = await this.approveMention(mention);

      switch (action) {
        case 'approve':
          await this.createMentionEdge(mention);
          results.push({ mention, action: 'approve' });
          break;

        case 'approveAll':
          await this.createMentionEdge(mention);
          results.push({ mention, action: 'approve' });
          approveRemaining = true;
          break;

        case 'reject':
          results.push({ mention, action: 'reject' });
          break;

        case 'defer':
          results.push({ mention, action: 'defer' });
          break;

        case 'skip':
          results.push({ mention, action: 'skip' });
          break;

        case 'quit':
          results.push({ mention, action: 'quit' });
          this.close();
          return results;
      }
    }

    this.close();
    return results;
  }

  /**
   * Prompt user for action with retry limit
   */
  private async promptAction(): Promise<ApprovalAction> {
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const answer = await this.question('  Approve? (y)es/(n)o/(d)efer/(a)ll/(s)kip/(q)uit: ');
        const action = this.parseAnswer(answer);
        if (action) return action;
        console.log('  Invalid input. Use y/n/d/a/s/q');
        retries++;
      } catch (error) {
        this.close();
        throw error;
      }
    }

    // Default to skip after max retries
    return 'skip';
  }

  /**
   * Parse user answer into an action
   */
  private parseAnswer(answer: string): ApprovalAction | null {
    const normalized = answer.toLowerCase().trim();

    switch (normalized) {
      case 'y':
      case 'yes':
        return 'approve';
      case 'n':
      case 'no':
        return 'reject';
      case 'd':
      case 'defer':
        return 'defer';
      case 'a':
      case 'all':
        return 'approveAll';
      case 's':
      case 'skip':
        return 'skip';
      case 'q':
      case 'quit':
        return 'quit';
      default:
        return null;
    }
  }

  /**
   * Promisified readline question
   */
  private question(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        this.rl.on('close', () => {
          // Handle readline being closed externally
        });

        this.rl.on('error', (err) => {
          reject(err);
        });
      }

      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Create a mention edge in the database
   */
  private async createMentionEdge(mention: RankedMention): Promise<void> {
    try {
      await this.edgeRepo.create({
        sourceId: this.sourceNodeId,
        targetId: mention.targetId,
        edgeType: 'mention',
        provenance: 'user_approved',
        strength: mention.confidence,
        attributes: {
          surfaceText: mention.surfaceText,
          spanStart: mention.spanStart,
          spanEnd: mention.spanEnd,
          approvedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create mention edge: ${error instanceof Error ? error.message : String(error)}`,
        {
          sourceId: this.sourceNodeId,
          targetId: mention.targetId,
        }
      );
    }
  }

  /**
   * Close the readline interface
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Batch approve mentions without interaction
 */
export async function batchApproveMentions(
  mentions: RankedMention[],
  sourceNodeId: string,
  edgeRepo: EdgeRepository,
  action: 'approve' | 'reject' | 'defer'
): Promise<ApprovalResult[]> {
  const results: ApprovalResult[] = [];

  for (const mention of mentions) {
    if (action === 'approve') {
      await edgeRepo.create({
        sourceId: sourceNodeId,
        targetId: mention.targetId,
        edgeType: 'mention',
        provenance: 'user_approved',
        strength: mention.confidence,
        attributes: {
          surfaceText: mention.surfaceText,
          spanStart: mention.spanStart,
          spanEnd: mention.spanEnd,
          approvedAt: new Date().toISOString(),
        },
      });
    }

    results.push({ mention, action });
  }

  return results;
}
