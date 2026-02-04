import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import open from 'open';
import { initContext, getZettelScriptDir, Spinner } from '../utils.js';
import type { CLIContext } from '../utils.js';
import { computeDoctorStats, printEmbeddingStatus, printWormholeStatus } from './doctor.js';
import {
  generateVisualizationHtml,
  typeColors,
  type GraphData,
  type GraphNode,
  type GraphLink,
} from './visualize.js';
import {
  getEdgeLayer,
  LAYER_A_EDGES,
  LAYER_B_EDGES,
  type EdgeType,
  type Node,
  type Edge,
} from '../../core/types/index.js';
import {
  assembleFocusBundle,
  type FocusBundle,
  type RelatedNote,
} from '../../discovery/focus-bundle.js';
import {
  SuggestionEngine,
  OrphanEngine,
} from '../../discovery/suggestion-engine.js';

// ============================================================================
// State Management
// ============================================================================

interface FocusState {
  lastFocusedNodeId?: string;
  lastFocusedAt?: string;
}

function getStatePath(vaultPath: string): string {
  return path.join(getZettelScriptDir(vaultPath), 'state.json');
}

function loadFocusState(vaultPath: string): FocusState {
  const statePath = getStatePath(vaultPath);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveFocusState(vaultPath: string, state: FocusState): void {
  const statePath = getStatePath(vaultPath);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

// ============================================================================
// Node Resolution
// ============================================================================

async function resolveTargetNode(
  ctx: CLIContext,
  target?: string
): Promise<Node | null> {
  const { nodeRepository, vaultPath } = ctx;

  // If target provided, resolve it
  if (target) {
    // Try as file path first
    let node = await nodeRepository.findByPath(target);
    if (node) return node;

    // Try as title
    const byTitle = await nodeRepository.findByTitle(target);
    if (byTitle.length > 0) return byTitle[0];

    // Try as alias
    const byAlias = await nodeRepository.findByTitleOrAlias(target);
    if (byAlias.length > 0) return byAlias[0];

    // Try as node ID
    node = await nodeRepository.findById(target);
    if (node) return node;

    return null;
  }

  // No target - use fallback order
  // 1. File with most recent mtime in vault
  const nodes = await nodeRepository.findAll();
  if (nodes.length === 0) return null;

  // Sort by updatedAt descending
  nodes.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const mostRecent = nodes[0];

  // 2. Check last focused node
  const state = loadFocusState(vaultPath);
  if (state.lastFocusedNodeId) {
    const lastFocused = await nodeRepository.findById(state.lastFocusedNodeId);
    if (lastFocused) {
      // Use last focused if it's reasonably recent (edited in last day)
      const lastFocusedTime = lastFocused.updatedAt
        ? new Date(lastFocused.updatedAt).getTime()
        : 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastFocusedTime > oneDayAgo) {
        return lastFocused;
      }
    }
  }

  return mostRecent;
}

// ============================================================================
// Bounded Subgraph Builder
// ============================================================================

interface SubgraphOptions {
  nodeBudget: number;
  maxDepth: number;
}

interface SubgraphResult {
  nodes: Node[];
  edges: Edge[];
  focusNodeId: string;
}

async function buildBoundedSubgraph(
  ctx: CLIContext,
  focusNode: Node,
  options: SubgraphOptions
): Promise<SubgraphResult> {
  const { nodeRepository, edgeRepository } = ctx;
  const { nodeBudget, maxDepth } = options;

  const visitedNodes = new Set<string>([focusNode.nodeId]);
  const collectedNodes: Node[] = [focusNode];
  const collectedEdges: Edge[] = [];
  const edgeSet = new Set<string>();

  // BFS expansion - prioritize Layer A edges, then Layer B
  let frontier = [focusNode.nodeId];
  let depth = 0;

  while (frontier.length > 0 && collectedNodes.length < nodeBudget && depth < maxDepth) {
    const nextFrontier: string[] = [];
    depth++;

    for (const nodeId of frontier) {
      if (collectedNodes.length >= nodeBudget) break;

      // Get all connected edges (both directions)
      const allEdges = await edgeRepository.findConnected(nodeId);

      // Sort by layer priority (A first, then B)
      allEdges.sort((a, b) => {
        const layerA = getEdgeLayer(a.edgeType as EdgeType);
        const layerB = getEdgeLayer(b.edgeType as EdgeType);
        const priority: Record<string, number> = { A: 0, B: 1, C: 2, unknown: 3 };
        return (priority[layerA] || 3) - (priority[layerB] || 3);
      });

      for (const edge of allEdges) {
        if (collectedNodes.length >= nodeBudget) break;

        // Skip Layer C edges in focus mode
        const layer = getEdgeLayer(edge.edgeType as EdgeType);
        if (layer === 'C') continue;

        // Add edge if not seen
        if (!edgeSet.has(edge.edgeId)) {
          edgeSet.add(edge.edgeId);
          collectedEdges.push(edge);
        }

        // Determine neighbor
        const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

        if (!visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          const neighborNode = await nodeRepository.findById(neighborId);
          if (neighborNode) {
            collectedNodes.push(neighborNode);
            nextFrontier.push(neighborId);
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return {
    nodes: collectedNodes,
    edges: collectedEdges,
    focusNodeId: focusNode.nodeId,
  };
}

// ============================================================================
// Graph Data Conversion
// ============================================================================

function subgraphToGraphData(
  result: SubgraphResult,
  nodeColors: Record<string, string>
): GraphData {
  const { nodes, edges, focusNodeId } = result;

  // Calculate degree for node sizing
  const nodeWeights = new Map<string, number>();
  edges.forEach((e) => {
    nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
    nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
  });

  const graphNodes: GraphNode[] = nodes.map((n) => ({
    id: n.nodeId,
    name: n.title,
    type: n.type,
    val: n.nodeId === focusNodeId
      ? 15 // Focus node is larger
      : Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
    color: nodeColors[n.type] || '#94a3b8',
    path: n.path,
    metadata: (n.metadata as Record<string, unknown>) || {},
    updatedAtMs: n.updatedAt ? new Date(n.updatedAt).getTime() : undefined,
  }));

  const graphLinks: GraphLink[] = edges.map((e) => ({
    source: e.sourceId,
    target: e.targetId,
    type: e.edgeType,
    strength: e.strength ?? 1.0,
    provenance: e.provenance,
  }));

  return { nodes: graphNodes, links: graphLinks };
}

// ============================================================================
// Atomic File Writes
// ============================================================================

/**
 * Write content to a file atomically using tmp file + rename.
 * This prevents corruption on crash.
 */
function writeFileAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);

  // Create temp file in same directory to ensure same filesystem
  const tmpPath = path.join(dir, `.${basename}.tmp.${process.pid}`);

  try {
    // Write to temp file
    fs.writeFileSync(tmpPath, content, 'utf-8');

    // Rename atomically (on same filesystem)
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// ============================================================================
// Related Notes Computation
// ============================================================================

/**
 * Compute related notes based on semantic similarity.
 * Uses embeddings to find similar notes not already in the subgraph.
 */
async function computeRelatedNotes(
  ctx: CLIContext,
  focusNodeId: string,
  nodesInView: Node[]
): Promise<RelatedNote[]> {
  const { embeddingRepository, nodeRepository } = ctx;

  // Get focus node embedding
  const focusEmbeddings = await embeddingRepository.findByNodeIds([focusNodeId]);
  if (focusEmbeddings.length === 0) {
    return [];
  }

  const focusEmbedding = focusEmbeddings[0].embedding;
  const nodeIdsInView = new Set(nodesInView.map(n => n.nodeId));

  // Get all embeddings to find related notes
  // Note: In a real implementation, this would use a vector index
  const allNodes = await nodeRepository.findAll();
  const candidateNodeIds = allNodes
    .filter(n => !n.isGhost && !nodeIdsInView.has(n.nodeId))
    .map(n => n.nodeId);

  if (candidateNodeIds.length === 0) {
    return [];
  }

  const candidateEmbeddings = await embeddingRepository.findByNodeIds(candidateNodeIds);

  // Compute similarity scores
  const scored: Array<{ nodeId: string; similarity: number }> = [];

  for (const emb of candidateEmbeddings) {
    const similarity = cosineSimilarity(focusEmbedding, emb.embedding);
    if (similarity >= 0.5) { // Minimum threshold for related notes
      scored.push({ nodeId: emb.nodeId, similarity });
    }
  }

  // Sort by similarity and take top results
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, 15);

  // Build RelatedNote objects
  const nodeMap = new Map(allNodes.map(n => [n.nodeId, n]));

  return top
    .map(({ nodeId, similarity }) => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      return {
        nodeId: node.nodeId,
        title: node.title,
        path: node.path,
        score: similarity,
        reasons: [`${(similarity * 100).toFixed(0)}% similar to focus note`],
        layer: 'B' as const,
        isInView: false,
        signals: {
          semantic: similarity,
        },
      };
    })
    .filter((rn): rn is RelatedNote => rn !== null);
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Command Definition
// ============================================================================

export const focusCommand = new Command('focus')
  .description('Open a focus view centered on a specific note or the most recent file')
  .argument('[target]', 'File path, node title, or node ID to focus on')
  .option('-b, --budget <number>', 'Maximum number of nodes to show', '200')
  .option('-d, --depth <number>', 'Maximum expansion depth', '3')
  .option('-o, --output <path>', 'Output HTML file path')
  .option('--no-open', 'Do not open browser automatically')
  .option('--json-stdout', 'Print FocusBundle JSON to stdout, no file writes')
  .option('--json-only', 'Write focus.json only, print path to stdout')
  .action(
    async (
      target: string | undefined,
      options: {
        budget: string;
        depth: string;
        output?: string;
        open: boolean;
        jsonStdout?: boolean;
        jsonOnly?: boolean;
      }
    ) => {
      // Validate mutually exclusive flags
      if (options.jsonStdout && options.jsonOnly) {
        console.error(JSON.stringify({
          success: false,
          error: '--json-stdout and --json-only are mutually exclusive',
          errorCode: 'INVALID_ARGS',
        }));
        process.exit(1);
      }

      const isJsonMode = options.jsonStdout || options.jsonOnly;

      try {
        const ctx = await initContext();
        const nodeBudget = parseInt(options.budget, 10);
        const maxDepth = parseInt(options.depth, 10);

        // 1. Resolve target node
        let spinner: Spinner | null = null;
        if (!isJsonMode) {
          spinner = new Spinner('Resolving target...');
          spinner.start();
        }

        const focusNode = await resolveTargetNode(ctx, target);

        if (!focusNode) {
          if (spinner) spinner.stop();

          if (isJsonMode) {
            console.log(JSON.stringify({
              success: false,
              error: target ? `Could not find node: "${target}"` : 'No nodes found in vault',
              errorCode: 'NOT_FOUND',
            }));
          } else {
            if (target) {
              console.error(`Could not find node: "${target}"`);
              console.log('\nTry:');
              console.log('  - A file path relative to vault root');
              console.log('  - A note title');
              console.log('  - A node ID');
            } else {
              console.error('No nodes found in vault. Run "zs index" first.');
            }
          }
          ctx.connectionManager.close();
          process.exit(1);
        }

        if (spinner) {
          spinner.update(`Building focus view for "${focusNode.title}"...`);
        }

        // Save focus state (unless in json-stdout mode)
        if (!options.jsonStdout) {
          saveFocusState(ctx.vaultPath, {
            lastFocusedNodeId: focusNode.nodeId,
            lastFocusedAt: new Date().toISOString(),
          });
        }

        // 2. Build bounded subgraph
        const subgraph = await buildBoundedSubgraph(ctx, focusNode, {
          nodeBudget,
          maxDepth,
        });

        // 3. Get health stats
        const statusData = await computeDoctorStats(ctx);

        // 4. Compute suggestions
        const scopeNodeIds = subgraph.nodes.map(n => n.nodeId);

        // Initialize suggestion engines
        const suggestionEngine = new SuggestionEngine(
          ctx.nodeRepository,
          ctx.edgeRepository,
          ctx.mentionRepository,
          ctx.embeddingRepository,
          ctx.candidateEdgeRepository
        );

        const orphanEngine = new OrphanEngine(
          ctx.nodeRepository,
          ctx.edgeRepository,
          ctx.mentionRepository,
          ctx.embeddingRepository
        );

        // Compute candidates (this upserts to DB)
        await suggestionEngine.computeAllCandidates(scopeNodeIds);

        // Get suggested candidate edges for the scope
        const candidateEdges = await ctx.candidateEdgeRepository.findSuggestedForNodes(scopeNodeIds);

        // Compute orphan scores
        const orphanEntries = await orphanEngine.computeOrphanScores(scopeNodeIds);

        // Compute related notes
        const relatedNotes = await computeRelatedNotes(ctx, focusNode.nodeId, subgraph.nodes);

        // 5. Assemble FocusBundle
        const focusBundle = assembleFocusBundle({
          focusNode,
          nodesInView: subgraph.nodes,
          edgesInView: subgraph.edges,
          candidateEdges,
          orphanEntries,
          relatedNotes,
          doctorStats: statusData,
          mode: ctx.config.visualization.mode,
        });

        if (spinner) {
          spinner.stop(
            `Focus: "${focusNode.title}" (${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges)`
          );
        }

        // 6. Handle output based on mode
        const outputDir = options.output
          ? path.dirname(options.output)
          : getZettelScriptDir(ctx.vaultPath);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        if (options.jsonStdout) {
          // JSON stdout mode: print JSON, no file writes
          console.log(JSON.stringify(focusBundle));
        } else if (options.jsonOnly) {
          // JSON only mode: write focus.json, print path
          const jsonPath = path.join(outputDir, 'focus.json');
          writeFileAtomic(jsonPath, JSON.stringify(focusBundle, null, 2));
          console.log(jsonPath);
        } else {
          // Default mode: write both files, print status, optionally open browser

          // Print one-line embedding status
          printEmbeddingStatus(statusData);
          printWormholeStatus(statusData);

          // Write focus.json atomically
          const jsonPath = path.join(outputDir, 'focus.json');
          writeFileAtomic(jsonPath, JSON.stringify(focusBundle, null, 2));

          // Convert to graph data for HTML
          const graphData = subgraphToGraphData(subgraph, typeColors);

          // Generate HTML
          const htmlContent = generateVisualizationHtml(
            graphData,
            typeColors,
            null, // No constellation
            null, // No path data
            null, // No WebSocket
            statusData,
            focusBundle
          );

          // Write HTML
          const outputPath = options.output || path.join(outputDir, 'focus.html');
          writeFileAtomic(outputPath, htmlContent);

          console.log(`\nFocus view generated: ${outputPath}`);
          console.log(`FocusBundle written: ${jsonPath}`);

          // Print suggestion summary
          const suggestionCount = focusBundle.suggestions.candidateLinks.length;
          const orphanCount = focusBundle.suggestions.orphans.length;
          const relatedCount = focusBundle.suggestions.relatedNotes.length;
          if (suggestionCount > 0 || orphanCount > 0 || relatedCount > 0) {
            console.log(`Suggestions: ${relatedCount} related, ${suggestionCount} links, ${orphanCount} orphans`);
          }

          // Open browser
          if (options.open) {
            console.log('Opening in default browser...');
            await open(outputPath);
          }
        }

        ctx.connectionManager.close();
      } catch (error) {
        if (isJsonMode) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = errorMessage.includes('Not in a ZettelScript vault')
            ? 'NOT_VAULT'
            : 'COMPUTE_ERROR';
          console.log(JSON.stringify({
            success: false,
            error: errorMessage,
            errorCode,
          }));
          process.exit(1);
        }

        if (error instanceof Error && error.message.includes('Not in a ZettelScript vault')) {
          console.error('Error: Not in a ZettelScript vault. Run "zs init" first.');
          process.exit(1);
        }
        console.error('Error:', error);
        process.exit(1);
      }
    }
  );
