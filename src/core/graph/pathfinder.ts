import type { Edge, EdgeType } from '../types/index.js';

/**
 * Result of a path search
 */
export interface PathResult {
  path: string[]; // Node IDs
  edges: EdgeType[]; // Length = path.length - 1
  hopCount: number;
  score: number;
}

/**
 * Options for K-shortest paths search
 */
export interface KShortestPathsOptions {
  k?: number; // Default: 3
  edgeTypes?: EdgeType[]; // Default: explicit_link, sequence, causes, semantic
  maxDepth?: number; // Default: 15
  overlapThreshold?: number; // Default: 0.7 (max allowed Jaccard overlap)
  maxCandidates?: number; // Default: 100
  maxExtraHops?: number; // Default: 2
}

/**
 * Edge penalties for cosmetic scoring (lower = preferred)
 */
const EDGE_PENALTIES: Record<string, number> = {
  explicit_link: 0,
  sequence: 0.1,
  causes: 0.2,
  semantic: 0.3,
  semantic_suggestion: 0.5,
};

/**
 * Default edge penalty for unknown types
 */
const DEFAULT_EDGE_PENALTY = 0.3;

/**
 * Adjacency list entry
 */
interface AdjEntry {
  nodeId: string;
  edgeType: EdgeType;
}

/**
 * Build adjacency lists from edges
 */
export function buildAdjacencyLists(
  edges: Edge[],
  edgeTypes?: EdgeType[]
): {
  forward: Map<string, AdjEntry[]>;
  backward: Map<string, AdjEntry[]>;
} {
  const forward = new Map<string, AdjEntry[]>();
  const backward = new Map<string, AdjEntry[]>();
  const typeSet = edgeTypes ? new Set(edgeTypes) : null;

  for (const edge of edges) {
    if (typeSet && !typeSet.has(edge.edgeType)) continue;

    // Forward adjacency (source -> target)
    if (!forward.has(edge.sourceId)) {
      forward.set(edge.sourceId, []);
    }
    forward.get(edge.sourceId)!.push({
      nodeId: edge.targetId,
      edgeType: edge.edgeType,
    });

    // Backward adjacency (target -> source)
    if (!backward.has(edge.targetId)) {
      backward.set(edge.targetId, []);
    }
    backward.get(edge.targetId)!.push({
      nodeId: edge.sourceId,
      edgeType: edge.edgeType,
    });
  }

  return { forward, backward };
}

/**
 * Bidirectional BFS to find shortest path
 *
 * Key insight: Don't stop at first meeting. Track bestDistance and continue
 * until both frontiers exceed it.
 */
