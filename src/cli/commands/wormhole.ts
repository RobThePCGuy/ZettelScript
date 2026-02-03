import { Command } from 'commander';
import { initContext, Spinner, printTable } from '../utils.js';
import { WormholeDetector } from '../../retrieval/similarity/wormhole-detector.js';
import type { EdgeType } from '../../core/types/index.js';

export const wormholeCommand = new Command('wormhole').description(
  'Detect and manage semantic wormholes (similar but unlinked nodes)'
);

wormholeCommand
  .command('detect')
  .description('Detect semantic wormholes and create suggestion edges')
  .option('-t, --threshold <number>', 'Similarity threshold (0-1)', '0.75')
  .option('-k, --max-per-node <number>', 'Maximum wormholes per node', '5')
  .option('--dry-run', 'Preview without creating edges')
  .action(async (options: { threshold: string; maxPerNode: string; dryRun?: boolean }) => {
    try {
      const ctx = await initContext();

      const threshold = parseFloat(options.threshold);
      const maxPerNode = parseInt(options.maxPerNode, 10);

      // Check embedding coverage
      const embeddingCount = await ctx.embeddingRepository.count();
      const nodeCount = await ctx.nodeRepository.count();

      if (embeddingCount === 0) {
        console.log('No embeddings found. Run "zs embed compute" first to generate embeddings.');
        ctx.connectionManager.close();
        return;
      }

      const coverage = (embeddingCount / nodeCount) * 100;
      console.log(
        `Embedding coverage: ${embeddingCount}/${nodeCount} nodes (${coverage.toFixed(1)}%)`
      );

      if (coverage < 50) {
        console.log('Warning: Low embedding coverage may result in missing wormholes.');
      }

      // Get model name from embeddings
      const embeddings = await ctx.embeddingRepository.findAll();
      const model = embeddings[0]?.model || 'unknown';

      console.log(
        `\nDetecting wormholes (threshold: ${threshold}, max per node: ${maxPerNode})...`
      );

      const detector = new WormholeDetector(
        ctx.embeddingRepository,
        ctx.edgeRepository,
        ctx.wormholeRepository,
        ctx.nodeRepository,
        {
          similarityThreshold: threshold,
          maxWormholesPerNode: maxPerNode,
          excludeLinkedNodes: true,
        }
      );

      const spinner = new Spinner('Analyzing embeddings...');
      spinner.start();

      const candidates = await detector.detectWormholes();

      spinner.stop(`Found ${candidates.length} wormhole candidates`);

      if (candidates.length === 0) {
        console.log('\nNo wormholes detected above threshold.');
        ctx.connectionManager.close();
        return;
      }

      // Get node titles for display
      const nodeIds = new Set<string>();
      candidates.forEach((c) => {
        nodeIds.add(c.sourceId);
        nodeIds.add(c.targetId);
      });
      const nodes = await ctx.nodeRepository.findByIds(Array.from(nodeIds));
      const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

      // Display top candidates
      console.log('\nTop wormhole candidates:');
      const displayCount = Math.min(10, candidates.length);
      const rows = candidates.slice(0, displayCount).map((c, i) => {
        const source = nodeMap.get(c.sourceId);
        const target = nodeMap.get(c.targetId);
        return [
          String(i + 1),
          truncate(source?.title || c.sourceId, 25),
          truncate(target?.title || c.targetId, 25),
          (c.similarity * 100).toFixed(1) + '%',
        ];
      });
      printTable(['#', 'Source', 'Target', 'Similarity'], rows);

      if (candidates.length > displayCount) {
        console.log(`  ... and ${candidates.length - displayCount} more`);
      }

      if (options.dryRun) {
        console.log('\nDry run - no edges created.');
      } else {
        const created = await detector.createSemanticEdges(candidates, model);
        console.log(`\nCreated ${created} semantic_suggestion edges.`);
        console.log('Run "zs visualize" to see wormholes in the graph.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Wormhole detection failed:', error);
      process.exit(1);
    }
  });

wormholeCommand
  .command('stats')
  .description('Show wormhole statistics')
  .action(async () => {
    try {
      const ctx = await initContext();

      const detector = new WormholeDetector(
        ctx.embeddingRepository,
        ctx.edgeRepository,
        ctx.wormholeRepository,
        ctx.nodeRepository
      );

      const stats = await detector.getStats();

      console.log('\n=== Wormhole Statistics ===\n');
      console.log(`Embedding coverage: ${stats.embeddedNodeCount}/${stats.totalNodeCount} nodes`);
      console.log(`Pending suggestions: ${stats.suggestionCount}`);
      console.log(`Accepted wormholes: ${stats.acceptedCount}`);
      console.log(`Rejected pairs: ${stats.rejectionCount}`);

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to get stats:', error);
      process.exit(1);
    }
  });

wormholeCommand
  .command('list')
  .description('List pending wormhole suggestions')
  .action(async () => {
    try {
      const ctx = await initContext();

      const suggestions = await ctx.edgeRepository.findByType('semantic_suggestion' as EdgeType);

      if (suggestions.length === 0) {
        console.log('No pending wormhole suggestions.');
        console.log('Run "zs wormhole detect" to find semantic similarities.');
        ctx.connectionManager.close();
        return;
      }

      // Get node titles
      const nodeIds = new Set<string>();
      suggestions.forEach((s) => {
        nodeIds.add(s.sourceId);
        nodeIds.add(s.targetId);
      });
      const nodes = await ctx.nodeRepository.findByIds(Array.from(nodeIds));
      const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

      console.log(`\nPending wormhole suggestions (${suggestions.length}):\n`);

      const rows = suggestions.map((s) => {
        const source = nodeMap.get(s.sourceId);
        const target = nodeMap.get(s.targetId);
        const similarity = s.strength || 0;
        const attrs = s.attributes as { model?: string } | undefined;
        return [
          s.edgeId.slice(0, 8),
          truncate(source?.title || s.sourceId, 20),
          truncate(target?.title || s.targetId, 20),
          (similarity * 100).toFixed(1) + '%',
          attrs?.model?.split(':')[0] || '-',
        ];
      });

      printTable(['ID', 'Source', 'Target', 'Similarity', 'Model'], rows);

      console.log('\nTo accept: zs wormhole accept <id>');
      console.log('To reject: zs wormhole reject <id>');

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to list wormholes:', error);
      process.exit(1);
    }
  });

wormholeCommand
  .command('accept <id>')
  .description('Accept a wormhole suggestion (convert to permanent semantic edge)')
  .action(async (id: string) => {
    try {
      const ctx = await initContext();

      // Find the edge (support partial ID match)
      const suggestions = await ctx.edgeRepository.findByType('semantic_suggestion' as EdgeType);
      const edge = suggestions.find((s) => s.edgeId.startsWith(id));

      if (!edge) {
        console.error(`Wormhole suggestion not found: ${id}`);
        console.log('Run "zs wormhole list" to see available suggestions.');
        ctx.connectionManager.close();
        process.exit(1);
      }

      const detector = new WormholeDetector(
        ctx.embeddingRepository,
        ctx.edgeRepository,
        ctx.wormholeRepository,
        ctx.nodeRepository
      );

      const success = await detector.acceptWormhole(edge.edgeId);

      if (success) {
        const source = await ctx.nodeRepository.findById(edge.sourceId);
        const target = await ctx.nodeRepository.findById(edge.targetId);
        console.log(`Accepted wormhole: "${source?.title}" <-> "${target?.title}"`);
        console.log('Edge converted to permanent semantic link.');
      } else {
        console.error('Failed to accept wormhole.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to accept wormhole:', error);
      process.exit(1);
    }
  });

wormholeCommand
  .command('reject <id>')
  .description('Reject a wormhole suggestion (will not resurface unless content changes)')
  .action(async (id: string) => {
    try {
      const ctx = await initContext();

      // Find the edge (support partial ID match)
      const suggestions = await ctx.edgeRepository.findByType('semantic_suggestion' as EdgeType);
      const edge = suggestions.find((s) => s.edgeId.startsWith(id));

      if (!edge) {
        console.error(`Wormhole suggestion not found: ${id}`);
        console.log('Run "zs wormhole list" to see available suggestions.');
        ctx.connectionManager.close();
        process.exit(1);
      }

      const detector = new WormholeDetector(
        ctx.embeddingRepository,
        ctx.edgeRepository,
        ctx.wormholeRepository,
        ctx.nodeRepository
      );

      const success = await detector.rejectWormhole(edge.edgeId);

      if (success) {
        const source = await ctx.nodeRepository.findById(edge.sourceId);
        const target = await ctx.nodeRepository.findById(edge.targetId);
        console.log(`Rejected wormhole: "${source?.title}" <-> "${target?.title}"`);
        console.log('This pair will not be suggested again unless content changes.');
      } else {
        console.error('Failed to reject wormhole.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to reject wormhole:', error);
      process.exit(1);
    }
  });

wormholeCommand
  .command('clear')
  .description('Remove all wormhole suggestions')
  .option('--include-rejections', 'Also clear rejection history')
  .action(async (options: { includeRejections?: boolean }) => {
    try {
      const ctx = await initContext();

      const detector = new WormholeDetector(
        ctx.embeddingRepository,
        ctx.edgeRepository,
        ctx.wormholeRepository,
        ctx.nodeRepository
      );

      const cleared = await detector.clearSemanticEdges();
      console.log(`Cleared ${cleared} wormhole suggestions.`);

      if (options.includeRejections) {
        const rejections = await ctx.wormholeRepository.clearAll();
        console.log(`Cleared ${rejections} rejection records.`);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to clear wormholes:', error);
      process.exit(1);
    }
  });

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
