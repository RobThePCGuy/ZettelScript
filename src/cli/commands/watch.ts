import { Command } from 'commander';
import { initContext } from '../utils.js';
import { createIncrementalIndexer, type IncrementalIndexEvent } from '../../indexer/incremental.js';

export const watchCommand = new Command('watch')
  .description('Watch for file changes and incrementally index')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const ctx = await initContext();

      console.log(`Watching vault: ${ctx.vaultPath}`);
      console.log('Press Ctrl+C to stop.\n');

      const indexer = createIncrementalIndexer(ctx.vaultPath, ctx.pipeline, {
        excludePatterns: ctx.config.vault.excludePatterns.map((p) => `**/${p}`),
      });

      indexer.on('ready', () => {
        console.log('Watcher ready. Listening for changes...\n');
      });

      indexer.on('event', (event: IncrementalIndexEvent) => {
        const timestamp = new Date().toLocaleTimeString();

        switch (event.type) {
          case 'indexed':
            console.log(`[${timestamp}] Indexed: ${event.path}`);
            if (options.verbose && event.result) {
              const { edges, unresolved, ambiguous } = event.result;
              if (edges.length > 0) {
                console.log(`  Links: ${edges.length}`);
              }
              if (unresolved.length > 0) {
                console.log(`  Unresolved: ${unresolved.map((u) => u.target).join(', ')}`);
              }
              if (ambiguous.length > 0) {
                console.log(`  Ambiguous: ${ambiguous.map((a) => a.target).join(', ')}`);
              }
            }
            break;

          case 'removed':
            console.log(`[${timestamp}] Removed: ${event.path}`);
            break;

          case 'error':
            console.log(`[${timestamp}] Error: ${event.path}`);
            console.log(`  ${event.error}`);
            break;
        }
      });

      indexer.on('error', (error: Error) => {
        console.error('Watcher error:', error.message);
      });

      indexer.start();

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log('\nStopping watcher...');
        await indexer.stop();
        ctx.connectionManager.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      console.error('Watch failed:', error);
      process.exit(1);
    }
  });