export function bidirectionalBFS(
  startId: string,
  endId: string,
  forward: Map<string, AdjEntry[]>,
  backward: Map<string, AdjEntry[]>,
  maxDepth: number,
  disabledEdges?: Set<string>, // Set of "sourceId->targetId" strings
  disabledNodes?: Set<string>
): { path: string[]; edges: EdgeType[] } | null {
  if (startId === endId) {
    return { path: [startId], edges: [] };
  }

  // Check if start/end are disabled
  if (disabledNodes?.has(startId) || disabledNodes?.has(endId)) {
    return null;
  }

  // Forward search state (from start)
  const forwardVisited = new Map<string, { parent: string | null; edgeType: EdgeType | null }>();
  forwardVisited.set(startId, { parent: null, edgeType: null });
  let forwardQueue: string[] = [startId];
  let forwardDepth = 0;

  // Backward search state (from end)
  const backwardVisited = new Map<string, { parent: string | null; edgeType: EdgeType | null }>();
  backwardVisited.set(endId, { parent: null, edgeType: null });
  let backwardQueue: string[] = [endId];
  let backwardDepth = 0;

  let bestDistance = Infinity;
  let meetingNode: string | null = null;

  while (
    (forwardQueue.length > 0 || backwardQueue.length > 0) &&
    forwardDepth + backwardDepth < bestDistance
  ) {
    // Check depth limit
    if (forwardDepth + backwardDepth >= maxDepth * 2) break;

    // Expand the smaller frontier
    const expandForward =
      forwardQueue.length > 0 &&
      (backwardQueue.length === 0 || forwardQueue.length <= backwardQueue.length);

    if (expandForward && forwardQueue.length > 0) {
      const nextQueue: string[] = [];
      forwardDepth++;

      // Can we possibly find a shorter path?
      if (forwardDepth > bestDistance) break;

      for (const nodeId of forwardQueue) {
        const neighbors = forward.get(nodeId) || [];

        for (const { nodeId: neighborId, edgeType } of neighbors) {
          // Check if edge/node is disabled
          if (disabledNodes?.has(neighborId)) continue;
          const edgeKey = `${nodeId}->${neighborId}`;
          if (disabledEdges?.has(edgeKey)) continue;

          if (!forwardVisited.has(neighborId)) {
            forwardVisited.set(neighborId, { parent: nodeId, edgeType });
            nextQueue.push(neighborId);

            // Check for meeting point
            if (backwardVisited.has(neighborId)) {
              const totalDist = forwardDepth + backwardDepth;
              if (totalDist < bestDistance) {
                bestDistance = totalDist;
                meetingNode = neighborId;
              }
            }
          }
        }
      }
      forwardQueue = nextQueue;
    } else if (backwardQueue.length > 0) {
      const nextQueue: string[] = [];
      backwardDepth++;

      // Can we possibly find a shorter path?
      if (backwardDepth > bestDistance) break;

      for (const nodeId of backwardQueue) {
        const neighbors = backward.get(nodeId) || [];

        for (const { nodeId: neighborId, edgeType } of neighbors) {
          // Check if edge/node is disabled
          if (disabledNodes?.has(neighborId)) continue;
          const edgeKey = `${neighborId}->${nodeId}`;
          if (disabledEdges?.has(edgeKey)) continue;

          if (!backwardVisited.has(neighborId)) {
            backwardVisited.set(neighborId, { parent: nodeId, edgeType });
            nextQueue.push(neighborId);

            // Check for meeting point
            if (forwardVisited.has(neighborId)) {
              const totalDist = forwardDepth + backwardDepth;
              if (totalDist < bestDistance) {
                bestDistance = totalDist;
                meetingNode = neighborId;
              }
            }
          }
        }
      }
      backwardQueue = nextQueue;
    } else {
      break;
    }
  }

  if (!meetingNode) {
    return null;
  }

  // Reconstruct path from start to meeting point
  const pathToMeeting: string[] = [];
  const edgesToMeeting: EdgeType[] = [];
  let current: string | null = meetingNode;

  while (current !== null) {
    pathToMeeting.unshift(current);
    const info = forwardVisited.get(current);
    if (info?.edgeType) {
      edgesToMeeting.unshift(info.edgeType);
    }
    current = info?.parent ?? null;
  }

  // Reconstruct path from meeting point to end
  const pathFromMeeting: string[] = [];
  const edgesFromMeeting: EdgeType[] = [];
  current = backwardVisited.get(meetingNode)?.parent ?? null;

  while (current !== null) {
    pathFromMeeting.push(current);
    const info = backwardVisited.get(current);
    // Edge type is stored in child pointing to parent
    const prevNode: string =
      pathFromMeeting.length > 1 ? pathFromMeeting[pathFromMeeting.length - 2]! : meetingNode;
    const prevInfo = backwardVisited.get(prevNode);
    if (prevInfo?.edgeType) {
      edgesFromMeeting.push(prevInfo.edgeType);
    }
    current = info?.parent ?? null;
  }

  const path = [...pathToMeeting, ...pathFromMeeting];
  const edges = [...edgesToMeeting, ...edgesFromMeeting];

  return { path, edges };
}

/**
 * Calculate Jaccard overlap between two paths
 * Optionally excludes endpoints for short paths
 */
