var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/types/index.ts
import { Type } from "@sinclair/typebox";
var NodeTypeSchema = Type.Union([
  Type.Literal("note"),
  Type.Literal("scene"),
  Type.Literal("character"),
  Type.Literal("location"),
  Type.Literal("object"),
  Type.Literal("event"),
  Type.Literal("concept"),
  Type.Literal("moc"),
  Type.Literal("timeline"),
  Type.Literal("draft")
]);
var NodeSchema = Type.Object({
  nodeId: Type.String(),
  type: NodeTypeSchema,
  title: Type.String(),
  path: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  contentHash: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var EdgeTypeSchema = Type.Union([
  Type.Literal("explicit_link"),
  Type.Literal("backlink"),
  Type.Literal("sequence"),
  Type.Literal("hierarchy"),
  Type.Literal("participation"),
  Type.Literal("pov_visible_to"),
  Type.Literal("causes"),
  Type.Literal("setup_payoff"),
  Type.Literal("semantic"),
  Type.Literal("semantic_suggestion"),
  // Pending semantic wormhole (not yet accepted)
  Type.Literal("mention"),
  Type.Literal("alias")
]);
var EdgeProvenanceSchema = Type.Union([
  Type.Literal("explicit"),
  Type.Literal("inferred"),
  Type.Literal("computed"),
  Type.Literal("user_approved")
]);
var EdgeSchema = Type.Object({
  edgeId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  edgeType: EdgeTypeSchema,
  strength: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  provenance: EdgeProvenanceSchema,
  createdAt: Type.String({ format: "date-time" }),
  versionStart: Type.Optional(Type.String()),
  versionEnd: Type.Optional(Type.String()),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var VersionSchema = Type.Object({
  versionId: Type.String(),
  nodeId: Type.String(),
  contentHash: Type.String(),
  parentVersionId: Type.Optional(Type.String()),
  createdAt: Type.String({ format: "date-time" }),
  summary: Type.Optional(Type.String())
});
var MentionStatusSchema = Type.Union([
  Type.Literal("new"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("deferred")
]);
var MentionCandidateSchema = Type.Object({
  candidateId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  surfaceText: Type.String(),
  spanStart: Type.Optional(Type.Integer()),
  spanEnd: Type.Optional(Type.Integer()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  reasons: Type.Optional(Type.Array(Type.String())),
  status: MentionStatusSchema
});
var ChunkSchema = Type.Object({
  chunkId: Type.String(),
  nodeId: Type.String(),
  text: Type.String(),
  offsetStart: Type.Integer(),
  offsetEnd: Type.Integer(),
  versionId: Type.String(),
  tokenCount: Type.Optional(Type.Integer())
});
var ProposalTypeSchema = Type.Union([
  Type.Literal("link_addition"),
  Type.Literal("content_edit"),
  Type.Literal("node_creation"),
  Type.Literal("node_deletion"),
  Type.Literal("metadata_update")
]);
var ProposalStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("applied")
]);
var ProposalSchema = Type.Object({
  proposalId: Type.String(),
  type: ProposalTypeSchema,
  nodeId: Type.String(),
  description: Type.String(),
  diff: Type.Object({
    before: Type.Optional(Type.String()),
    after: Type.String()
  }),
  status: ProposalStatusSchema,
  createdAt: Type.String({ format: "date-time" }),
  appliedAt: Type.Optional(Type.String({ format: "date-time" })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var GraphMetricsSchema = Type.Object({
  nodeId: Type.String(),
  centralityPagerank: Type.Optional(Type.Number()),
  clusterId: Type.Optional(Type.String()),
  computedAt: Type.String({ format: "date-time" })
});
var FrontmatterSchema = Type.Object(
  {
    id: Type.Optional(Type.String()),
    title: Type.Optional(Type.String()),
    type: Type.Optional(NodeTypeSchema),
    aliases: Type.Optional(Type.Array(Type.String())),
    tags: Type.Optional(Type.Array(Type.String())),
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
    // Manuscript-specific fields
    pov: Type.Optional(Type.String()),
    scene_order: Type.Optional(Type.Number()),
    timeline_position: Type.Optional(Type.String()),
    characters: Type.Optional(Type.Array(Type.String())),
    locations: Type.Optional(Type.Array(Type.String()))
    // Allow additional fields
  },
  { additionalProperties: true }
);
var DEFAULT_CONFIG = {
  vault: {
    path: ".",
    excludePatterns: ["node_modules/**", ".git/**", ".zettelscript/**"]
  },
  database: {
    path: ".zettelscript/zettelscript.db"
  },
  embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536
  },
  retrieval: {
    defaultMaxResults: 20,
    semanticWeight: 0.5,
    lexicalWeight: 0.3,
    graphWeight: 0.2,
    rrfK: 60,
    expansionMaxDepth: 3,
    expansionBudget: 50
  },
  manuscript: {
    enabled: false,
    validatePov: true,
    validateTimeline: true,
    validateSetupPayoff: true
  },
  graph: {
    defaultMaxDepth: 3,
    defaultBudget: 50,
    decayFactor: 0.7,
    scoreThreshold: 0.01
  },
  chunking: {
    maxTokens: 512,
    overlap: 50,
    minChunkSize: 50
  },
  discovery: {
    weights: {
      locality: 0.3,
      centrality: 0.2,
      frequency: 0.2,
      matchQuality: 0.3
    },
    confidenceThreshold: 0.3,
    ambiguityPenalty: 0.7,
    expansionMaxDepth: 4,
    expansionBudget: 100
  },
  cache: {
    defaultTtlMs: 3e5,
    // 5 minutes
    defaultMaxSize: 1e3,
    mentionTtlMs: 6e5,
    // 10 minutes
    mentionMaxSize: 500,
    mocTtlMs: 3e5,
    // 5 minutes
    mocMaxSize: 100
  },
  impact: {
    timelineRange: 5,
    maxTransitiveDepth: 3,
    maxTransitiveBudget: 50
  },
  moc: {
    scoreNormalizationBase: 100,
    hubScoreNormalization: 50,
    clusterScoreNormalization: 20,
    defaultHubThreshold: 5
  },
  versioning: {
    driftVersionWindow: 5,
    butterflyLogDefaultEntries: 50
  },
  search: {
    defaultLimit: 20,
    contextWindowChars: 50,
    diffContextLines: 3
  },
  llm: {
    provider: "none",
    model: "gpt-4"
  }
};

// src/core/graph/pathfinder.ts
var EDGE_PENALTIES = {
  explicit_link: 0,
  sequence: 0.1,
  causes: 0.2,
  semantic: 0.3,
  semantic_suggestion: 0.5
};
var DEFAULT_EDGE_PENALTY = 0.3;
function buildAdjacencyLists(edges2, edgeTypes) {
  const forward = /* @__PURE__ */ new Map();
  const backward = /* @__PURE__ */ new Map();
  const typeSet = edgeTypes ? new Set(edgeTypes) : null;
  for (const edge of edges2) {
    if (typeSet && !typeSet.has(edge.edgeType)) continue;
    if (!forward.has(edge.sourceId)) {
      forward.set(edge.sourceId, []);
    }
    forward.get(edge.sourceId).push({
      nodeId: edge.targetId,
      edgeType: edge.edgeType
    });
    if (!backward.has(edge.targetId)) {
      backward.set(edge.targetId, []);
    }
    backward.get(edge.targetId).push({
      nodeId: edge.sourceId,
      edgeType: edge.edgeType
    });
  }
  return { forward, backward };
}
function bidirectionalBFS(startId, endId, forward, backward, maxDepth, disabledEdges, disabledNodes) {
  if (startId === endId) {
    return { path: [startId], edges: [] };
  }
  if (disabledNodes?.has(startId) || disabledNodes?.has(endId)) {
    return null;
  }
  const forwardVisited = /* @__PURE__ */ new Map();
  forwardVisited.set(startId, { parent: null, edgeType: null });
  let forwardQueue = [startId];
  let forwardDepth = 0;
  const backwardVisited = /* @__PURE__ */ new Map();
  backwardVisited.set(endId, { parent: null, edgeType: null });
  let backwardQueue = [endId];
  let backwardDepth = 0;
  let bestDistance = Infinity;
  let meetingNode = null;
  while ((forwardQueue.length > 0 || backwardQueue.length > 0) && forwardDepth + backwardDepth < bestDistance) {
    if (forwardDepth + backwardDepth >= maxDepth * 2) break;
    const expandForward = forwardQueue.length > 0 && (backwardQueue.length === 0 || forwardQueue.length <= backwardQueue.length);
    if (expandForward && forwardQueue.length > 0) {
      const nextQueue = [];
      forwardDepth++;
      if (forwardDepth > bestDistance) break;
      for (const nodeId of forwardQueue) {
        const neighbors = forward.get(nodeId) || [];
        for (const { nodeId: neighborId, edgeType } of neighbors) {
          if (disabledNodes?.has(neighborId)) continue;
          const edgeKey = `${nodeId}->${neighborId}`;
          if (disabledEdges?.has(edgeKey)) continue;
          if (!forwardVisited.has(neighborId)) {
            forwardVisited.set(neighborId, { parent: nodeId, edgeType });
            nextQueue.push(neighborId);
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
      const nextQueue = [];
      backwardDepth++;
      if (backwardDepth > bestDistance) break;
      for (const nodeId of backwardQueue) {
        const neighbors = backward.get(nodeId) || [];
        for (const { nodeId: neighborId, edgeType } of neighbors) {
          if (disabledNodes?.has(neighborId)) continue;
          const edgeKey = `${neighborId}->${nodeId}`;
          if (disabledEdges?.has(edgeKey)) continue;
          if (!backwardVisited.has(neighborId)) {
            backwardVisited.set(neighborId, { parent: nodeId, edgeType });
            nextQueue.push(neighborId);
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
  const pathToMeeting = [];
  const edgesToMeeting = [];
  let current = meetingNode;
  while (current !== null) {
    pathToMeeting.unshift(current);
    const info = forwardVisited.get(current);
    if (info?.edgeType) {
      edgesToMeeting.unshift(info.edgeType);
    }
    current = info?.parent ?? null;
  }
  const pathFromMeeting = [];
  const edgesFromMeeting = [];
  current = backwardVisited.get(meetingNode)?.parent ?? null;
  while (current !== null) {
    pathFromMeeting.push(current);
    const info = backwardVisited.get(current);
    const prevNode = pathFromMeeting.length > 1 ? pathFromMeeting[pathFromMeeting.length - 2] : meetingNode;
    const prevInfo = backwardVisited.get(prevNode);
    if (prevInfo?.edgeType) {
      edgesFromMeeting.push(prevInfo.edgeType);
    }
    current = info?.parent ?? null;
  }
  const path2 = [...pathToMeeting, ...pathFromMeeting];
  const edges2 = [...edgesToMeeting, ...edgesFromMeeting];
  return { path: path2, edges: edges2 };
}
function calculateJaccardOverlap(pathA, pathB, excludeEndpoints = false) {
  let nodesA = new Set(pathA);
  let nodesB = new Set(pathB);
  if (excludeEndpoints && pathA.length >= 2 && pathB.length >= 2) {
    nodesA = new Set(pathA.slice(1, -1));
    nodesB = new Set(pathB.slice(1, -1));
  }
  if (nodesA.size === 0 && nodesB.size === 0) {
    return 1;
  }
  const intersection = new Set([...nodesA].filter((x) => nodesB.has(x)));
  const union = /* @__PURE__ */ new Set([...nodesA, ...nodesB]);
  if (union.size === 0) return 1;
  return intersection.size / union.size;
}
function calculatePathScore(edges2) {
  const hopCount = edges2.length;
  let penalty = 0;
  for (const edgeType of edges2) {
    penalty += EDGE_PENALTIES[edgeType] ?? DEFAULT_EDGE_PENALTY;
  }
  return hopCount + penalty;
}
function isSimplePath(path2) {
  const seen = /* @__PURE__ */ new Set();
  for (const nodeId of path2) {
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
  }
  return true;
}
function findKShortestPaths(startId, endId, edges2, options = {}) {
  const {
    k = 3,
    edgeTypes = ["explicit_link", "sequence", "causes", "semantic"],
    maxDepth = 15,
    overlapThreshold = 0.7,
    maxCandidates = 100,
    maxExtraHops = 2
  } = options;
  const { forward, backward } = buildAdjacencyLists(edges2, edgeTypes);
  const firstResult = bidirectionalBFS(startId, endId, forward, backward, maxDepth);
  if (!firstResult) {
    return { paths: [], reason: "no_path" };
  }
  const shortestHopCount = firstResult.path.length - 1;
  const maxAllowedHops = shortestHopCount + maxExtraHops;
  const results = [
    {
      path: firstResult.path,
      edges: firstResult.edges,
      hopCount: shortestHopCount,
      score: calculatePathScore(firstResult.edges)
    }
  ];
  const candidates = [];
  const seenPaths = /* @__PURE__ */ new Set([firstResult.path.join("|")]);
  for (let i = 0; i < results.length && results.length < k; i++) {
    const resultItem = results[i];
    const currentPath = resultItem.path;
    for (let spurIndex = 0; spurIndex < currentPath.length - 1; spurIndex++) {
      const spurNode = currentPath[spurIndex];
      const rootPath = currentPath.slice(0, spurIndex + 1);
      const rootEdges = resultItem.edges.slice(0, spurIndex);
      const disabledEdges = /* @__PURE__ */ new Set();
      const disabledNodes = /* @__PURE__ */ new Set();
      for (const result of results) {
        if (result.path.length > spurIndex) {
          const matchesRoot = rootPath.every((node, idx) => result.path[idx] === node);
          if (matchesRoot && spurIndex < result.path.length - 1) {
            const edgeKey = `${result.path[spurIndex]}->${result.path[spurIndex + 1]}`;
            disabledEdges.add(edgeKey);
          }
        }
      }
      for (let j = 0; j < rootPath.length - 1; j++) {
        const nodeToDisable = rootPath[j];
        if (nodeToDisable) {
          disabledNodes.add(nodeToDisable);
        }
      }
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
        const totalPath = [...rootPath.slice(0, -1), ...spurResult.path];
        const totalEdges = [...rootEdges, ...spurResult.edges];
        const pathKey = totalPath.join("|");
        if (!seenPaths.has(pathKey) && isSimplePath(totalPath) && totalPath.length - 1 <= maxAllowedHops) {
          seenPaths.add(pathKey);
          candidates.push({
            path: totalPath,
            edges: totalEdges,
            score: calculatePathScore(totalEdges)
          });
        }
      }
      if (candidates.length > maxCandidates) {
        candidates.sort((a, b) => {
          const hopDiff = a.path.length - 1 - (b.path.length - 1);
          if (hopDiff !== 0) return hopDiff;
          const scoreDiff = a.score - b.score;
          if (scoreDiff !== 0) return scoreDiff;
          return a.path.join("|").localeCompare(b.path.join("|"));
        });
        candidates.length = maxCandidates;
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const hopDiff = a.path.length - 1 - (b.path.length - 1);
        if (hopDiff !== 0) return hopDiff;
        const scoreDiff = a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.path.join("|").localeCompare(b.path.join("|"));
      });
      let addedIndex = -1;
      for (let j = 0; j < candidates.length; j++) {
        const candidate = candidates[j];
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
            score: candidate.score
          });
          addedIndex = j;
          break;
        }
      }
      if (addedIndex >= 0) {
        candidates.splice(addedIndex, 1);
      }
    }
  }
  let reason = "found_all";
  if (results.length < k) {
    if (candidates.length === 0) {
      reason = "exhausted_candidates";
    } else {
      reason = "diversity_filter";
    }
  }
  return { paths: results, reason };
}
function simpleBFS(startId, endId, forward, maxDepth = 15) {
  if (startId === endId) return [startId];
  const visited = /* @__PURE__ */ new Map();
  visited.set(startId, null);
  let queue = [startId];
  let depth = 0;
  while (queue.length > 0 && depth < maxDepth) {
    const nextQueue = [];
    depth++;
    for (const nodeId of queue) {
      const neighbors = forward.get(nodeId) || [];
      for (const { nodeId: neighborId } of neighbors) {
        if (neighborId === endId) {
          const path2 = [endId, nodeId];
          let current = nodeId;
          while (visited.get(current) !== null) {
            current = visited.get(current);
            path2.push(current);
          }
          return path2.reverse();
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

// src/core/graph/engine.ts
var GraphEngine = class {
  nodeRepo;
  edgeRepo;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.config = options.config ?? DEFAULT_CONFIG;
  }
  // ============================================================================
  // Node Operations
  // ============================================================================
  async getNode(nodeId) {
    return this.nodeRepo.findById(nodeId);
  }
  async getNodeByPath(path2) {
    return this.nodeRepo.findByPath(path2);
  }
  async getNodeByTitle(title) {
    return this.nodeRepo.findByTitle(title);
  }
  async getAllNodes() {
    return this.nodeRepo.findAll();
  }
  // ============================================================================
  // Edge Operations
  // ============================================================================
  async getEdge(edgeId) {
    return this.edgeRepo.findById(edgeId);
  }
  async getOutgoingEdges(nodeId, edgeTypes) {
    return this.edgeRepo.findOutgoing(nodeId, edgeTypes);
  }
  async getIncomingEdges(nodeId, edgeTypes) {
    return this.edgeRepo.findIncoming(nodeId, edgeTypes);
  }
  // ============================================================================
  // Backlinks (Spec 6.2)
  // ============================================================================
  /**
   * Get backlinks for a node
   * backlinks(node) = { edge.source_id | edge.edge_type == 'explicit_link' AND edge.target_id == node }
   */
  async getBacklinks(nodeId) {
    const edges2 = await this.edgeRepo.findBacklinks(nodeId);
    if (edges2.length === 0) return [];
    const sourceIds = edges2.map((e) => e.sourceId);
    const sourceNodes = await this.nodeRepo.findByIds(sourceIds);
    const nodeMap = new Map(sourceNodes.map((n) => [n.nodeId, n]));
    const results = [];
    for (const edge of edges2) {
      const sourceNode = nodeMap.get(edge.sourceId);
      if (sourceNode) {
        results.push({
          sourceNode,
          edge
        });
      }
    }
    return results;
  }
  /**
   * Count backlinks for a node
   */
  async countBacklinks(nodeId) {
    const edges2 = await this.edgeRepo.findBacklinks(nodeId);
    return edges2.length;
  }
  // ============================================================================
  // Neighbors
  // ============================================================================
  /**
   * Get all neighbors of a node (both directions)
   */
  async getNeighbors(nodeId, edgeTypes) {
    const neighborsWithNodes = await this.edgeRepo.findNeighborsWithNodes(nodeId, edgeTypes);
    return neighborsWithNodes.map(({ edge, node, direction }) => ({
      node: {
        nodeId: node.nodeId,
        title: node.title,
        type: node.type,
        path: node.path,
        createdAt: "",
        updatedAt: ""
      },
      edge,
      direction
    }));
  }
  /**
   * Get outgoing neighbors
   */
  async getOutgoingNeighbors(nodeId, edgeTypes) {
    const edges2 = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
    if (edges2.length === 0) return [];
    const targetIds = edges2.map((e) => e.targetId);
    return this.nodeRepo.findByIds(targetIds);
  }
  /**
   * Get incoming neighbors
   */
  async getIncomingNeighbors(nodeId, edgeTypes) {
    const edges2 = await this.edgeRepo.findIncoming(nodeId, edgeTypes);
    if (edges2.length === 0) return [];
    const sourceIds = edges2.map((e) => e.sourceId);
    return this.nodeRepo.findByIds(sourceIds);
  }
  // ============================================================================
  // Bounded Graph Traversal (Spec 7.3)
  // ============================================================================
  /**
   * Bounded graph expansion from seed nodes
   *
   * Algorithm:
   * frontier = seed_nodes
   * for depth in 1..max_depth:
   *     if visited_count >= budget: break
   *     for node in frontier:
   *         for edge in outgoing_edges(node, allowed_types):
   *             score = current_score * edge_weight * decay^depth
   *             accumulated_scores[edge.target] = max(existing, score)
   *     frontier = newly_discovered_nodes
   */
  async expandGraph(options) {
    const {
      seedNodes,
      maxDepth = this.config.graph.defaultMaxDepth,
      budget = this.config.graph.defaultBudget,
      edgeTypes = ["explicit_link", "sequence", "hierarchy"],
      decayFactor = this.config.graph.decayFactor,
      includeIncoming = false
    } = options;
    if (seedNodes.length === 0) return [];
    const scores = /* @__PURE__ */ new Map();
    const paths = /* @__PURE__ */ new Map();
    const depths = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seedNodes) {
      scores.set(seed.nodeId, seed.score);
      paths.set(seed.nodeId, [seed.nodeId]);
      depths.set(seed.nodeId, 0);
      frontier.add(seed.nodeId);
    }
    const visited = new Set(frontier);
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (visited.size >= budget) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (visited.size >= budget) break;
        const currentScore = scores.get(nodeId) ?? 0;
        const currentPath = paths.get(nodeId) ?? [];
        const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
        const incoming = includeIncoming ? await this.edgeRepo.findIncoming(nodeId, edgeTypes) : [];
        const allEdges = [...outgoing, ...incoming];
        for (const edge of allEdges) {
          if (visited.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const edgeWeight = edge.strength ?? 1;
          const newScore = currentScore * edgeWeight * Math.pow(decayFactor, depth);
          const existingScore = scores.get(targetId) ?? 0;
          if (newScore > existingScore) {
            scores.set(targetId, newScore);
            paths.set(targetId, [...currentPath, targetId]);
            depths.set(targetId, depth);
          }
          if (!visited.has(targetId)) {
            visited.add(targetId);
            newFrontier.add(targetId);
          }
        }
      }
      frontier = newFrontier;
      if (frontier.size === 0) break;
    }
    const results = [];
    for (const [nodeId, score] of scores) {
      results.push({
        nodeId,
        depth: depths.get(nodeId) ?? 0,
        score,
        path: paths.get(nodeId) ?? []
      });
    }
    return results.sort((a, b) => b.score - a.score);
  }
  // ============================================================================
  // Path Finding
  // ============================================================================
  /**
   * Find shortest path between two nodes using optimized BFS
   */
  async findShortestPath(startId, endId, edgeTypes) {
    if (startId === endId) return [startId];
    const edges2 = await this.edgeRepo.findAll(edgeTypes);
    const { forward } = buildAdjacencyLists(edges2, edgeTypes);
    return simpleBFS(startId, endId, forward, this.config.graph.defaultMaxDepth * 5);
  }
  /**
   * Find K shortest diverse paths between two nodes
   *
   * Uses Yen's algorithm with Jaccard diversity filtering.
   *
   * @param startId - Starting node ID
   * @param endId - Ending node ID
   * @param options - Search options
   * @returns Array of path results and reason for stopping
   */
  async findKShortestPaths(startId, endId, options) {
    const edgeTypes = options?.edgeTypes ?? ["explicit_link", "sequence", "causes", "semantic"];
    const edges2 = await this.edgeRepo.findAll(edgeTypes);
    return findKShortestPaths(startId, endId, edges2, options);
  }
  /**
   * Check if two nodes are connected
   */
  async areConnected(nodeId1, nodeId2, edgeTypes, maxDepth) {
    const depth = maxDepth ?? this.config.graph.defaultMaxDepth;
    const result = await this.expandGraph({
      seedNodes: [{ nodeId: nodeId1, score: 1 }],
      maxDepth: depth,
      budget: 1e3,
      ...edgeTypes && { edgeTypes }
    });
    return result.some((r) => r.nodeId === nodeId2);
  }
  // ============================================================================
  // Subgraph Extraction
  // ============================================================================
  /**
   * Extract a subgraph around a node
   */
  async extractSubgraph(centerNodeId, radius = 2, edgeTypes) {
    const traversal = await this.expandGraph({
      seedNodes: [{ nodeId: centerNodeId, score: 1 }],
      maxDepth: radius,
      budget: 100,
      ...edgeTypes && { edgeTypes },
      includeIncoming: true
    });
    const nodeIds = traversal.map((t) => t.nodeId);
    const nodes2 = await this.nodeRepo.findByIds(nodeIds);
    const nodeIdSet = new Set(nodeIds);
    const edges2 = [];
    for (const nodeId of nodeIds) {
      const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
      for (const edge of outgoing) {
        if (nodeIdSet.has(edge.targetId)) {
          edges2.push(edge);
        }
      }
    }
    return { nodes: nodes2, edges: edges2 };
  }
  // ============================================================================
  // Graph Statistics
  // ============================================================================
  /**
   * Calculate degree for a node
   */
  async getDegree(nodeId) {
    const incoming = await this.edgeRepo.findIncoming(nodeId);
    const outgoing = await this.edgeRepo.findOutgoing(nodeId);
    return {
      in: incoming.length,
      out: outgoing.length,
      total: incoming.length + outgoing.length
    };
  }
  /**
   * Find isolated nodes (no edges)
   */
  async findIsolatedNodes() {
    const allNodes = await this.nodeRepo.findAll();
    const isolated = [];
    for (const node of allNodes) {
      const edges2 = await this.edgeRepo.findConnected(node.nodeId);
      if (edges2.length === 0) {
        isolated.push(node);
      }
    }
    return isolated;
  }
  /**
   * Find nodes with high in-degree (potential hubs)
   */
  async findHighInDegreeNodes(threshold) {
    const minThreshold = threshold ?? this.config.moc?.defaultHubThreshold ?? 5;
    const allNodes = await this.nodeRepo.findAll();
    const results = [];
    for (const node of allNodes) {
      const incoming = await this.edgeRepo.findIncoming(node.nodeId);
      if (incoming.length >= minThreshold) {
        results.push({ node, inDegree: incoming.length });
      }
    }
    return results.sort((a, b) => b.inDegree - a.inDegree);
  }
  // ============================================================================
  // Connected Components
  // ============================================================================
  /**
   * Find connected components in the graph
   */
  async findConnectedComponents() {
    const allNodes = await this.nodeRepo.findAll();
    const visited = /* @__PURE__ */ new Set();
    const components = [];
    for (const node of allNodes) {
      if (visited.has(node.nodeId)) continue;
      const component = [];
      const queue = [node.nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);
        component.push(currentId);
        const edges2 = await this.edgeRepo.findConnected(currentId);
        for (const edge of edges2) {
          const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
      if (component.length > 0) {
        components.push(component);
      }
    }
    return components.sort((a, b) => b.length - a.length);
  }
  /**
   * Get the component containing a specific node
   */
  async getComponentContaining(nodeId) {
    const visited = /* @__PURE__ */ new Set();
    const component = [];
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      component.push(currentId);
      const edges2 = await this.edgeRepo.findConnected(currentId);
      for (const edge of edges2) {
        const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
    return component;
  }
};

// src/core/errors.ts
var ZettelScriptError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ZettelScriptError";
    Error.captureStackTrace(this, this.constructor);
  }
};
var DatabaseError = class extends ZettelScriptError {
  constructor(message, details) {
    super(message, "DATABASE_ERROR", details);
    this.name = "DatabaseError";
  }
};
var ParseError = class extends ZettelScriptError {
  constructor(message, filePath, line, column, details) {
    super(message, "PARSE_ERROR", { filePath, line, column, ...details });
    this.filePath = filePath;
    this.line = line;
    this.column = column;
    this.name = "ParseError";
  }
};
var ResolutionError = class extends ZettelScriptError {
  constructor(message, linkText, candidates, details) {
    super(message, "RESOLUTION_ERROR", { linkText, candidates, ...details });
    this.linkText = linkText;
    this.candidates = candidates;
    this.name = "ResolutionError";
  }
};
var ValidationError = class extends ZettelScriptError {
  constructor(message, issues, details) {
    super(message, "VALIDATION_ERROR", { issues, ...details });
    this.issues = issues;
    this.name = "ValidationError";
  }
};
var ConfigError = class extends ZettelScriptError {
  constructor(message, details) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
};
var GraphError = class extends ZettelScriptError {
  constructor(message, details) {
    super(message, "GRAPH_ERROR", details);
    this.name = "GraphError";
  }
};
var RetrievalError = class extends ZettelScriptError {
  constructor(message, details) {
    super(message, "RETRIEVAL_ERROR", details);
    this.name = "RetrievalError";
  }
};
var FileSystemError = class extends ZettelScriptError {
  constructor(message, filePath, details) {
    super(message, "FILESYSTEM_ERROR", { filePath, ...details });
    this.filePath = filePath;
    this.name = "FileSystemError";
  }
};
var ContinuityError = class extends ZettelScriptError {
  constructor(message, issueType, nodeId, details) {
    super(message, "CONTINUITY_ERROR", { issueType, nodeId, ...details });
    this.issueType = issueType;
    this.nodeId = nodeId;
    this.name = "ContinuityError";
  }
};
var ProposalError = class extends ZettelScriptError {
  constructor(message, proposalId, details) {
    super(message, "PROPOSAL_ERROR", { proposalId, ...details });
    this.proposalId = proposalId;
    this.name = "ProposalError";
  }
};
var EmbeddingError = class extends ZettelScriptError {
  constructor(message, provider, details) {
    super(message, "EMBEDDING_ERROR", { provider, ...details });
    this.provider = provider;
    this.name = "EmbeddingError";
  }
};

// src/storage/database/connection.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// src/storage/database/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aliases: () => aliases,
  chunks: () => chunks,
  constellations: () => constellations,
  edges: () => edges,
  graphMetrics: () => graphMetrics,
  mentionCandidates: () => mentionCandidates,
  nodeEmbeddings: () => nodeEmbeddings,
  nodes: () => nodes,
  proposals: () => proposals,
  unresolvedLinks: () => unresolvedLinks,
  versions: () => versions,
  wormholeRejections: () => wormholeRejections
});
import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
var nodes = sqliteTable(
  "nodes",
  {
    nodeId: text("node_id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    path: text("path").notNull().unique(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    contentHash: text("content_hash"),
    metadata: text("metadata", { mode: "json" })
  },
  (table) => [
    index("idx_nodes_title").on(table.title),
    index("idx_nodes_type").on(table.type),
    index("idx_nodes_path").on(table.path)
  ]
);
var edges = sqliteTable(
  "edges",
  {
    edgeId: text("edge_id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    targetId: text("target_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull(),
    strength: real("strength"),
    provenance: text("provenance").notNull(),
    createdAt: text("created_at").notNull(),
    versionStart: text("version_start"),
    versionEnd: text("version_end"),
    attributes: text("attributes", { mode: "json" })
  },
  (table) => [
    index("idx_edges_source").on(table.sourceId),
    index("idx_edges_target").on(table.targetId),
    index("idx_edges_type").on(table.edgeType),
    index("idx_edges_source_target").on(table.sourceId, table.targetId)
  ]
);
var versions = sqliteTable(
  "versions",
  {
    versionId: text("version_id").primaryKey(),
    nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    parentVersionId: text("parent_version_id"),
    createdAt: text("created_at").notNull(),
    summary: text("summary")
  },
  (table) => [
    index("idx_versions_node").on(table.nodeId),
    index("idx_versions_parent").on(table.parentVersionId)
  ]
);
var mentionCandidates = sqliteTable(
  "mention_candidates",
  {
    candidateId: text("candidate_id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    targetId: text("target_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    surfaceText: text("surface_text").notNull(),
    spanStart: integer("span_start"),
    spanEnd: integer("span_end"),
    confidence: real("confidence").notNull(),
    reasons: text("reasons", { mode: "json" }),
    status: text("status").default("new")
  },
  (table) => [
    index("idx_mentions_source").on(table.sourceId),
    index("idx_mentions_target").on(table.targetId),
    index("idx_mentions_status").on(table.status)
  ]
);
var chunks = sqliteTable(
  "chunks",
  {
    chunkId: text("chunk_id").primaryKey(),
    nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    text: text("text").notNull(),
    offsetStart: integer("offset_start").notNull(),
    offsetEnd: integer("offset_end").notNull(),
    versionId: text("version_id").notNull(),
    tokenCount: integer("token_count")
  },
  (table) => [
    index("idx_chunks_node").on(table.nodeId),
    index("idx_chunks_version").on(table.versionId)
  ]
);
var aliases = sqliteTable(
  "aliases",
  {
    aliasId: text("alias_id").primaryKey(),
    nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    alias: text("alias").notNull()
  },
  (table) => [
    index("idx_aliases_node").on(table.nodeId),
    index("idx_aliases_alias").on(table.alias)
  ]
);
var graphMetrics = sqliteTable("graph_metrics", {
  nodeId: text("node_id").primaryKey().references(() => nodes.nodeId, { onDelete: "cascade" }),
  centralityPagerank: real("centrality_pagerank"),
  clusterId: text("cluster_id"),
  computedAt: text("computed_at").notNull()
});
var proposals = sqliteTable(
  "proposals",
  {
    proposalId: text("proposal_id").primaryKey(),
    type: text("type").notNull(),
    nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    description: text("description").notNull(),
    diff: text("diff", { mode: "json" }).notNull(),
    status: text("status").default("pending"),
    createdAt: text("created_at").notNull(),
    appliedAt: text("applied_at"),
    metadata: text("metadata", { mode: "json" })
  },
  (table) => [
    index("idx_proposals_node").on(table.nodeId),
    index("idx_proposals_status").on(table.status)
  ]
);
var unresolvedLinks = sqliteTable(
  "unresolved_links",
  {
    linkId: text("link_id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    targetText: text("target_text").notNull(),
    spanStart: integer("span_start"),
    spanEnd: integer("span_end"),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("idx_unresolved_source").on(table.sourceId),
    index("idx_unresolved_target").on(table.targetText)
  ]
);
var constellations = sqliteTable(
  "constellations",
  {
    constellationId: text("constellation_id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    // Filter state (JSON arrays)
    hiddenNodeTypes: text("hidden_node_types", { mode: "json" }),
    hiddenEdgeTypes: text("hidden_edge_types", { mode: "json" }),
    // Ghost node config
    showGhosts: integer("show_ghosts").notNull().default(1),
    ghostThreshold: integer("ghost_threshold").notNull().default(1),
    // Camera state
    cameraX: real("camera_x"),
    cameraY: real("camera_y"),
    cameraZoom: real("camera_zoom"),
    // Focus nodes (seed nodes for the view)
    focusNodeIds: text("focus_node_ids", { mode: "json" }),
    // Timestamps
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [index("idx_constellations_name").on(table.name)]
);
var nodeEmbeddings = sqliteTable(
  "node_embeddings",
  {
    embeddingId: text("embedding_id").primaryKey(),
    nodeId: text("node_id").notNull().unique().references(() => nodes.nodeId, { onDelete: "cascade" }),
    embedding: text("embedding", { mode: "json" }).notNull(),
    // Float array as JSON
    model: text("model").notNull(),
    // e.g., 'openai:text-embedding-3-small'
    dimensions: integer("dimensions").notNull(),
    contentHash: text("content_hash").notNull(),
    // To detect when recompute is needed
    computedAt: text("computed_at").notNull()
  },
  (table) => [
    index("idx_embeddings_node").on(table.nodeId),
    index("idx_embeddings_model").on(table.model)
  ]
);
var wormholeRejections = sqliteTable(
  "wormhole_rejections",
  {
    rejectionId: text("rejection_id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    targetId: text("target_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
    sourceContentHash: text("source_content_hash").notNull(),
    targetContentHash: text("target_content_hash").notNull(),
    rejectedAt: text("rejected_at").notNull()
  },
  (table) => [
    index("idx_rejections_source").on(table.sourceId),
    index("idx_rejections_target").on(table.targetId),
    index("idx_rejections_pair").on(table.sourceId, table.targetId)
  ]
);

// src/storage/database/connection.ts
import * as fs from "fs";
import * as path from "path";
var FTS5_SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id,
  node_id,
  text,
  tokenize='porter'
);
`;
var FTS5_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(chunk_id, node_id, text)
  VALUES (new.chunk_id, new.node_id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.chunk_id;
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.chunk_id;
  INSERT INTO chunks_fts(chunk_id, node_id, text)
  VALUES (new.chunk_id, new.node_id, new.text);
END;
`;
var SCHEMA_VERSION = 2;
var ConnectionManager = class _ConnectionManager {
  static instance = null;
  sqlite = null;
  db = null;
  dbPath;
  constructor(dbPath) {
    this.dbPath = dbPath;
  }
  /**
   * Get or create the singleton connection manager
   */
  static getInstance(dbPath) {
    if (!_ConnectionManager.instance) {
      if (!dbPath) {
        throw new DatabaseError("Database path required for initial connection");
      }
      _ConnectionManager.instance = new _ConnectionManager(dbPath);
    }
    return _ConnectionManager.instance;
  }
  /**
   * Reset the singleton (useful for testing)
   */
  static resetInstance() {
    if (_ConnectionManager.instance) {
      _ConnectionManager.instance.close();
      _ConnectionManager.instance = null;
    }
  }
  /**
   * Initialize the database connection and schema
   */
  async initialize() {
    if (this.db) {
      return;
    }
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.sqlite = new Database(this.dbPath);
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.pragma("synchronous = NORMAL");
      this.db = drizzle(this.sqlite, { schema: schema_exports });
      await this.migrate();
    } catch (error) {
      throw new DatabaseError(`Failed to initialize database: ${error}`, {
        path: this.dbPath,
        error: String(error)
      });
    }
  }
  /**
   * Run database migrations
   */
  async migrate() {
    if (!this.sqlite) {
      throw new DatabaseError("SQLite connection not initialized");
    }
    let currentVersion = 0;
    try {
      const result = this.sqlite.prepare("SELECT version FROM schema_version LIMIT 1").get();
      if (result) {
        currentVersion = result.version;
      }
    } catch {
    }
    if (currentVersion >= SCHEMA_VERSION) {
      return;
    }
    this.sqlite.exec(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      -- Nodes
      CREATE TABLE IF NOT EXISTS nodes (
        node_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        content_hash TEXT,
        metadata TEXT
      );

      -- Edges with version ranges
      CREATE TABLE IF NOT EXISTS edges (
        edge_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        edge_type TEXT NOT NULL,
        strength REAL,
        provenance TEXT NOT NULL,
        created_at TEXT NOT NULL,
        version_start TEXT,
        version_end TEXT,
        attributes TEXT
      );

      -- Version history
      CREATE TABLE IF NOT EXISTS versions (
        version_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        content_hash TEXT NOT NULL,
        parent_version_id TEXT,
        created_at TEXT NOT NULL,
        summary TEXT
      );

      -- Mention candidates
      CREATE TABLE IF NOT EXISTS mention_candidates (
        candidate_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        surface_text TEXT NOT NULL,
        span_start INTEGER,
        span_end INTEGER,
        confidence REAL NOT NULL,
        reasons TEXT,
        status TEXT DEFAULT 'new'
      );

      -- Chunks for retrieval
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        offset_start INTEGER NOT NULL,
        offset_end INTEGER NOT NULL,
        version_id TEXT NOT NULL,
        token_count INTEGER
      );

      -- Aliases
      CREATE TABLE IF NOT EXISTS aliases (
        alias_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        alias TEXT NOT NULL
      );

      -- Graph metrics cache
      CREATE TABLE IF NOT EXISTS graph_metrics (
        node_id TEXT PRIMARY KEY REFERENCES nodes(node_id) ON DELETE CASCADE,
        centrality_pagerank REAL,
        cluster_id TEXT,
        computed_at TEXT NOT NULL
      );

      -- Proposals
      CREATE TABLE IF NOT EXISTS proposals (
        proposal_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        diff TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        applied_at TEXT,
        metadata TEXT
      );

      -- Unresolved links
      CREATE TABLE IF NOT EXISTS unresolved_links (
        link_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_text TEXT NOT NULL,
        span_start INTEGER,
        span_end INTEGER,
        created_at TEXT NOT NULL
      );

      -- Constellations (saved graph views)
      CREATE TABLE IF NOT EXISTS constellations (
        constellation_id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        hidden_node_types TEXT,
        hidden_edge_types TEXT,
        show_ghosts INTEGER NOT NULL DEFAULT 1,
        ghost_threshold INTEGER NOT NULL DEFAULT 1,
        camera_x REAL,
        camera_y REAL,
        camera_zoom REAL,
        focus_node_ids TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Node embeddings (for semantic wormholes)
      CREATE TABLE IF NOT EXISTS node_embeddings (
        embedding_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL UNIQUE REFERENCES nodes(node_id) ON DELETE CASCADE,
        embedding TEXT NOT NULL,
        model TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        computed_at TEXT NOT NULL
      );

      -- Wormhole rejections (tracks rejected semantic suggestions)
      CREATE TABLE IF NOT EXISTS wormhole_rejections (
        rejection_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        source_content_hash TEXT NOT NULL,
        target_content_hash TEXT NOT NULL,
        rejected_at TEXT NOT NULL
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_nodes_title ON nodes(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_path ON nodes(path);
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);
      CREATE INDEX IF NOT EXISTS idx_edges_source_target ON edges(source_id, target_id);
      CREATE INDEX IF NOT EXISTS idx_versions_node ON versions(node_id);
      CREATE INDEX IF NOT EXISTS idx_versions_parent ON versions(parent_version_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_source ON mention_candidates(source_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_target ON mention_candidates(target_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_status ON mention_candidates(status);
      CREATE INDEX IF NOT EXISTS idx_chunks_node ON chunks(node_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_version ON chunks(version_id);
      CREATE INDEX IF NOT EXISTS idx_aliases_node ON aliases(node_id);
      CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_proposals_node ON proposals(node_id);
      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
      CREATE INDEX IF NOT EXISTS idx_unresolved_source ON unresolved_links(source_id);
      CREATE INDEX IF NOT EXISTS idx_unresolved_target ON unresolved_links(target_text);
      CREATE INDEX IF NOT EXISTS idx_constellations_name ON constellations(name);
      CREATE INDEX IF NOT EXISTS idx_embeddings_node ON node_embeddings(node_id);
      CREATE INDEX IF NOT EXISTS idx_embeddings_model ON node_embeddings(model);
      CREATE INDEX IF NOT EXISTS idx_rejections_source ON wormhole_rejections(source_id);
      CREATE INDEX IF NOT EXISTS idx_rejections_target ON wormhole_rejections(target_id);
      CREATE INDEX IF NOT EXISTS idx_rejections_pair ON wormhole_rejections(source_id, target_id);
    `);
    this.sqlite.exec(FTS5_SCHEMA);
    this.sqlite.exec(FTS5_TRIGGERS);
    this.sqlite.exec(`
      DELETE FROM schema_version;
      INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});
    `);
  }
  /**
   * Get the Drizzle database instance
   */
  getDb() {
    if (!this.db) {
      throw new DatabaseError("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }
  /**
   * Get the raw SQLite database instance (for FTS5 and custom queries)
   */
  getSqlite() {
    if (!this.sqlite) {
      throw new DatabaseError("Database not initialized. Call initialize() first.");
    }
    return this.sqlite;
  }
  /**
   * Close the database connection
   */
  close() {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
    }
  }
  /**
   * Run a transaction
   */
  transaction(fn) {
    const sqlite = this.getSqlite();
    return sqlite.transaction(fn)();
  }
  /**
   * Check if the database is initialized
   */
  isInitialized() {
    return this.db !== null;
  }
  /**
   * Get database statistics
   */
  getStats() {
    const sqlite = this.getSqlite();
    const nodeCount = sqlite.prepare("SELECT COUNT(*) as count FROM nodes").get().count;
    const edgeCount = sqlite.prepare("SELECT COUNT(*) as count FROM edges").get().count;
    const chunkCount = sqlite.prepare("SELECT COUNT(*) as count FROM chunks").get().count;
    const stats = fs.statSync(this.dbPath);
    return {
      nodeCount,
      edgeCount,
      chunkCount,
      dbSizeBytes: stats.size
    };
  }
};
async function getDatabase(vaultPath) {
  const dbPath = path.join(vaultPath, ".zettelscript", "zettelscript.db");
  const manager = ConnectionManager.getInstance(dbPath);
  await manager.initialize();
  return manager.getDb();
}
function getRawSqlite(vaultPath) {
  const dbPath = path.join(vaultPath, ".zettelscript", "zettelscript.db");
  const manager = ConnectionManager.getInstance(dbPath);
  return manager.getSqlite();
}

// src/parser/markdown.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkStringify from "remark-stringify";

// src/parser/frontmatter.ts
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
var FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
function parseFrontmatter(source, filePath) {
  const match = source.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0
    };
  }
  const yamlContent = match[1];
  const fullMatch = match[0];
  if (!yamlContent) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0
    };
  }
  try {
    const parsed = parseYaml(yamlContent);
    return {
      frontmatter: parsed ?? null,
      content: source.slice(fullMatch.length),
      contentStartOffset: fullMatch.length
    };
  } catch (error) {
    throw new ParseError(`Invalid YAML frontmatter: ${error}`, filePath, void 0, void 0, {
      yaml: yamlContent
    });
  }
}
function extractTitle(frontmatter, content, filePath) {
  if (frontmatter?.title) {
    return frontmatter.title;
  }
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }
  const filename = filePath.split("/").pop() || filePath;
  return filename.replace(/\.md$/, "");
}
function extractNodeType(frontmatter) {
  if (frontmatter?.type) {
    return frontmatter.type;
  }
  return "note";
}
function extractAliases(frontmatter) {
  if (!frontmatter?.aliases) {
    return [];
  }
  if (Array.isArray(frontmatter.aliases)) {
    return frontmatter.aliases.filter((a) => typeof a === "string");
  }
  return [];
}
function serializeFrontmatter(frontmatter) {
  return `---
${stringifyYaml(frontmatter)}---
`;
}
function updateFrontmatter(source, updates, filePath) {
  const { frontmatter, content } = parseFrontmatter(source, filePath);
  const newFrontmatter = {
    ...frontmatter,
    ...updates
  };
  return serializeFrontmatter(newFrontmatter) + content;
}
function validateFrontmatter(frontmatter) {
  const errors = [];
  const validTypes = [
    "note",
    "scene",
    "character",
    "location",
    "object",
    "event",
    "concept",
    "moc",
    "timeline",
    "draft"
  ];
  if (frontmatter.type && !validTypes.includes(frontmatter.type)) {
    errors.push(`Invalid type "${frontmatter.type}". Valid types: ${validTypes.join(", ")}`);
  }
  if (frontmatter.aliases !== void 0 && !Array.isArray(frontmatter.aliases)) {
    errors.push("aliases must be an array");
  }
  if (frontmatter.tags !== void 0 && !Array.isArray(frontmatter.tags)) {
    errors.push("tags must be an array");
  }
  if (frontmatter.scene_order !== void 0 && typeof frontmatter.scene_order !== "number") {
    errors.push("scene_order must be a number");
  }
  if (frontmatter.characters !== void 0 && !Array.isArray(frontmatter.characters)) {
    errors.push("characters must be an array");
  }
  if (frontmatter.locations !== void 0 && !Array.isArray(frontmatter.locations)) {
    errors.push("locations must be an array");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// src/parser/exclusions.ts
var PATTERNS = {
  // Fenced code blocks (``` or ~~~)
  codeBlock: /```[\s\S]*?```|~~~[\s\S]*?~~~/g,
  // Inline code
  inlineCode: /`[^`\n]+`/g,
  // URLs (http, https, ftp)
  url: /(?:https?|ftp):\/\/[^\s<>[\]()]+/g,
  // Markdown links [text](url) and ![alt](url)
  markdownLink: /!?\[[^\]]*\]\([^)]+\)/g,
  // Existing wikilinks [[...]]
  wikilink: /\[\[[^\]]+\]\]/g,
  // HTML tags
  htmlTag: /<[^>]+>/g,
  // HTML comments
  htmlComment: /<!--[\s\S]*?-->/g,
  // LaTeX math blocks
  mathBlock: /\$\$[\s\S]*?\$\$/g,
  // Inline math
  inlineMath: /\$[^$\n]+\$/g
};
function findExclusionZones(content, frontmatterOffset = 0) {
  const zones = [];
  if (frontmatterOffset > 0) {
    zones.push({
      start: 0,
      end: frontmatterOffset,
      type: "frontmatter"
    });
  }
  for (const match of content.matchAll(PATTERNS.codeBlock)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "code_block"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.inlineCode)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "inline_code"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.url)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "url"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.wikilink)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "existing_link"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.markdownLink)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "existing_link"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.htmlTag)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "html_tag"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.htmlComment)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "html_tag"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.mathBlock)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "code_block"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.inlineMath)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "inline_code"
      });
    }
  }
  return mergeZones(zones);
}
function mergeZones(zones) {
  if (zones.length === 0) return [];
  zones.sort((a, b) => a.start - b.start);
  const merged = [];
  let current = zones[0];
  if (!current) return [];
  for (let i = 1; i < zones.length; i++) {
    const next = zones[i];
    if (!next) continue;
    if (next.start <= current.end) {
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
        type: current.type
        // Keep the type of the first zone
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}
function overlapsExclusionZone(start, end, zones) {
  return zones.some((zone) => start < zone.end && end > zone.start);
}
function filterExcludedMatches(matches, zones) {
  return matches.filter((match) => !overlapsExclusionZone(match.start, match.end, zones));
}

// src/parser/wikilink.ts
var WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
var ID_PREFIX = "id:";
function extractWikilinks(content, contentStartOffset = 0) {
  const exclusionZones = findExclusionZones(content, contentStartOffset);
  const rawLinks = [];
  for (const match of content.matchAll(WIKILINK_REGEX)) {
    if (match.index === void 0) continue;
    const raw = match[0];
    const targetPart = match[1]?.trim() ?? "";
    const displayPart = match[2]?.trim();
    const isIdLink = targetPart.startsWith(ID_PREFIX);
    const target = isIdLink ? targetPart.slice(ID_PREFIX.length) : targetPart;
    const display = displayPart ?? target;
    const start = match.index + contentStartOffset;
    const end = start + raw.length;
    rawLinks.push({
      raw,
      target,
      display,
      isIdLink,
      start,
      end
    });
  }
  const links = filterExcludedMatches(
    rawLinks,
    exclusionZones.filter((z) => z.type !== "existing_link")
  );
  return { links, exclusionZones };
}
function extractLinkTargets(content) {
  const { links } = extractWikilinks(content);
  return links.map((link) => link.target);
}
function hasWikilinks(content) {
  WIKILINK_REGEX.lastIndex = 0;
  return WIKILINK_REGEX.test(content);
}
function createWikilink(target, display, useIdPrefix = false) {
  const targetPart = useIdPrefix ? `id:${target}` : target;
  if (display && display !== target) {
    return `[[${targetPart}|${display}]]`;
  }
  return `[[${targetPart}]]`;
}
function insertWikilink(content, start, end, target, display) {
  const before = content.slice(0, start);
  const after = content.slice(end);
  const link = createWikilink(target, display);
  return before + link + after;
}
function getUniqueTargets(content) {
  const { links } = extractWikilinks(content);
  return new Set(links.map((link) => link.target));
}
function normalizeTarget(target) {
  return target.trim().replace(/\s+/g, " ");
}
function targetsMatch(target1, target2) {
  return normalizeTarget(target1).toLowerCase() === normalizeTarget(target2).toLowerCase();
}
function parseWikilinkString(wikilink) {
  const match = wikilink.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (!match) return null;
  const targetPart = match[1]?.trim() ?? "";
  const displayPart = match[2]?.trim();
  const isIdLink = targetPart.startsWith(ID_PREFIX);
  const target = isIdLink ? targetPart.slice(ID_PREFIX.length) : targetPart;
  const display = displayPart ?? target;
  return {
    raw: wikilink,
    target,
    display,
    isIdLink,
    start: 0,
    end: wikilink.length
  };
}
var DEFAULT_CONTEXT_CHARS = 50;
function getWikilinkContext(content, link, contextChars = DEFAULT_CONTEXT_CHARS) {
  const start = Math.max(0, link.start - contextChars);
  const end = Math.min(content.length, link.end + contextChars);
  let context = content.slice(start, end);
  if (start > 0) context = "..." + context;
  if (end < content.length) context = context + "...";
  return context;
}

// src/parser/markdown.ts
function createProcessor() {
  return unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkStringify);
}
function parseMarkdown(source, filePath) {
  const { frontmatter, content, contentStartOffset } = parseFrontmatter(source, filePath);
  const title = extractTitle(frontmatter, content, filePath);
  const type = extractNodeType(frontmatter);
  const aliases2 = extractAliases(frontmatter);
  const linkResult = extractWikilinks(content, contentStartOffset);
  const processor = createProcessor();
  const ast = processor.parse(source);
  const headings = [];
  const paragraphs = [];
  function visitNode(node) {
    if (node.type === "heading" && node.position) {
      const heading = node;
      const text2 = getTextContent(heading);
      headings.push({
        level: heading.depth,
        text: text2,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0
        }
      });
    }
    if (node.type === "paragraph" && node.position) {
      const paragraph = node;
      const text2 = getTextContent(paragraph);
      paragraphs.push({
        text: text2,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0
        }
      });
    }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visitNode(child);
      }
    }
  }
  for (const node of ast.children) {
    visitNode(node);
  }
  return {
    frontmatter,
    title,
    type,
    aliases: aliases2,
    content,
    contentStartOffset,
    links: linkResult.links,
    exclusionZones: linkResult.exclusionZones,
    headings,
    paragraphs,
    ast
  };
}
function getTextContent(node) {
  if (node.type === "text") {
    return node.value;
  }
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((child) => getTextContent(child)).join("");
  }
  return "";
}
function extractPlainText(source) {
  const processor = createProcessor();
  const ast = processor.parse(source);
  function getText(node) {
    if (node.type === "text") {
      return node.value;
    }
    if (node.type === "code") {
      return "";
    }
    if (node.type === "yaml") {
      return "";
    }
    if ("children" in node && Array.isArray(node.children)) {
      return node.children.map((child) => getText(child)).join(" ");
    }
    return "";
  }
  return ast.children.map((node) => getText(node)).join("\n").replace(/\s+/g, " ").trim();
}
function splitIntoSections(parsed) {
  const sections = [];
  const source = parsed.content;
  if (parsed.headings.length === 0) {
    return [
      {
        heading: null,
        level: 0,
        content: source,
        start: parsed.contentStartOffset,
        end: parsed.contentStartOffset + source.length
      }
    ];
  }
  const firstHeading = parsed.headings[0];
  if (firstHeading && firstHeading.position.start > parsed.contentStartOffset) {
    const contentBefore = source.slice(0, firstHeading.position.start - parsed.contentStartOffset);
    if (contentBefore.trim()) {
      sections.push({
        heading: null,
        level: 0,
        content: contentBefore,
        start: parsed.contentStartOffset,
        end: firstHeading.position.start
      });
    }
  }
  for (let i = 0; i < parsed.headings.length; i++) {
    const heading = parsed.headings[i];
    const nextHeading = parsed.headings[i + 1];
    if (!heading) continue;
    const start = heading.position.end;
    const end = nextHeading ? nextHeading.position.start : parsed.contentStartOffset + source.length;
    const content = source.slice(
      start - parsed.contentStartOffset,
      end - parsed.contentStartOffset
    );
    sections.push({
      heading: heading.text,
      level: heading.level,
      content: content.trim(),
      start,
      end
    });
  }
  return sections;
}
function splitIntoParagraphs(content) {
  const paragraphs = [];
  const regex = /(?:\r?\n){2,}/g;
  let lastEnd = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text2 = content.slice(lastEnd, match.index).trim();
    if (text2) {
      paragraphs.push({
        text: text2,
        start: lastEnd,
        end: match.index
      });
    }
    lastEnd = match.index + match[0].length;
  }
  const remaining = content.slice(lastEnd).trim();
  if (remaining) {
    paragraphs.push({
      text: remaining,
      start: lastEnd,
      end: content.length
    });
  }
  return paragraphs;
}
function stringifyMarkdown(ast) {
  const processor = createProcessor();
  return processor.stringify(ast);
}

// src/parser/resolver.ts
var LinkResolver = class {
  constructor(options) {
    this.options = options;
  }
  cache = /* @__PURE__ */ new Map();
  /**
   * Resolve a single wikilink
   */
  async resolveLink(link) {
    if (link.isIdLink) {
      const node = await this.options.findById(link.target);
      return {
        ...link,
        resolvedNodeId: node?.nodeId ?? null,
        ambiguous: false,
        candidates: node ? [node.nodeId] : []
      };
    }
    const normalizedTarget = normalizeTarget(link.target);
    let candidates = this.cache.get(normalizedTarget.toLowerCase());
    if (!candidates) {
      candidates = await this.options.findByTitleOrAlias(normalizedTarget);
      this.cache.set(normalizedTarget.toLowerCase(), candidates);
    }
    if (candidates.length === 0) {
      return {
        ...link,
        resolvedNodeId: null,
        ambiguous: false,
        candidates: []
      };
    }
    if (candidates.length === 1) {
      return {
        ...link,
        resolvedNodeId: candidates[0]?.nodeId ?? null,
        ambiguous: false,
        candidates: [candidates[0]?.nodeId ?? ""]
      };
    }
    const exactMatch = candidates.find((c) => targetsMatch(c.title, normalizedTarget));
    if (exactMatch) {
      return {
        ...link,
        resolvedNodeId: exactMatch.nodeId,
        ambiguous: false,
        candidates: candidates.map((c) => c.nodeId)
      };
    }
    return {
      ...link,
      resolvedNodeId: null,
      ambiguous: true,
      candidates: candidates.map((c) => c.nodeId)
    };
  }
  /**
   * Resolve multiple wikilinks
   */
  async resolveLinks(links) {
    const resolved = [];
    const unresolved = [];
    const ambiguous = [];
    for (const link of links) {
      const result = await this.resolveLink(link);
      if (result.ambiguous) {
        ambiguous.push(link);
      } else if (result.resolvedNodeId === null) {
        unresolved.push(link);
      }
      resolved.push(result);
    }
    return { resolved, unresolved, ambiguous };
  }
  /**
   * Clear the resolution cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: 0
      // Would need to track this separately
    };
  }
};
function createLinkResolver(nodeRepository) {
  return new LinkResolver({
    findByTitle: nodeRepository.findByTitle.bind(nodeRepository),
    findById: nodeRepository.findById.bind(nodeRepository),
    findByTitleOrAlias: nodeRepository.findByTitleOrAlias.bind(nodeRepository)
  });
}
var InMemoryLinkResolver = class {
  nodesByTitle = /* @__PURE__ */ new Map();
  nodesById = /* @__PURE__ */ new Map();
  nodesByAlias = /* @__PURE__ */ new Map();
  /**
   * Add a node to the resolver
   */
  addNode(node, aliases2 = []) {
    this.nodesById.set(node.nodeId, node);
    const titleLower = node.title.toLowerCase();
    const titleNodes = this.nodesByTitle.get(titleLower) || [];
    titleNodes.push(node);
    this.nodesByTitle.set(titleLower, titleNodes);
    for (const alias of aliases2) {
      const aliasLower = alias.toLowerCase();
      const aliasNodes = this.nodesByAlias.get(aliasLower) || [];
      aliasNodes.push(node);
      this.nodesByAlias.set(aliasLower, aliasNodes);
    }
  }
  /**
   * Resolve a wikilink
   */
  resolveLink(link) {
    if (link.isIdLink) {
      const node = this.nodesById.get(link.target);
      return {
        ...link,
        resolvedNodeId: node?.nodeId ?? null,
        ambiguous: false,
        candidates: node ? [node.nodeId] : []
      };
    }
    const normalized = normalizeTarget(link.target).toLowerCase();
    const titleMatches = this.nodesByTitle.get(normalized) || [];
    const aliasMatches = this.nodesByAlias.get(normalized) || [];
    const candidateMap = /* @__PURE__ */ new Map();
    for (const node of [...titleMatches, ...aliasMatches]) {
      candidateMap.set(node.nodeId, node);
    }
    const candidates = Array.from(candidateMap.values());
    if (candidates.length === 0) {
      return {
        ...link,
        resolvedNodeId: null,
        ambiguous: false,
        candidates: []
      };
    }
    if (candidates.length === 1) {
      return {
        ...link,
        resolvedNodeId: candidates[0]?.nodeId ?? null,
        ambiguous: false,
        candidates: [candidates[0]?.nodeId ?? ""]
      };
    }
    const exactMatch = candidates.find((c) => targetsMatch(c.title, link.target));
    if (exactMatch) {
      return {
        ...link,
        resolvedNodeId: exactMatch.nodeId,
        ambiguous: false,
        candidates: candidates.map((c) => c.nodeId)
      };
    }
    return {
      ...link,
      resolvedNodeId: null,
      ambiguous: true,
      candidates: candidates.map((c) => c.nodeId)
    };
  }
  /**
   * Clear all indexed nodes
   */
  clear() {
    this.nodesByTitle.clear();
    this.nodesById.clear();
    this.nodesByAlias.clear();
  }
};

// src/indexer/pipeline.ts
var IndexingPipeline = class {
  nodeRepo;
  edgeRepo;
  versionRepo;
  resolver = null;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.versionRepo = options.versionRepository;
  }
  /**
   * Initialize the link resolver
   */
  async getResolver() {
    if (!this.resolver) {
      this.resolver = createLinkResolver(this.nodeRepo);
    }
    return this.resolver;
  }
  /**
   * Clear resolver cache (call after batch operations)
   */
  clearResolverCache() {
    if (this.resolver) {
      this.resolver.clearCache();
    }
  }
  /**
   * Index a single file
   */
  async indexFile(file) {
    const parsed = parseMarkdown(file.content, file.relativePath);
    const node = await this.upsertNode(file, parsed);
    await this.createVersionIfNeeded(node, file.contentHash);
    await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);
    const { links, edges: edges2, unresolved, ambiguous } = await this.processLinks(node, parsed.links);
    return { node, links, edges: edges2, unresolved, ambiguous };
  }
  /**
   * Create or update a node from file info
   */
  async upsertNode(file, parsed) {
    const existing = await this.nodeRepo.findByPath(file.relativePath);
    const nodeData = {
      type: parsed.type,
      title: parsed.title,
      path: file.relativePath,
      createdAt: existing?.createdAt || file.stats.createdAt.toISOString(),
      updatedAt: file.stats.modifiedAt.toISOString(),
      contentHash: file.contentHash,
      ...parsed.frontmatter && { metadata: { ...parsed.frontmatter } }
    };
    if (existing) {
      return this.nodeRepo.update(existing.nodeId, nodeData);
    }
    return this.nodeRepo.create(nodeData);
  }
  /**
   * Create a version entry if content has changed
   */
  async createVersionIfNeeded(node, contentHash) {
    const latestVersion = await this.versionRepo.findLatest(node.nodeId);
    if (latestVersion?.contentHash === contentHash) {
      return;
    }
    await this.versionRepo.create({
      nodeId: node.nodeId,
      contentHash,
      ...latestVersion?.versionId && { parentVersionId: latestVersion.versionId }
    });
  }
  /**
   * Process wikilinks and create edges
   */
  async processLinks(sourceNode, wikilinks) {
    const resolver = await this.getResolver();
    await this.edgeRepo.deleteBySourceAndType(sourceNode.nodeId, "explicit_link");
    const links = [];
    const edges2 = [];
    const unresolved = [];
    const ambiguous = [];
    for (const wikilink of wikilinks) {
      const resolved = await resolver.resolveLink(wikilink);
      links.push({
        wikilink,
        targetNodeId: resolved.resolvedNodeId,
        ambiguous: resolved.ambiguous
      });
      if (resolved.ambiguous) {
        ambiguous.push(wikilink);
      } else if (resolved.resolvedNodeId === null) {
        unresolved.push(wikilink);
      } else {
        const edge = await this.edgeRepo.create({
          sourceId: sourceNode.nodeId,
          targetId: resolved.resolvedNodeId,
          edgeType: "explicit_link",
          provenance: "explicit",
          attributes: {
            displayText: wikilink.display,
            position: { start: wikilink.start, end: wikilink.end }
          }
        });
        edges2.push(edge);
      }
    }
    return { links, edges: edges2, unresolved, ambiguous };
  }
  /**
   * Two-pass batch indexing for handling circular references
   *
   * Pass 1: Create all nodes (stubs)
   * Pass 2: Process links and create edges
   */
  async batchIndex(files) {
    const startTime = Date.now();
    const indexed = [];
    const errors = [];
    const nodeMap = /* @__PURE__ */ new Map();
    for (const file of files) {
      try {
        const parsed = parseMarkdown(file.content, file.relativePath);
        const node = await this.upsertNode(file, parsed);
        await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);
        nodeMap.set(file.relativePath, { node, parsed, file });
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    this.clearResolverCache();
    let totalEdges = 0;
    let totalUnresolved = 0;
    let totalAmbiguous = 0;
    for (const { node, parsed, file } of nodeMap.values()) {
      try {
        await this.createVersionIfNeeded(node, file.contentHash);
        const { links, edges: edges2, unresolved, ambiguous } = await this.processLinks(node, parsed.links);
        indexed.push({ node, links, edges: edges2, unresolved, ambiguous });
        totalEdges += edges2.length;
        totalUnresolved += unresolved.length;
        totalAmbiguous += ambiguous.length;
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const durationMs = Date.now() - startTime;
    return {
      indexed,
      errors,
      stats: {
        totalFiles: files.length,
        successCount: indexed.length,
        errorCount: errors.length,
        nodeCount: nodeMap.size,
        edgeCount: totalEdges,
        unresolvedCount: totalUnresolved,
        ambiguousCount: totalAmbiguous,
        durationMs
      }
    };
  }
  /**
   * Remove a node and its edges
   */
  async removeNode(nodeId) {
    await this.nodeRepo.delete(nodeId);
    this.clearResolverCache();
  }
  /**
   * Remove a node by path
   */
  async removeByPath(path2) {
    const node = await this.nodeRepo.findByPath(path2);
    if (node) {
      await this.removeNode(node.nodeId);
    }
  }
  /**
   * Check if a file needs reindexing
   */
  async needsReindex(file) {
    const node = await this.nodeRepo.findByPath(file.relativePath);
    if (!node) {
      return true;
    }
    return node.contentHash !== file.contentHash;
  }
  /**
   * Get indexing statistics
   */
  async getStats() {
    const [nodeCount, edgeCount, nodesByType, edgesByType] = await Promise.all([
      this.nodeRepo.count(),
      this.edgeRepo.count(),
      this.nodeRepo.countByType(),
      this.edgeRepo.countByType()
    ]);
    return { nodeCount, edgeCount, nodesByType, edgesByType };
  }
};

// src/retrieval/expansion/graph-expander.ts
var GraphExpander = class {
  edgeRepo;
  config;
  constructor(options) {
    if ("edgeRepository" in options) {
      this.edgeRepo = options.edgeRepository;
      this.config = options.config ?? DEFAULT_CONFIG;
    } else {
      this.edgeRepo = options;
      this.config = DEFAULT_CONFIG;
    }
  }
  /**
   * Expand from seed nodes with bounded traversal
   */
  async expand(seeds, options) {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold
    } = options;
    if (seeds.length === 0) return [];
    const accumulated = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null
      });
      frontier.add(seed.nodeId);
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;
        const current = accumulated.get(nodeId);
        if (!current) continue;
        const edges2 = await this.getEdges(nodeId, edgeTypes, includeIncoming);
        for (const edge of edges2) {
          if (accumulated.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const edgeWeight = edge.strength ?? 1;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);
          if (newScore < scoreThreshold) continue;
          const existing = accumulated.get(targetId);
          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType
            });
            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }
      frontier = newFrontier;
    }
    return Array.from(accumulated.values()).sort((a, b) => b.score - a.score);
  }
  /**
   * Get edges for a node
   */
  async getEdges(nodeId, edgeTypes, includeIncoming) {
    const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
    if (!includeIncoming) {
      return outgoing;
    }
    const incoming = await this.edgeRepo.findIncoming(nodeId, edgeTypes);
    return [...outgoing, ...incoming];
  }
  /**
   * Expand with prioritized edge types
   * Some edge types are more valuable for retrieval
   */
  async expandPrioritized(seeds, options, edgeWeights) {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold
    } = options;
    if (seeds.length === 0) return [];
    const accumulated = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null
      });
      frontier.add(seed.nodeId);
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;
        const current = accumulated.get(nodeId);
        if (!current) continue;
        const edges2 = await this.getEdges(nodeId, edgeTypes, includeIncoming);
        for (const edge of edges2) {
          if (accumulated.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const typeWeight = edgeWeights[edge.edgeType] ?? 1;
          const edgeWeight = (edge.strength ?? 1) * typeWeight;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);
          if (newScore < scoreThreshold) continue;
          const existing = accumulated.get(targetId);
          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType
            });
            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }
      frontier = newFrontier;
    }
    return Array.from(accumulated.values()).sort((a, b) => b.score - a.score);
  }
  /**
   * Get expansion statistics
   */
  getExpansionStats(results) {
    if (results.length === 0) {
      return {
        totalNodes: 0,
        maxDepth: 0,
        avgScore: 0,
        edgeTypeCounts: {}
      };
    }
    const edgeTypeCounts = {};
    let totalScore = 0;
    let maxDepth = 0;
    for (const result of results) {
      totalScore += result.score;
      maxDepth = Math.max(maxDepth, result.depth);
      if (result.edgeType) {
        edgeTypeCounts[result.edgeType] = (edgeTypeCounts[result.edgeType] || 0) + 1;
      }
    }
    return {
      totalNodes: results.length,
      maxDepth,
      avgScore: totalScore / results.length,
      edgeTypeCounts
    };
  }
};

// src/retrieval/fusion/rrf.ts
function reciprocalRankFusion(resultLists, options = {}) {
  const k = options.k ?? 60;
  const weights = options.weights ?? {};
  const scores = /* @__PURE__ */ new Map();
  for (const [source, items] of resultLists) {
    const weight = weights[source] ?? 1;
    for (let rank = 0; rank < items.length; rank++) {
      const item = items[rank];
      if (!item) continue;
      const rrfScore = weight * (1 / (k + rank + 1));
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrfScore;
        existing.sources.add(source);
        existing.ranks.set(source, rank + 1);
      } else {
        scores.set(item.id, {
          score: rrfScore,
          sources: /* @__PURE__ */ new Set([source]),
          ranks: /* @__PURE__ */ new Map([[source, rank + 1]])
        });
      }
    }
  }
  const results = [];
  for (const [id, data] of scores) {
    results.push({
      id,
      score: data.score,
      sources: Array.from(data.sources),
      ranks: data.ranks
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

// src/retrieval/context/assembler.ts
var ContextAssembler = class {
  nodeRepo;
  chunkRepo;
  expander;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.chunkRepo = options.chunkRepository;
    this.expander = new GraphExpander(options.edgeRepository);
    this.config = options.config;
  }
  /**
   * Main retrieval function
   */
  async retrieve(query) {
    const maxResults = query.maxResults ?? this.config.defaultMaxResults;
    const lexicalResults = await this.lexicalSearch(query.text, maxResults * 2);
    const filteredLexical = await this.applyFilters(lexicalResults, query.filters);
    const seedNodes = this.extractSeeds(filteredLexical);
    const expansionOptions = {
      maxDepth: query.expansion?.maxDepth ?? this.config.expansionMaxDepth,
      budget: query.expansion?.budget ?? this.config.expansionBudget,
      edgeTypes: query.expansion?.edgeTypes ?? [
        "explicit_link",
        "sequence",
        "hierarchy"
      ],
      decayFactor: query.expansion?.decayFactor ?? 0.7,
      includeIncoming: true
    };
    const expandedNodes = await this.expander.expand(seedNodes, expansionOptions);
    const graphChunks = await this.fetchChunksForNodes(expandedNodes);
    const fusedChunks = this.fuseResults(filteredLexical, graphChunks, maxResults);
    const context = await this.assembleContext(fusedChunks);
    const provenance = this.buildProvenance(fusedChunks);
    return {
      chunks: fusedChunks.map((sc) => ({
        chunk: sc.chunk,
        node: sc.node,
        score: sc.score,
        matchType: sc.matchType
      })),
      context,
      provenance
    };
  }
  /**
   * Lexical search using FTS5
   */
  async lexicalSearch(query, limit) {
    const ftsResults = this.chunkRepo.searchBM25(query, limit);
    if (ftsResults.length === 0) {
      return [];
    }
    const chunkIds = ftsResults.map((r) => r.chunkId);
    const chunks2 = await this.chunkRepo.findByIds(chunkIds);
    const chunkMap = new Map(chunks2.map((c) => [c.chunkId, c]));
    const nodeIds = [...new Set(ftsResults.map((r) => r.nodeId))];
    const nodes2 = await this.nodeRepo.findByIds(nodeIds);
    const nodeMap = new Map(nodes2.map((n) => [n.nodeId, n]));
    const results = [];
    const maxScore = Math.max(...ftsResults.map((r) => Math.abs(r.score)));
    for (const fts of ftsResults) {
      const chunk = chunkMap.get(fts.chunkId);
      const node = nodeMap.get(fts.nodeId);
      if (chunk && node) {
        results.push({
          chunk,
          node,
          score: maxScore > 0 ? Math.abs(fts.score) / maxScore : 0.5,
          matchType: "lexical"
        });
      }
    }
    return results;
  }
  /**
   * Apply query filters
   */
  async applyFilters(chunks2, filters) {
    if (!filters) return chunks2;
    return chunks2.filter((sc) => {
      if (filters.nodeTypes && !filters.nodeTypes.includes(sc.node.type)) {
        return false;
      }
      if (filters.excludeNodeIds?.includes(sc.node.nodeId)) {
        return false;
      }
      if (filters.dateRange) {
        const nodeDate = new Date(sc.node.updatedAt);
        if (filters.dateRange.start && nodeDate < new Date(filters.dateRange.start)) {
          return false;
        }
        if (filters.dateRange.end && nodeDate > new Date(filters.dateRange.end)) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Extract seed nodes from initial results
   */
  extractSeeds(chunks2) {
    const nodeScores = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const current = nodeScores.get(sc.node.nodeId) ?? 0;
      nodeScores.set(sc.node.nodeId, Math.max(current, sc.score));
    }
    return Array.from(nodeScores.entries()).map(([nodeId, score]) => ({ nodeId, score })).sort((a, b) => b.score - a.score).slice(0, 10);
  }
  /**
   * Fetch chunks for expanded nodes
   */
  async fetchChunksForNodes(expanded) {
    const results = [];
    for (const exp of expanded) {
      if (exp.depth === 0) continue;
      const chunks2 = await this.chunkRepo.findByNodeId(exp.nodeId);
      const node = await this.nodeRepo.findById(exp.nodeId);
      if (!node) continue;
      for (const chunk of chunks2) {
        results.push({
          chunk,
          node,
          score: exp.score,
          matchType: "graph"
        });
      }
    }
    return results;
  }
  /**
   * Fuse lexical and graph results using RRF
   */
  fuseResults(lexical, graph, maxResults) {
    const lexicalItems = lexical.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: "lexical"
    }));
    const graphItems = graph.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: "graph"
    }));
    const chunkLookup = /* @__PURE__ */ new Map();
    for (const sc of [...lexical, ...graph]) {
      const existing = chunkLookup.get(sc.chunk.chunkId);
      if (!existing || sc.score > existing.score) {
        chunkLookup.set(sc.chunk.chunkId, sc);
      }
    }
    const resultLists = /* @__PURE__ */ new Map([
      ["lexical", lexicalItems],
      ["graph", graphItems]
    ]);
    const fused = reciprocalRankFusion(resultLists, {
      k: this.config.rrfK,
      weights: {
        lexical: this.config.lexicalWeight,
        graph: this.config.graphWeight
      }
    });
    const results = [];
    for (const f of fused.slice(0, maxResults)) {
      const sc = chunkLookup.get(f.id);
      if (sc) {
        results.push({
          ...sc,
          score: f.score,
          matchType: f.sources.length > 1 ? "lexical" : f.sources[0]
        });
      }
    }
    return results;
  }
  /**
   * Assemble context string from chunks
   */
  async assembleContext(chunks2) {
    if (chunks2.length === 0) {
      return "";
    }
    const nodeChunks = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const existing = nodeChunks.get(sc.node.nodeId) ?? [];
      existing.push(sc);
      nodeChunks.set(sc.node.nodeId, existing);
    }
    const sections = [];
    for (const [, nodeChunkList] of nodeChunks) {
      const node = nodeChunkList[0]?.node;
      if (!node) continue;
      nodeChunkList.sort((a, b) => a.chunk.offsetStart - b.chunk.offsetStart);
      const chunkTexts = nodeChunkList.map((sc) => sc.chunk.text);
      const combinedText = chunkTexts.join("\n\n");
      sections.push(`## ${node.title}

${combinedText}`);
    }
    return sections.join("\n\n---\n\n");
  }
  /**
   * Build provenance information
   */
  buildProvenance(chunks2) {
    const nodeContributions = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const existing = nodeContributions.get(sc.node.nodeId);
      if (existing) {
        existing.score += sc.score;
      } else {
        nodeContributions.set(sc.node.nodeId, {
          path: sc.node.path,
          score: sc.score
        });
      }
    }
    const totalScore = Array.from(nodeContributions.values()).reduce((sum, n) => sum + n.score, 0);
    return Array.from(nodeContributions.entries()).map(([nodeId, data]) => ({
      nodeId,
      path: data.path,
      contribution: totalScore > 0 ? data.score / totalScore : 0
    })).sort((a, b) => b.contribution - a.contribution);
  }
};
export {
  ChunkSchema,
  ConfigError,
  ConnectionManager,
  ContextAssembler,
  ContinuityError,
  DEFAULT_CONFIG,
  DatabaseError,
  EdgeProvenanceSchema,
  EdgeSchema,
  EdgeTypeSchema,
  EmbeddingError,
  FileSystemError,
  FrontmatterSchema,
  GraphEngine,
  GraphError,
  GraphMetricsSchema,
  InMemoryLinkResolver,
  IndexingPipeline,
  LinkResolver,
  MentionCandidateSchema,
  MentionStatusSchema,
  NodeSchema,
  NodeTypeSchema,
  ParseError,
  ProposalError,
  ProposalSchema,
  ProposalStatusSchema,
  ProposalTypeSchema,
  ResolutionError,
  RetrievalError,
  ValidationError,
  VersionSchema,
  ZettelScriptError,
  createLinkResolver,
  createWikilink,
  extractAliases,
  extractLinkTargets,
  extractNodeType,
  extractPlainText,
  extractTitle,
  extractWikilinks,
  getDatabase,
  getRawSqlite,
  getUniqueTargets,
  getWikilinkContext,
  hasWikilinks,
  insertWikilink,
  normalizeTarget,
  parseFrontmatter,
  parseMarkdown,
  parseWikilinkString,
  serializeFrontmatter,
  splitIntoParagraphs,
  splitIntoSections,
  stringifyMarkdown,
  targetsMatch,
  updateFrontmatter,
  validateFrontmatter
};
//# sourceMappingURL=index.js.map