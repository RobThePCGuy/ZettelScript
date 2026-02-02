import { Command } from 'commander';
import { initContext } from '../utils.js';
import { ImpactAnalyzer } from '../../engine/manuscript/impact-analyzer.js';
import { RewriteOrchestrator } from '../../engine/manuscript/rewrite-orchestrator.js';
import { createLLMProvider, buildRewritePrompt, type RewriteContext as LLMRewriteContext } from '../../llm/index.js';

export const rewriteCommand = new Command('rewrite')
  .description('Analyze and orchestrate scene rewrites')
  .argument('<scene>', 'The scene to rewrite (path or title)')
  .option('-g, --goal <goal>', 'Rewrite goal description')
  .option('--analyze-only', 'Only show impact analysis, do not generate rewrite')
  .option('--dry-run', 'Show what would change without applying')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (sceneIdentifier: string, options) => {
    try {
      const ctx = await initContext();

      if (!ctx.config.manuscript.enabled) {
        console.log('Manuscript mode not enabled.');
        console.log('Enable with: zettel init --manuscript');
        ctx.connectionManager.close();
        return;
      }

      // Find the scene node
      let scene = await ctx.nodeRepository.findByPath(sceneIdentifier);
      if (!scene) {
        const nodes = await ctx.nodeRepository.findByTitle(sceneIdentifier);
        scene = nodes.find(n => n.type === 'scene') ?? nodes[0] ?? null;
      }

      if (!scene) {
        console.log(`Scene not found: ${sceneIdentifier}`);
        ctx.connectionManager.close();
        return;
      }

      if (scene.type !== 'scene') {
        console.log(`Warning: Node "${scene.title}" is type "${scene.type}", not "scene".`);
      }

      console.log(`Scene: ${scene.title} (${scene.path})\n`);

      // Impact analysis
      const analyzer = new ImpactAnalyzer({
        nodeRepository: ctx.nodeRepository,
        edgeRepository: ctx.edgeRepository,
        graphEngine: ctx.graphEngine,
      });

      console.log('Analyzing impact...\n');
      const impact = await analyzer.analyze(scene.nodeId);

      // Display impact analysis
      console.log('Impact Analysis:');
      console.log(`  Direct dependencies:    ${impact.directImpact.length}`);
      console.log(`  Transitive impact:      ${impact.transitiveImpact.length}`);
      console.log(`  POV-related scenes:     ${impact.povImpact.length}`);
      console.log(`  Timeline-adjacent:      ${impact.timelineImpact.length}`);
      console.log(`  Affected characters:    ${impact.characterImpact.length}`);

      if (options.verbose) {
        if (impact.directImpact.length > 0) {
          console.log('\nDirect dependencies:');
          const directNodes = await ctx.nodeRepository.findByIds(impact.directImpact);
          for (const n of directNodes.slice(0, 10)) {
            console.log(`  - ${n.title}`);
          }
        }

        if (impact.povImpact.length > 0) {
          console.log('\nPOV-related scenes:');
          const povNodes = await ctx.nodeRepository.findByIds(impact.povImpact);
          for (const n of povNodes.slice(0, 10)) {
            console.log(`  - ${n.title}`);
          }
        }

        if (impact.characterImpact.length > 0) {
          console.log('\nAffected characters:');
          for (const c of impact.characterImpact.slice(0, 10)) {
            console.log(`  - ${c}`);
          }
        }
      }

      if (options.analyzeOnly) {
        ctx.connectionManager.close();
        return;
      }

      // Rewrite orchestration
      if (!options.goal) {
        console.log('\nSpecify a rewrite goal with --goal "<goal>"');
        console.log('Example: zettel rewrite "Chapter 1" --goal "Add more tension"');
        ctx.connectionManager.close();
        return;
      }

      console.log(`\nRewrite goal: ${options.goal}\n`);

      const orchestrator = new RewriteOrchestrator({
        nodeRepository: ctx.nodeRepository,
        impact,
      });

      console.log('Gathering context for rewrite...\n');
      const context = await orchestrator.gatherContext(scene.nodeId, options.goal);

      console.log('Context includes:');
      console.log(`  - Scene content: ${context.sceneContent.length} chars`);
      console.log(`  - Character context: ${context.characterContext.length} items`);
      console.log(`  - Timeline context: ${context.timelineContext.length} items`);
      console.log(`  - Related content: ${context.relatedContent.length} items`);

      if (options.dryRun) {
        console.log('\n[Dry run] Would send to LLM for rewrite suggestions.');
        console.log('Context would include the above information.');
        ctx.connectionManager.close();
        return;
      }

      // Try to create LLM provider
      const llmProvider = createLLMProvider(ctx.config.llm);

      if (!llmProvider) {
        console.log('\nLLM not configured. Add to config.yaml:');
        console.log('  llm:');
        console.log('    provider: openai  # or ollama');
        console.log('    model: gpt-4');
        console.log('    apiKey: your-api-key  # for openai');
        console.log('\nManual rewrite context has been gathered and displayed above.');
        ctx.connectionManager.close();
        return;
      }

      // Build rewrite context for LLM
      const povChar = context.sceneMetadata?.pov;
      const rewriteContext: LLMRewriteContext = {
        sceneTitle: scene.title,
        sceneContent: context.sceneContent,
        goal: options.goal,
        characterContext: context.characterContext.map(c => ({
          name: c.name,
          details: c.description,
        })),
        timelineContext: context.timelineContext.map(t => ({
          title: t.title,
          position: String(t.order),
        })),
        relatedContent: context.relatedContent.map(r => ({
          title: r.title,
          excerpt: r.excerpt,
        })),
        ...(povChar && { povCharacter: povChar }),
      };

      console.log('\nGenerating rewrite suggestions...\n');

      try {
        const prompt = buildRewritePrompt(rewriteContext);
        const suggestions = await llmProvider.complete(prompt);

        console.log('Rewrite Suggestions:');
        console.log('='.repeat(50));
        console.log(suggestions);
        console.log('='.repeat(50));
      } catch (error) {
        console.error('LLM request failed:', error instanceof Error ? error.message : error);
        console.log('\nManual rewrite context has been gathered and displayed above.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Rewrite failed:', error);
      process.exit(1);
    }
  });