export function calculateJaccardOverlap(
  pathA: string[],
  pathB: string[],
  excludeEndpoints: boolean = false
): number {
  let nodesA = new Set(pathA);
  let nodesB = new Set(pathB);

  if (excludeEndpoints && pathA.length >= 2 && pathB.length >= 2) {
    // Exclude first and last nodes
    nodesA = new Set(pathA.slice(1, -1));
    nodesB = new Set(pathB.slice(1, -1));
  }

  if (nodesA.size === 0 && nodesB.size === 0) {
    // Both have no intermediate nodes, consider as 100% overlap
    return 1.0;
  }

  const intersection = new Set([...nodesA].filter((x) => nodesB.has(x)));
  const union = new Set([...nodesA, ...nodesB]);

  if (union.size === 0) return 1.0;

  return intersection.size / union.size;
}

/**
 * Calculate cosmetic score for a path
 * score = hopCount + sum of edge penalties
 */
export function calculatePathScore(edges: EdgeType[]): number {
  const hopCount = edges.length;
  let penalty = 0;

  for (const edgeType of edges) {
    penalty += EDGE_PENALTIES[edgeType] ?? DEFAULT_EDGE_PENALTY;
  }

  return hopCount + penalty;
}

/**
 * Check if a path is simple (no repeated nodes)
 */
export function isSimplePath(path: string[]): boolean {
  const seen = new Set<string>();
  for (const nodeId of path) {
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
  }
  return true;
}

/**
 * Yen's K-Shortest Paths algorithm with diversity filtering
 *
 * Algorithm:
 * 1. Find shortest path first
 * 2. For each spur node, temporarily remove edges to force deviation
 * 3. Find shortest path through spur node
 * 4. Add to candidate heap
 * 5. Filter by diversity (Jaccard overlap)
 */
