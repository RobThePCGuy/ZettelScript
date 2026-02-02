import { Command } from 'commander';
import { initContext, printTable } from '../utils.js';
import { parseIntSafe } from '../../core/validation.js';

export const queryCommand = new Command('query')
  .description('Query the knowledge graph');

// Backlinks subcommand
queryCommand
  .command('backlinks <node>')
  .description('Show incoming links to a node')
  .option('-l, --limit <n>', 'Maximum results', '20')
  .action(async (nodeIdentifier: string, options) => {
    try {
      const ctx = await initContext();
      const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);

      // Find node by title or path
      let node = await ctx.nodeRepository.findByPath(nodeIdentifier);
      if (!node) {
        const nodes = await ctx.nodeRepository.findByTitle(nodeIdentifier);
        node = nodes[0] ?? null;
      }
      if (!node) {
        const nodes = await ctx.nodeRepository.findByTitleOrAlias(nodeIdentifier);
        node = nodes[0] ?? null;
      }

      if (!node) {
        console.log(`Node not found: ${nodeIdentifier}`);
        ctx.connectionManager.close();
        return;
      }

      console.log(`Backlinks to: ${node.title} (${node.path})\n`);

      const backlinks = await ctx.graphEngine.getBacklinks(node.nodeId);

      if (backlinks.length === 0) {
        console.log('No backlinks found.');
      } else {
        const rows = backlinks.slice(0, limit).map(bl => [
          bl.sourceNode.title,
          bl.sourceNode.type,
          bl.sourceNode.path,
        ]);
        printTable(['Title', 'Type', 'Path'], rows);

        if (backlinks.length > limit) {
          console.log(`\n... and ${backlinks.length - limit} more`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });

// Neighbors subcommand
queryCommand
  .command('neighbors <node>')
  .description('Show connected nodes')
  .option('-l, --limit <n>', 'Maximum results', '20')
  .option('-d, --direction <dir>', 'Filter direction (in/out/both)', 'both')
  .action(async (nodeIdentifier: string, options) => {
    try {
      const ctx = await initContext();
      const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);

      // Find node
      let node = await ctx.nodeRepository.findByPath(nodeIdentifier);
      if (!node) {
        const nodes = await ctx.nodeRepository.findByTitle(nodeIdentifier);
        node = nodes[0] ?? null;
      }
      if (!node) {
        const nodes = await ctx.nodeRepository.findByTitleOrAlias(nodeIdentifier);
        node = nodes[0] ?? null;
      }

      if (!node) {
        console.log(`Node not found: ${nodeIdentifier}`);
        ctx.connectionManager.close();
        return;
      }

      console.log(`Neighbors of: ${node.title} (${node.path})\n`);

      const neighbors = await ctx.graphEngine.getNeighbors(node.nodeId);

      // Filter by direction
      const filtered = neighbors.filter(n => {
        if (options.direction === 'in') return n.direction === 'incoming';
        if (options.direction === 'out') return n.direction === 'outgoing';
        return true;
      });

      if (filtered.length === 0) {
        console.log('No neighbors found.');
      } else {
        const rows = filtered.slice(0, limit).map(n => [
          n.direction === 'incoming' ? '←' : '→',
          n.node.title,
          n.node.type,
          n.edge.edgeType,
        ]);
        printTable(['Dir', 'Title', 'Type', 'Edge Type'], rows);

        if (filtered.length > limit) {
          console.log(`\n... and ${filtered.length - limit} more`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });

// Path subcommand
queryCommand
  .command('path <from> <to>')
  .description('Find shortest path between nodes')
  .action(async (fromIdentifier: string, toIdentifier: string) => {
    try {
      const ctx = await initContext();

      // Find from node
      let fromNode = await ctx.nodeRepository.findByPath(fromIdentifier);
      if (!fromNode) {
        const nodes = await ctx.nodeRepository.findByTitle(fromIdentifier);
        fromNode = nodes[0] ?? null;
      }
      if (!fromNode) {
        console.log(`Node not found: ${fromIdentifier}`);
        ctx.connectionManager.close();
        return;
      }

      // Find to node
      let toNode = await ctx.nodeRepository.findByPath(toIdentifier);
      if (!toNode) {
        const nodes = await ctx.nodeRepository.findByTitle(toIdentifier);
        toNode = nodes[0] ?? null;
      }
      if (!toNode) {
        console.log(`Node not found: ${toIdentifier}`);
        ctx.connectionManager.close();
        return;
      }

      console.log(`Path from "${fromNode.title}" to "${toNode.title}":\n`);

      const path = await ctx.graphEngine.findShortestPath(fromNode.nodeId, toNode.nodeId);

      if (!path) {
        console.log('No path found.');
      } else {
        const pathNodes = await ctx.nodeRepository.findByIds(path);
        const nodeMap = new Map(pathNodes.map(n => [n.nodeId, n]));

        for (let i = 0; i < path.length; i++) {
          const nodeId = path[i];
          if (nodeId) {
            const node = nodeMap.get(nodeId);
            const prefix = i === 0 ? '→' : i === path.length - 1 ? '◉' : '↓';
            console.log(`  ${prefix} ${node?.title || nodeId}`);
          }
        }
        console.log(`\nPath length: ${path.length - 1} hops`);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });

// Stats subcommand
queryCommand
  .command('stats')
  .description('Show graph statistics')
  .action(async () => {
    try {
      const ctx = await initContext();

      const stats = await ctx.pipeline.getStats();
      const dbStats = ctx.connectionManager.getStats();

      console.log('Graph Statistics\n');
      console.log(`Total nodes:  ${stats.nodeCount}`);
      console.log(`Total edges:  ${stats.edgeCount}`);
      console.log(`Total chunks: ${dbStats.chunkCount}`);
      console.log(`DB size:      ${(dbStats.dbSizeBytes / 1024).toFixed(1)}KB`);

      console.log('\nNodes by type:');
      for (const [type, count] of Object.entries(stats.nodesByType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
      }

      console.log('\nEdges by type:');
      for (const [type, count] of Object.entries(stats.edgesByType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
      }

      // Find orphan nodes
      const components = await ctx.graphEngine.findConnectedComponents();
      const isolatedCount = components.filter(c => c.length === 1).length;
      if (isolatedCount > 0) {
        console.log(`\nIsolated nodes: ${isolatedCount}`);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });

// Orphans subcommand
queryCommand
  .command('orphans')
  .description('Find nodes with no links')
  .option('-l, --limit <n>', 'Maximum results', '20')
  .action(async (options) => {
    try {
      const ctx = await initContext();
      const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);

      const isolated = await ctx.graphEngine.findIsolatedNodes();

      if (isolated.length === 0) {
        console.log('No orphan nodes found.');
      } else {
        console.log(`Orphan nodes (${isolated.length}):\n`);

        const rows = isolated.slice(0, limit).map(n => [
          n.title,
          n.type,
          n.path,
        ]);
        printTable(['Title', 'Type', 'Path'], rows);

        if (isolated.length > limit) {
          console.log(`\n... and ${isolated.length - limit} more`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });

// Hubs subcommand
queryCommand
  .command('hubs')
  .description('Find highly-connected nodes')
  .option('-l, --limit <n>', 'Maximum results', '10')
  .option('-t, --threshold <n>', 'Minimum connections', '5')
  .action(async (options) => {
    try {
      const ctx = await initContext();
      const limit = parseIntSafe(options.limit, 10);
      const threshold = parseIntSafe(options.threshold, ctx.config.moc.defaultHubThreshold);

      const hubs = await ctx.graphEngine.findHighInDegreeNodes(threshold);

      if (hubs.length === 0) {
        console.log(`No nodes with ${threshold}+ incoming links.`);
      } else {
        console.log(`Hub nodes (${hubs.length}):\n`);

        const rows = hubs.slice(0, limit).map(h => [
          h.node.title,
          h.node.type,
          h.inDegree.toString(),
        ]);
        printTable(['Title', 'Type', 'Incoming Links'], rows);

        if (hubs.length > limit) {
          console.log(`\n... and ${hubs.length - limit} more`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Query failed:', error);
      process.exit(1);
    }
  });
