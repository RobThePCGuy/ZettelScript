import { Command } from 'commander';
import { initContext, printTable } from '../utils.js';
import { MentionDetector } from '../../discovery/mention-detector.js';
import { MentionRanker } from '../../discovery/mention-ranker.js';
import { InteractiveApprover, batchApproveMentions } from '../interactive-approver.js';
import { parseIntSafe, parseFloatSafe } from '../../core/validation.js';

export const discoverCommand = new Command('discover')
  .description('Find unlinked mentions')
  .option('-n, --node <id>', 'Check specific node')
  .option('--all', 'Check all nodes')
  .option('-l, --limit <n>', 'Maximum mentions per node', '10')
  .option('-t, --threshold <n>', 'Minimum confidence threshold', '0.3')
  .option('--approve', 'Interactive approval mode')
  .option('--batch <action>', 'Batch action: approve, reject, or defer')
  .action(async (options) => {
    try {
      const ctx = await initContext();

      const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);
      const threshold = parseFloatSafe(options.threshold, ctx.config.discovery.confidenceThreshold);

      const detector = new MentionDetector({
        nodeRepository: ctx.nodeRepository,
        vaultPath: ctx.vaultPath,
      });

      const ranker = new MentionRanker({
        edgeRepository: ctx.edgeRepository,
        graphEngine: ctx.graphEngine,
      });

      let nodesToCheck: Array<{ nodeId: string; path: string; title: string }> = [];

      if (options.node) {
        // Check specific node
        let node = await ctx.nodeRepository.findByPath(options.node);
        if (!node) {
          const nodes = await ctx.nodeRepository.findByTitle(options.node);
          node = nodes[0] ?? null;
        }

        if (!node) {
          console.log(`Node not found: ${options.node}`);
          ctx.connectionManager.close();
          return;
        }

        nodesToCheck = [{ nodeId: node.nodeId, path: node.path, title: node.title }];
      } else if (options.all) {
        // Check all nodes
        const allNodes = await ctx.nodeRepository.findAll();
        nodesToCheck = allNodes.map(n => ({ nodeId: n.nodeId, path: n.path, title: n.title }));
      } else {
        console.log('Specify --node <id> or --all to discover mentions.');
        ctx.connectionManager.close();
        return;
      }

      let totalMentions = 0;

      for (const { nodeId, path, title } of nodesToCheck) {
        // Detect mentions
        const mentions = await detector.detectInNode(nodeId);

        if (mentions.length === 0) continue;

        // Rank mentions
        const ranked = await ranker.rank(mentions);

        // Filter by threshold
        const filtered = ranked.filter(m => m.confidence >= threshold);

        if (filtered.length === 0) continue;

        console.log(`\n${title} (${path}):`);

        const display = filtered.slice(0, limit);
        const rows = display.map(m => [
          m.surfaceText,
          m.targetTitle || m.targetId,
          (m.confidence * 100).toFixed(0) + '%',
          m.reasons?.join(', ') || '',
        ]);

        printTable(['Text', 'Target', 'Confidence', 'Reasons'], rows);

        if (filtered.length > limit) {
          console.log(`  ... and ${filtered.length - limit} more`);
        }

        totalMentions += filtered.length;

        // Interactive or batch approval
        if (display.length > 0) {
          if (options.batch) {
            // Batch mode
            const action = options.batch.toLowerCase();
            if (!['approve', 'reject', 'defer'].includes(action)) {
              console.error(`Invalid batch action: ${action}. Use: approve, reject, or defer`);
              ctx.connectionManager.close();
              return;
            }

            // Batch mode approves ALL filtered mentions, not just displayed
            const results = await batchApproveMentions(
              filtered,
              nodeId,
              ctx.edgeRepository,
              action as 'approve' | 'reject' | 'defer'
            );

            const approvedCount = results.filter(r => r.action === 'approve').length;
            if (approvedCount > 0) {
              console.log(`  Batch ${action}: ${approvedCount} mention(s)`);
            }
          } else if (options.approve) {
            // Interactive mode
            const approver = new InteractiveApprover({
              edgeRepository: ctx.edgeRepository,
              sourceNodeId: nodeId,
            });

            if (!approver.isTTY()) {
              console.warn('\nNot running in interactive mode (non-TTY). Use --batch flag for non-interactive approval.');
            } else {
              console.log('\nInteractive approval mode:');
              const results = await approver.approveAll(display);

              const approved = results.filter(r => r.action === 'approve').length;
              const rejected = results.filter(r => r.action === 'reject').length;
              const deferred = results.filter(r => r.action === 'defer').length;

              if (approved > 0 || rejected > 0 || deferred > 0) {
                console.log(`\nApproved: ${approved}, Rejected: ${rejected}, Deferred: ${deferred}`);
              }

              // Check if user quit early
              if (results.some(r => r.action === 'quit')) {
                console.log('Approval cancelled.');
                ctx.connectionManager.close();
                return;
              }
            }
          }
        }
      }

      if (totalMentions === 0) {
        console.log('No unlinked mentions found.');
      } else {
        console.log(`\nTotal mentions found: ${totalMentions}`);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Discovery failed:', error);
      process.exit(1);
    }
  });