export function findKShortestPaths(
  startId: string,
  endId: string,
  edges: Edge[],
  options: KShortestPathsOptions = {}
): { paths: PathResult[]; reason: string } {
  const {
    k = 3,
    edgeTypes = ['explicit_link', 'sequence', 'causes', 'semantic'] as EdgeType[],
    maxDepth = 15,
    overlapThreshold = 0.7,
    maxCandidates = 100,
    maxExtraHops = 2,
  } = options;

  // Build adjacency lists
  const { forward, backward } = buildAdjacencyLists(edges, edgeTypes);

  // Find the first (shortest) path
  const firstResult = bidirectionalBFS(startId, endId, forward, backward, maxDepth);

  if (!firstResult) {
    return { paths: [], reason: 'no_path' };
  }

  const shortestHopCount = firstResult.path.length - 1;
  const maxAllowedHops = shortestHopCount + maxExtraHops;

  // Result paths
  const results: PathResult[] = [
    {
      path: firstResult.path,
      edges: firstResult.edges,
      hopCount: shortestHopCount,
      score: calculatePathScore(firstResult.edges),
    },
  ];

  // Candidate heap: [score, path, edges]
  // We use an array and sort as needed (small heap)
  const candidates: Array<{ path: string[]; edges: EdgeType[]; score: number }> = [];
  const seenPaths = new Set<string>([firstResult.path.join('|')]);

  // Yen's algorithm: iterate over accepted paths
  for (let i = 0; i < results.length && results.length < k; i++) {
    const resultItem = results[i]!;
    const currentPath = resultItem.path;

    // For each spur node (except the last)
    for (let spurIndex = 0; spurIndex < currentPath.length - 1; spurIndex++) {
      const spurNode = currentPath[spurIndex]!;
      const rootPath = currentPath.slice(0, spurIndex + 1);
      const rootEdges = resultItem.edges.slice(0, spurIndex);

      // Disable edges used by paths that share the same root
      const disabledEdges = new Set<string>();
      const disabledNodes = new Set<string>();

      for (const result of results) {
        if (result.path.length > spurIndex) {
          // Check if root matches
          const matchesRoot = rootPath.every((node, idx) => result.path[idx] === node);
          if (matchesRoot && spurIndex < result.path.length - 1) {
            // Disable the edge leaving the spur node in this path
            const edgeKey = `${result.path[spurIndex]}->${result.path[spurIndex + 1]}`;
            disabledEdges.add(edgeKey);
          }
        }
      }

      // Also disable nodes in root path (except spur node) to prevent cycles
      for (let j = 0; j < rootPath.length - 1; j++) {
        const nodeToDisable = rootPath[j];
        if (nodeToDisable) {
          disabledNodes.add(nodeToDisable);
        }
      }

      // Find spur path from spurNode to end
      const spurResult = bidirectionalBFS(
        spurNode,
        endId,
        forward,
        backward,
        maxDepth - spurIndex,
        disabledEdges,
        disabledNodes
      );

      if (spurResult && spurResult.path.length > 1) {
        // Combine root + spur (skip duplicate spur node)
        const totalPath = [...rootPath.slice(0, -1), ...spurResult.path];
        const totalEdges = [...rootEdges, ...spurResult.edges];
        const pathKey = totalPath.join('|');

        // Check if path is valid
        if (
          !seenPaths.has(pathKey) &&
          isSimplePath(totalPath) &&
          totalPath.length - 1 <= maxAllowedHops
        ) {
          seenPaths.add(pathKey);
          candidates.push({
            path: totalPath,
            edges: totalEdges,
            score: calculatePathScore(totalEdges),
          });
        }
      }

      // Cap candidates
      if (candidates.length > maxCandidates) {
        // Sort and trim
        candidates.sort((a, b) => {
          // Primary: hop count ascending
          const hopDiff = a.path.length - 1 - (b.path.length - 1);
          if (hopDiff !== 0) return hopDiff;
          // Secondary: score ascending
          const scoreDiff = a.score - b.score;
          if (scoreDiff !== 0) return scoreDiff;
          // Tertiary: lexical
          return a.path.join('|').localeCompare(b.path.join('|'));
        });
        candidates.length = maxCandidates;
      }
    }

    // Try to add the best candidate that passes diversity check
    if (candidates.length > 0) {
      // Sort candidates
      candidates.sort((a, b) => {
        const hopDiff = a.path.length - 1 - (b.path.length - 1);
        if (hopDiff !== 0) return hopDiff;
        const scoreDiff = a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.path.join('|').localeCompare(b.path.join('|'));
      });

      // Find first candidate that passes diversity check
      let addedIndex = -1;
      for (let j = 0; j < candidates.length; j++) {
        const candidate = candidates[j]!;

        // Check diversity against all accepted paths
        let tooSimilar = false;
        for (const accepted of results) {
          const overlap = calculateJaccardOverlap(
            candidate.path,
            accepted.path,
            candidate.path.length <= 4 || accepted.path.length <= 4
          );
          if (overlap > overlapThreshold) {
            tooSimilar = true;
            break;
          }
        }

        if (!tooSimilar) {
          results.push({
            path: candidate.path,
            edges: candidate.edges,
            hopCount: candidate.path.length - 1,
            score: candidate.score,
          });
          addedIndex = j;
          break;
        }
      }

      // Remove added candidate
      if (addedIndex >= 0) {
        candidates.splice(addedIndex, 1);
      }
    }
  }

  // Determine reason for stopping
  let reason = 'found_all';
  if (results.length < k) {
    if (candidates.length === 0) {
      reason = 'exhausted_candidates';
    } else {
      reason = 'diversity_filter';
    }
  }

  return { paths: results, reason };
}

/**
 * Simple BFS for shortest path (for use in GraphEngine)
 * Uses in-memory adjacency for efficiency
 */
export function simpleBFS(
  startId: string,
  endId: string,
  forward: Map<string, AdjEntry[]>,
  maxDepth: number = 15
): string[] | null {
  if (startId === endId) return [startId];

  const visited = new Map<string, string | null>();
  visited.set(startId, null);
  let queue = [startId];
  let depth = 0;

  while (queue.length > 0 && depth < maxDepth) {
    const nextQueue: string[] = [];
    depth++;

    for (const nodeId of queue) {
      const neighbors = forward.get(nodeId) || [];

      for (const { nodeId: neighborId } of neighbors) {
        if (neighborId === endId) {
          // Reconstruct path
          const path: string[] = [endId, nodeId];
          let current = nodeId;
          while (visited.get(current) !== null) {
            current = visited.get(current)!;
            path.push(current);
          }
          return path.reverse();
        }

        if (!visited.has(neighborId)) {
          visited.set(neighborId, nodeId);
          nextQueue.push(neighborId);
        }
      }
    }

    queue = nextQueue;
  }

  return null;
}
