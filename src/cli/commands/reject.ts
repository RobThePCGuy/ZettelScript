import { Command } from 'commander';
import { initContext } from '../utils.js';
import { generateSuggestionId, isUndirectedEdgeType } from '../../core/types/index.js';
import type { EdgeType } from '../../core/types/index.js';

/**
 * Response shape for JSON mode per Phase 2 Design Section 10.2
 */
interface RejectResponse {
  success: boolean;
  warnings?: string[];
  error?: string;
  errorCode?: 'NOT_VAULT' | 'DB_ERROR' | 'INVALID_ARGS' | 'NOT_FOUND' | 'COMPUTE_ERROR';
  idempotent?: boolean;

  // Success details
  suggestionId?: string;
  fromId?: string;
  fromTitle?: string;
  toId?: string;
  toTitle?: string;
  edgeType?: string;
}

export const rejectCommand = new Command('reject')
  .description('Reject a suggested link, hiding it from future suggestions')
  .option('--suggestion-id <id>', 'The suggestion ID to reject')
  .option('--from <id>', 'Source node ID (alternative to --suggestion-id)')
  .option('--to <id>', 'Target node ID (alternative to --suggestion-id)')
  .option('--type <type>', 'Edge type (alternative to --suggestion-id)', 'explicit_link')
  .option('--json', 'Output JSON response')
  .action(async (options) => {
    const response: RejectResponse = { success: false };

    const outputJson = () => {
      if (options.json) {
        console.log(JSON.stringify(response));
      }
    };

    try {
      const ctx = await initContext();

      // Determine suggestionId
      let suggestionId: string;

      if (options.suggestionId) {
        suggestionId = options.suggestionId;
      } else if (options.from && options.to) {
        // Generate suggestionId from components
        const edgeType = options.type as EdgeType;
        const isUndirected = isUndirectedEdgeType(edgeType);
        suggestionId = generateSuggestionId(options.from, options.to, edgeType, isUndirected);
      } else {
        response.error = 'Must provide --suggestion-id or both --from and --to';
        response.errorCode = 'INVALID_ARGS';
        if (options.json) {
          outputJson();
        } else {
          console.error('Error:', response.error);
        }
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Load candidate edge
      const candidate = await ctx.candidateEdgeRepository.findById(suggestionId);

      if (!candidate) {
        response.error = `Suggestion not found: ${suggestionId}`;
        response.errorCode = 'NOT_FOUND';
        if (options.json) {
          outputJson();
        } else {
          console.error('Error:', response.error);
        }
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Check if already rejected (idempotent)
      if (candidate.status === 'rejected') {
        response.success = true;
        response.idempotent = true;
        response.suggestionId = suggestionId;
        response.fromId = candidate.fromId;
        response.toId = candidate.toId;
        response.edgeType = candidate.suggestedEdgeType;

        if (options.json) {
          outputJson();
        } else {
          console.log('Already rejected (idempotent)');
        }
        ctx.connectionManager.close();
        return;
      }

      // Check if already approved (can still reject - will update status)
      // Per design, we allow transitioning approved -> rejected
      // This removes the truth edge effectively by marking the candidate as rejected

      // Get node info for response
      const fromNode = await ctx.nodeRepository.findById(candidate.fromId);
      const toNode = await ctx.nodeRepository.findById(candidate.toId);

      // Update candidate status to rejected
      await ctx.candidateEdgeRepository.updateStatus(suggestionId, 'rejected');

      response.success = true;
      response.suggestionId = suggestionId;
      response.fromId = candidate.fromId;
      if (fromNode) response.fromTitle = fromNode.title;
      response.toId = candidate.toId;
      if (toNode) response.toTitle = toNode.title;
      response.edgeType = candidate.suggestedEdgeType;

      if (options.json) {
        outputJson();
      } else {
        console.log(
          `Rejected: ${fromNode?.title || candidate.fromId} -> ${toNode?.title || candidate.toId}`
        );
        console.log(`  Type: ${candidate.suggestedEdgeType}`);
        console.log('  This suggestion will be hidden from future views.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
      response.errorCode = 'DB_ERROR';
      if (options.json) {
        outputJson();
      } else {
        console.error('Error:', response.error);
      }
      process.exit(1);
    }
  });
