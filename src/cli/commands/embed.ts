import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initContext, Spinner } from '../utils.js';
import { createEmbeddingProvider } from '../../retrieval/embeddings/provider.js';

export const embedCommand = new Command('embed').description(
  'Manage node embeddings for semantic wormholes'
);

embedCommand
  .command('compute')
  .description('Compute embeddings for nodes that need them')
  .option('-p, --provider <name>', 'Embedding provider (openai|ollama|mock)', 'openai')
  .option('-m, --model <name>', 'Model name (provider-specific)')
  .option('--force', 'Recompute all embeddings, not just dirty nodes')
  .option('--batch-size <n>', 'Batch size for API calls', '10')
  .action(
    async (options: {
      provider: 'openai' | 'ollama' | 'mock';
      model?: string;
      force?: boolean;
      batchSize: string;
    }) => {
      try {
        const ctx = await initContext();
        const batchSize = parseInt(options.batchSize, 10);

        // Determine which nodes need embeddings
        let nodeIds: string[];
        if (options.force) {
          const nodes = await ctx.nodeRepository.findAll();
          nodeIds = nodes.map((n) => n.nodeId);
          console.log(`Force mode: will compute embeddings for all ${nodeIds.length} nodes`);
        } else {
          nodeIds = await ctx.embeddingRepository.findDirtyNodeIds();
          if (nodeIds.length === 0) {
            console.log('All nodes have up-to-date embeddings.');
            ctx.connectionManager.close();
            return;
          }
          console.log(`Found ${nodeIds.length} nodes needing embeddings`);
        }

        // Create embedding provider
        const providerConfig: {
          provider: 'openai' | 'ollama' | 'mock';
          apiKey?: string;
          model?: string;
          baseUrl?: string;
        } = {
          provider: options.provider,
        };

        if (options.provider === 'openai') {
          const apiKey = process.env.OPENAI_API_KEY || ctx.config.embeddings.apiKey;
          if (!apiKey) {
            console.error(
              'Error: OPENAI_API_KEY environment variable or config.embeddings.apiKey required'
            );
            ctx.connectionManager.close();
            process.exit(1);
          }
          providerConfig.apiKey = apiKey;
        }

        if (options.model) {
          providerConfig.model = options.model;
        } else if (ctx.config.embeddings.model) {
          providerConfig.model = ctx.config.embeddings.model;
        }

        if (ctx.config.embeddings.baseUrl) {
          providerConfig.baseUrl = ctx.config.embeddings.baseUrl;
        }

        const provider = createEmbeddingProvider(providerConfig);
        const modelName = `${options.provider}:${providerConfig.model || provider.name}`;

        console.log(`Using provider: ${modelName} (${provider.dimensions} dimensions)`);

        // Get full node data
        const nodes = await ctx.nodeRepository.findByIds(nodeIds);
        const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

        // Process in batches
        const spinner = new Spinner('Computing embeddings...');
        spinner.start();

        let processed = 0;
        let errors = 0;

        for (let i = 0; i < nodeIds.length; i += batchSize) {
          const batch = nodeIds.slice(i, i + batchSize);
          const batchNodes = batch.map((id) => nodeMap.get(id)!).filter(Boolean);

          try {
            // Get content for each node (using chunks or file content)
            const texts: string[] = [];
            for (const node of batchNodes) {
              // Try to get content from chunks first
              const chunks = await ctx.chunkRepository.findByNodeId(node.nodeId);
              if (chunks.length > 0) {
                // Combine all chunks
                texts.push(chunks.map((c) => c.text).join('\n'));
              } else {
                // Fall back to reading file content
                const filePath = path.join(ctx.vaultPath, node.path);
                if (fs.existsSync(filePath)) {
                  const content = fs.readFileSync(filePath, 'utf-8');
                  texts.push(content);
                } else {
                  texts.push(node.title); // Last resort: just use title
                }
              }
            }

            // Compute embeddings
            const embeddings = await provider.embedBatch(texts);

            // Store embeddings
            for (let j = 0; j < batchNodes.length; j++) {
              const node = batchNodes[j];
              const embedding = embeddings[j];

              if (node && embedding) {
                await ctx.embeddingRepository.upsert({
                  nodeId: node.nodeId,
                  embedding,
                  model: modelName,
                  dimensions: provider.dimensions,
                  contentHash: node.contentHash || '',
                });
              }
            }

            processed += batchNodes.length;
            spinner.update(`Computing embeddings... ${processed}/${nodeIds.length}`);
          } catch (error) {
            errors += batchNodes.length;
            console.error(`\nError processing batch: ${error}`);
          }
        }

        spinner.stop(
          `Computed embeddings for ${processed} nodes${errors > 0 ? ` (${errors} errors)` : ''}`
        );

        ctx.connectionManager.close();
      } catch (error) {
        console.error('Embedding computation failed:', error);
        process.exit(1);
      }
    }
  );

embedCommand
  .command('stats')
  .description('Show embedding statistics')
  .action(async () => {
    try {
      const ctx = await initContext();

      const totalNodes = await ctx.nodeRepository.count();
      const embeddingCount = await ctx.embeddingRepository.count();
      const dirtyCount = (await ctx.embeddingRepository.findDirtyNodeIds()).length;
      const byModel = await ctx.embeddingRepository.countByModel();

      console.log('\n=== Embedding Statistics ===\n');
      console.log(`Total nodes: ${totalNodes}`);
      console.log(`Embedded nodes: ${embeddingCount}`);
      console.log(`Coverage: ${((embeddingCount / totalNodes) * 100).toFixed(1)}%`);
      console.log(`Nodes needing update: ${dirtyCount}`);

      if (Object.keys(byModel).length > 0) {
        console.log('\nBy model:');
        for (const [model, count] of Object.entries(byModel)) {
          console.log(`  ${model}: ${count}`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to get stats:', error);
      process.exit(1);
    }
  });

embedCommand
  .command('clear')
  .description('Clear all embeddings')
  .option('-m, --model <name>', 'Only clear embeddings for a specific model')
  .action(async (options: { model?: string }) => {
    try {
      const ctx = await initContext();

      let count: number;
      if (options.model) {
        count = await ctx.embeddingRepository.deleteByModel(options.model);
        console.log(`Cleared ${count} embeddings for model: ${options.model}`);
      } else {
        const embeddings = await ctx.embeddingRepository.findAll();
        for (const emb of embeddings) {
          await ctx.embeddingRepository.delete(emb.embeddingId);
        }
        count = embeddings.length;
        console.log(`Cleared all ${count} embeddings`);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Failed to clear embeddings:', error);
      process.exit(1);
    }
  });
