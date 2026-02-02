import { Command } from 'commander';
import { initContext } from '../utils.js';
import { ContextAssembler } from '../../retrieval/context/assembler.js';
import type { RetrievalQuery } from '../../core/types/index.js';

export const retrieveCommand = new Command('retrieve')
  .description('GraphRAG retrieval for a query')
  .argument('<query>', 'The query to retrieve context for')
  .option('-n, --max-results <n>', 'Maximum results', '10')
  .option('-d, --depth <n>', 'Graph expansion depth', '2')
  .option('-b, --budget <n>', 'Node expansion budget', '30')
  .option('--no-semantic', 'Disable semantic search')
  .option('--no-lexical', 'Disable lexical search')
  .option('--no-graph', 'Disable graph expansion')
  .option('-t, --type <types>', 'Filter by node types (comma-separated)')
  .option('-v, --verbose', 'Show detailed provenance')
  .action(async (queryText: string, options) => {
    try {
      const ctx = await initContext();

      // Check if embeddings are configured
      if (!ctx.config.embeddings.apiKey && ctx.config.embeddings.provider === 'openai') {
        console.log('Note: OpenAI API key not configured. Semantic search disabled.');
        console.log('Set OPENAI_API_KEY or configure in .zettelscript/config.yaml\n');
      }

      const query: RetrievalQuery = {
        text: queryText,
        maxResults: parseInt(options.maxResults, 10),
        expansion: {
          maxDepth: parseInt(options.depth, 10),
          budget: parseInt(options.budget, 10),
        },
      };

      if (options.type) {
        query.filters = {
          nodeTypes: options.type.split(',').map((t: string) => t.trim()),
        };
      }

      console.log(`Retrieving: "${queryText}"\n`);

      const assembler = new ContextAssembler({
        nodeRepository: ctx.nodeRepository,
        edgeRepository: ctx.edgeRepository,
        chunkRepository: ctx.chunkRepository,
        graphEngine: ctx.graphEngine,
        config: ctx.config.retrieval,
      });

      const result = await assembler.retrieve(query);

      if (result.chunks.length === 0) {
        console.log('No relevant content found.');
        console.log('\nTips:');
        console.log('  - Run "zettel index" to index your vault');
        console.log('  - Try broader search terms');
        console.log('  - Use "zettel query stats" to check indexed content');
      } else {
        // Show context
        console.log('=== Retrieved Context ===\n');
        console.log(result.context);
        console.log('\n=== End Context ===\n');

        // Show provenance
        if (options.verbose && result.provenance.length > 0) {
          console.log('Sources:');
          for (const p of result.provenance) {
            const contribution = (p.contribution * 100).toFixed(0);
            console.log(`  [${contribution}%] ${p.path}`);
          }
        } else {
          console.log(`Sources: ${result.provenance.length} nodes`);
        }

        // Show match types
        const matchTypes = new Map<string, number>();
        for (const chunk of result.chunks) {
          matchTypes.set(chunk.matchType, (matchTypes.get(chunk.matchType) || 0) + 1);
        }

        console.log('\nMatch breakdown:');
        for (const [type, count] of matchTypes) {
          console.log(`  ${type}: ${count}`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Retrieval failed:', error);
      process.exit(1);
    }
  });
