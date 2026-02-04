var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/types/index.ts
import { Type } from "@sinclair/typebox";
import { createHash } from "crypto";
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
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  isGhost: Type.Optional(Type.Boolean())
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
  },
  visualization: {
    mode: "focus"
    // v2 default: hide Layer C edges (mentions, suggestions)
  }
};
var LAYER_A_EDGES = [
  "explicit_link",
  // User-authored [[wikilinks]]
  "hierarchy",
  // Parent/child, folder structure
  "sequence",
  // Chapter/scene order (chronology_next)
  "causes",
  // Causal relationships
  "setup_payoff",
  // Narrative foreshadowing
  "participation",
  // Character in scene
  "pov_visible_to"
  // POV constraints
];
var LAYER_B_EDGES = [
  "semantic"
  // Accepted wormholes (similarity > threshold)
];
var LAYER_C_EDGES = [
  "mention",
  // Approved mention (co-occurrence)
  "semantic_suggestion",
  // Wormhole below threshold
  "backlink",
  // Computed incoming (can be noisy)
  "alias"
  // Alternative name reference
];
function getEdgeLayer(edgeType) {
  if (LAYER_A_EDGES.includes(edgeType)) return "A";
  if (LAYER_B_EDGES.includes(edgeType)) return "B";
  if (LAYER_C_EDGES.includes(edgeType)) return "C";
  return "unknown";
}
function shouldRenderEdge(edgeType, mode) {
  if (mode === "classic") return true;
  const layer = getEdgeLayer(edgeType);
  if (layer === "A" || layer === "B") return true;
  if (layer === "C") return false;
  console.warn(`Unknown edge type: ${edgeType}`);
  return false;
}
var CandidateEdgeStatusSchema = Type.Union([
  Type.Literal("suggested"),
  Type.Literal("approved"),
  Type.Literal("rejected")
]);
var CandidateEdgeSourceSchema = Type.Union([
  Type.Literal("mention"),
  Type.Literal("semantic"),
  Type.Literal("heuristic")
]);
function generateSuggestionId(fromId, toId, edgeType, isUndirected = true) {
  const [a, b] = isUndirected && fromId > toId ? [toId, fromId] : [fromId, toId];
  const input = `v1|${a}|${b}|${edgeType}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
function isUndirectedEdgeType(edgeType) {
  return edgeType === "semantic" || edgeType === "semantic_suggestion";
}

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
  candidateEdges: () => candidateEdges,
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
    metadata: text("metadata", { mode: "json" }),
    isGhost: integer("is_ghost").notNull().default(0)
    // 0 = real node, 1 = ghost
  },
  (table) => [
    index("idx_nodes_title").on(table.title),
    index("idx_nodes_type").on(table.type),
    index("idx_nodes_path").on(table.path),
    index("idx_nodes_ghost").on(table.isGhost)
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
var candidateEdges = sqliteTable(
  "candidate_edges",
  {
    suggestionId: text("suggestion_id").primaryKey(),
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    suggestedEdgeType: text("suggested_edge_type").notNull(),
    // For undirected uniqueness (canonical ordering)
    fromIdNorm: text("from_id_norm").notNull(),
    toIdNorm: text("to_id_norm").notNull(),
    // Status lifecycle
    status: text("status").default("suggested").notNull(),
    statusChangedAt: text("status_changed_at"),
    // Evidence (merged from multiple sources)
    signals: text("signals", { mode: "json" }),
    // { semantic?, mentionCount?, graphProximity? }
    reasons: text("reasons", { mode: "json" }),
    // string[]
    provenance: text("provenance", { mode: "json" }),
    // array of evidence objects
    // Timestamps
    createdAt: text("created_at").notNull(),
    lastComputedAt: text("last_computed_at").notNull(),
    lastSeenAt: text("last_seen_at"),
    // Writeback tracking
    writebackStatus: text("writeback_status"),
    writebackReason: text("writeback_reason"),
    approvedEdgeId: text("approved_edge_id")
  },
  (table) => [
    index("idx_candidate_from").on(table.fromId),
    index("idx_candidate_to").on(table.toId),
    index("idx_candidate_status").on(table.status),
    index("idx_candidate_norm").on(table.fromIdNorm, table.toIdNorm, table.suggestedEdgeType)
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
var SCHEMA_VERSION = 4;
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
        metadata TEXT,
        is_ghost INTEGER NOT NULL DEFAULT 0
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

      -- Candidate edges (Phase 2: Suggestions)
      CREATE TABLE IF NOT EXISTS candidate_edges (
        suggestion_id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        suggested_edge_type TEXT NOT NULL,
        from_id_norm TEXT NOT NULL,
        to_id_norm TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'suggested',
        status_changed_at TEXT,
        signals TEXT,
        reasons TEXT,
        provenance TEXT,
        created_at TEXT NOT NULL,
        last_computed_at TEXT NOT NULL,
        last_seen_at TEXT,
        writeback_status TEXT,
        writeback_reason TEXT,
        approved_edge_id TEXT
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_nodes_title ON nodes(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_path ON nodes(path);
      CREATE INDEX IF NOT EXISTS idx_nodes_ghost ON nodes(is_ghost);
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
      CREATE INDEX IF NOT EXISTS idx_candidate_from ON candidate_edges(from_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_to ON candidate_edges(to_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate_edges(status);
      CREATE INDEX IF NOT EXISTS idx_candidate_norm ON candidate_edges(from_id_norm, to_id_norm, suggested_edge_type);
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

// src/storage/database/repositories/node-repository.ts
import { eq, like, and, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
var NodeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new node
   */
  async create(data) {
    const nodeId = nanoid();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null,
      isGhost: data.isGhost ? 1 : 0
    };
    await this.db.insert(nodes).values(row);
    return this.rowToNode({ ...row, nodeId });
  }
  /**
   * Create or update a node by path
   */
  async upsert(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const nodeId = data.nodeId || nanoid();
    const existing = await this.findByPath(data.path);
    if (existing) {
      return this.update(existing.nodeId, {
        ...data,
        updatedAt: now
      });
    }
    const row = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null,
      isGhost: data.isGhost ? 1 : 0
    };
    await this.db.insert(nodes).values(row);
    return this.rowToNode({ ...row, nodeId });
  }
  /**
   * Find a node by ID
   */
  async findById(nodeId) {
    const result = await this.db.select().from(nodes).where(eq(nodes.nodeId, nodeId)).limit(1);
    return result[0] ? this.rowToNode(result[0]) : null;
  }
  /**
   * Find a node by path
   */
  async findByPath(path2) {
    const result = await this.db.select().from(nodes).where(eq(nodes.path, path2)).limit(1);
    return result[0] ? this.rowToNode(result[0]) : null;
  }
  /**
   * Find a node by title (case-insensitive)
   */
  async findByTitle(title) {
    const result = await this.db.select().from(nodes).where(sql`${nodes.title} COLLATE NOCASE = ${title}`);
    return result.map(this.rowToNode);
  }
  /**
   * Find a node by title or alias
   */
  async findByTitleOrAlias(text2) {
    const titleMatches = await this.db.select().from(nodes).where(sql`${nodes.title} COLLATE NOCASE = ${text2}`);
    const aliasMatches = await this.db.select({ node: nodes }).from(aliases).innerJoin(nodes, eq(aliases.nodeId, nodes.nodeId)).where(sql`${aliases.alias} COLLATE NOCASE = ${text2}`);
    const nodeMap = /* @__PURE__ */ new Map();
    for (const row of titleMatches) {
      nodeMap.set(row.nodeId, row);
    }
    for (const { node } of aliasMatches) {
      nodeMap.set(node.nodeId, node);
    }
    return Array.from(nodeMap.values()).map(this.rowToNode);
  }
  /**
   * Find nodes by type
   */
  async findByType(type) {
    const result = await this.db.select().from(nodes).where(eq(nodes.type, type));
    return result.map(this.rowToNode);
  }
  /**
   * Get all nodes
   */
  async findAll() {
    const result = await this.db.select().from(nodes);
    return result.map(this.rowToNode);
  }
  /**
   * Find nodes by IDs
   */
  async findByIds(nodeIds) {
    if (nodeIds.length === 0) return [];
    const result = await this.db.select().from(nodes).where(inArray(nodes.nodeId, nodeIds));
    return result.map(this.rowToNode);
  }
  /**
   * Search nodes by title pattern
   */
  async searchByTitle(pattern) {
    const result = await this.db.select().from(nodes).where(like(nodes.title, `%${pattern}%`));
    return result.map(this.rowToNode);
  }
  /**
   * Update a node
   */
  async update(nodeId, data) {
    const updateData = {};
    if (data.type !== void 0) updateData.type = data.type;
    if (data.title !== void 0) updateData.title = data.title;
    if (data.path !== void 0) updateData.path = data.path;
    if (data.contentHash !== void 0) updateData.contentHash = data.contentHash;
    if (data.metadata !== void 0) updateData.metadata = data.metadata;
    if (data.isGhost !== void 0) updateData.isGhost = data.isGhost ? 1 : 0;
    updateData.updatedAt = data.updatedAt || (/* @__PURE__ */ new Date()).toISOString();
    await this.db.update(nodes).set(updateData).where(eq(nodes.nodeId, nodeId));
    const updated = await this.findById(nodeId);
    if (!updated) {
      throw new Error(`Node ${nodeId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a node
   */
  async delete(nodeId) {
    await this.db.delete(nodes).where(eq(nodes.nodeId, nodeId));
  }
  /**
   * Delete nodes by path pattern
   */
  async deleteByPathPattern(pattern) {
    const result = await this.db.delete(nodes).where(like(nodes.path, pattern));
    return result.changes;
  }
  /**
   * Count nodes
   */
  async count() {
    const result = await this.db.select({ count: sql`count(*)` }).from(nodes);
    return result[0]?.count ?? 0;
  }
  /**
   * Count nodes by type
   */
  async countByType() {
    const result = await this.db.select({
      type: nodes.type,
      count: sql`count(*)`
    }).from(nodes).groupBy(nodes.type);
    const counts = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }
  /**
   * Add an alias for a node
   */
  async addAlias(nodeId, alias) {
    await this.db.insert(aliases).values({
      aliasId: nanoid(),
      nodeId,
      alias
    });
  }
  /**
   * Remove an alias
   */
  async removeAlias(nodeId, alias) {
    await this.db.delete(aliases).where(and(eq(aliases.nodeId, nodeId), sql`${aliases.alias} COLLATE NOCASE = ${alias}`));
  }
  /**
   * Get aliases for a node
   */
  async getAliases(nodeId) {
    const result = await this.db.select({ alias: aliases.alias }).from(aliases).where(eq(aliases.nodeId, nodeId));
    return result.map((r) => r.alias);
  }
  /**
   * Set aliases for a node (replaces existing)
   */
  async setAliases(nodeId, newAliases) {
    await this.db.delete(aliases).where(eq(aliases.nodeId, nodeId));
    if (newAliases.length > 0) {
      await this.db.insert(aliases).values(
        newAliases.map((alias) => ({
          aliasId: nanoid(),
          nodeId,
          alias
        }))
      );
    }
  }
  /**
   * Find all ghost nodes
   */
  async findGhosts() {
    const result = await this.db.select().from(nodes).where(eq(nodes.isGhost, 1));
    return result.map((row) => this.rowToNode(row));
  }
  /**
   * Find all non-ghost (real) nodes
   */
  async findRealNodes() {
    const result = await this.db.select().from(nodes).where(eq(nodes.isGhost, 0));
    return result.map((row) => this.rowToNode(row));
  }
  /**
   * Count ghost nodes
   */
  async countGhosts() {
    const result = await this.db.select({ count: sql`count(*)` }).from(nodes).where(eq(nodes.isGhost, 1));
    return result[0]?.count ?? 0;
  }
  /**
   * Create or find a ghost node by title.
   * Ghosts are placeholder nodes for unresolved references.
   * They have a synthetic path based on title.
   */
  async getOrCreateGhost(title) {
    const existing = await this.db.select().from(nodes).where(and(eq(nodes.isGhost, 1), sql`${nodes.title} COLLATE NOCASE = ${title}`)).limit(1);
    if (existing[0]) {
      return this.rowToNode(existing[0]);
    }
    const nodeId = nanoid();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ghostPath = `__ghost__/${title.replace(/[^a-zA-Z0-9-_]/g, "_")}`;
    const row = {
      nodeId,
      type: "note",
      // Ghosts default to 'note' type
      title,
      path: ghostPath,
      createdAt: now,
      updatedAt: now,
      contentHash: null,
      metadata: null,
      isGhost: 1
    };
    await this.db.insert(nodes).values(row);
    return this.rowToNode({ ...row, nodeId });
  }
  /**
   * Materialize a ghost - convert it to a real node when the file is created.
   * Updates the ghost to be a real node with the actual path.
   */
  async materializeGhost(nodeId, realPath) {
    const ghost = await this.findById(nodeId);
    if (!ghost || !ghost.isGhost) {
      throw new Error(`Node ${nodeId} is not a ghost`);
    }
    return this.update(nodeId, {
      path: realPath,
      isGhost: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Convert database row to Node type
   */
  rowToNode(row) {
    const node = {
      nodeId: row.nodeId,
      type: row.type,
      title: row.title,
      path: row.path,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
    if (row.contentHash != null) node.contentHash = row.contentHash;
    if (row.metadata != null) node.metadata = row.metadata;
    if (row.isGhost === 1) node.isGhost = true;
    return node;
  }
};

// src/storage/database/repositories/edge-repository.ts
import { eq as eq2, and as and2, or, inArray as inArray2, sql as sql2 } from "drizzle-orm";
import { nanoid as nanoid2 } from "nanoid";
var EdgeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new edge
   */
  async create(data) {
    const edgeId = nanoid2();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      edgeId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      edgeType: data.edgeType,
      strength: data.strength ?? null,
      provenance: data.provenance,
      createdAt: now,
      versionStart: data.versionStart ?? null,
      versionEnd: data.versionEnd ?? null,
      attributes: data.attributes ?? null
    };
    await this.db.insert(edges).values(row);
    return this.rowToEdge({ ...row, edgeId, createdAt: now });
  }
  /**
   * Create or update an edge
   */
  async upsert(data) {
    const existing = await this.findBySourceTargetType(data.sourceId, data.targetId, data.edgeType);
    if (existing) {
      return this.update(existing.edgeId, data);
    }
    return this.create(data);
  }
  /**
   * Find an edge by ID
   */
  async findById(edgeId) {
    const result = await this.db.select().from(edges).where(eq2(edges.edgeId, edgeId)).limit(1);
    return result[0] ? this.rowToEdge(result[0]) : null;
  }
  /**
   * Find edge by source, target, and type
   */
  async findBySourceTargetType(sourceId, targetId, edgeType) {
    const result = await this.db.select().from(edges).where(
      and2(
        eq2(edges.sourceId, sourceId),
        eq2(edges.targetId, targetId),
        eq2(edges.edgeType, edgeType)
      )
    ).limit(1);
    return result[0] ? this.rowToEdge(result[0]) : null;
  }
  /**
   * Find all outgoing edges from a node
   */
  async findOutgoing(nodeId, edgeTypes) {
    let query = this.db.select().from(edges).where(eq2(edges.sourceId, nodeId));
    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db.select().from(edges).where(and2(eq2(edges.sourceId, nodeId), inArray2(edges.edgeType, edgeTypes)));
    }
    const result = await query;
    return result.map(this.rowToEdge);
  }
  /**
   * Find all incoming edges to a node
   */
  async findIncoming(nodeId, edgeTypes) {
    let query = this.db.select().from(edges).where(eq2(edges.targetId, nodeId));
    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db.select().from(edges).where(and2(eq2(edges.targetId, nodeId), inArray2(edges.edgeType, edgeTypes)));
    }
    const result = await query;
    return result.map(this.rowToEdge);
  }
  /**
   * Find all edges connected to a node (both directions)
   */
  async findConnected(nodeId, edgeTypes) {
    const condition = or(eq2(edges.sourceId, nodeId), eq2(edges.targetId, nodeId));
    let result;
    if (edgeTypes && edgeTypes.length > 0) {
      result = await this.db.select().from(edges).where(and2(condition, inArray2(edges.edgeType, edgeTypes)));
    } else {
      result = await this.db.select().from(edges).where(condition);
    }
    return result.map(this.rowToEdge);
  }
  /**
   * Find edges by type
   */
  async findByType(edgeType) {
    const result = await this.db.select().from(edges).where(eq2(edges.edgeType, edgeType));
    return result.map(this.rowToEdge);
  }
  /**
   * Get all edges, optionally filtered by edge types
   */
  async findAll(edgeTypes) {
    if (edgeTypes && edgeTypes.length > 0) {
      const result2 = await this.db.select().from(edges).where(inArray2(edges.edgeType, edgeTypes));
      return result2.map(this.rowToEdge);
    }
    const result = await this.db.select().from(edges);
    return result.map(this.rowToEdge);
  }
  /**
   * Find backlinks (explicit_link edges targeting a node)
   */
  async findBacklinks(nodeId) {
    const result = await this.db.select().from(edges).where(and2(eq2(edges.targetId, nodeId), eq2(edges.edgeType, "explicit_link")));
    return result.map(this.rowToEdge);
  }
  /**
   * Update an edge
   */
  async update(edgeId, data) {
    const updateData = {};
    if (data.sourceId !== void 0) updateData.sourceId = data.sourceId;
    if (data.targetId !== void 0) updateData.targetId = data.targetId;
    if (data.edgeType !== void 0) updateData.edgeType = data.edgeType;
    if (data.strength !== void 0) updateData.strength = data.strength;
    if (data.provenance !== void 0) updateData.provenance = data.provenance;
    if (data.versionStart !== void 0) updateData.versionStart = data.versionStart;
    if (data.versionEnd !== void 0) updateData.versionEnd = data.versionEnd;
    if (data.attributes !== void 0) updateData.attributes = data.attributes;
    await this.db.update(edges).set(updateData).where(eq2(edges.edgeId, edgeId));
    const updated = await this.findById(edgeId);
    if (!updated) {
      throw new Error(`Edge ${edgeId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete an edge
   */
  async delete(edgeId) {
    await this.db.delete(edges).where(eq2(edges.edgeId, edgeId));
  }
  /**
   * Delete all edges for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(edges).where(or(eq2(edges.sourceId, nodeId), eq2(edges.targetId, nodeId)));
    return result.changes;
  }
  /**
   * Delete edges by source and type
   */
  async deleteBySourceAndType(sourceId, edgeType) {
    const result = await this.db.delete(edges).where(and2(eq2(edges.sourceId, sourceId), eq2(edges.edgeType, edgeType)));
    return result.changes;
  }
  /**
   * Count edges
   */
  async count() {
    const result = await this.db.select({ count: sql2`count(*)` }).from(edges);
    return result[0]?.count ?? 0;
  }
  /**
   * Count edges by type
   */
  async countByType() {
    const result = await this.db.select({
      type: edges.edgeType,
      count: sql2`count(*)`
    }).from(edges).groupBy(edges.edgeType);
    const counts = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }
  /**
   * Find neighbors with node info
   */
  async findNeighborsWithNodes(nodeId, edgeTypes) {
    const outgoing = await this.findOutgoing(nodeId, edgeTypes);
    const incoming = await this.findIncoming(nodeId, edgeTypes);
    const results = [];
    if (outgoing.length > 0) {
      const targetIds = outgoing.map((e) => e.targetId);
      const targetNodes = await this.db.select({
        nodeId: nodes.nodeId,
        title: nodes.title,
        type: nodes.type,
        path: nodes.path
      }).from(nodes).where(inArray2(nodes.nodeId, targetIds));
      const nodeMap = new Map(targetNodes.map((n) => [n.nodeId, n]));
      for (const edge of outgoing) {
        const node = nodeMap.get(edge.targetId);
        if (node) {
          results.push({ edge, node, direction: "outgoing" });
        }
      }
    }
    if (incoming.length > 0) {
      const sourceIds = incoming.map((e) => e.sourceId);
      const sourceNodes = await this.db.select({
        nodeId: nodes.nodeId,
        title: nodes.title,
        type: nodes.type,
        path: nodes.path
      }).from(nodes).where(inArray2(nodes.nodeId, sourceIds));
      const nodeMap = new Map(sourceNodes.map((n) => [n.nodeId, n]));
      for (const edge of incoming) {
        const node = nodeMap.get(edge.sourceId);
        if (node) {
          results.push({ edge, node, direction: "incoming" });
        }
      }
    }
    return results;
  }
  /**
   * Convert database row to Edge type
   */
  rowToEdge(row) {
    return {
      edgeId: row.edgeId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      edgeType: row.edgeType,
      provenance: row.provenance,
      createdAt: row.createdAt,
      ...row.strength != null && { strength: row.strength },
      ...row.versionStart != null && { versionStart: row.versionStart },
      ...row.versionEnd != null && { versionEnd: row.versionEnd },
      ...row.attributes != null && { attributes: row.attributes }
    };
  }
};

// src/storage/database/repositories/version-repository.ts
import { eq as eq3, and as and3, sql as sql3, desc } from "drizzle-orm";
import { nanoid as nanoid3 } from "nanoid";
var VersionRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new version
   */
  async create(data) {
    const versionId = nanoid3();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      versionId,
      nodeId: data.nodeId,
      contentHash: data.contentHash,
      parentVersionId: data.parentVersionId ?? null,
      createdAt: now,
      summary: data.summary ?? null
    };
    await this.db.insert(versions).values(row);
    return this.rowToVersion({ ...row, versionId, createdAt: now });
  }
  /**
   * Find a version by ID
   */
  async findById(versionId) {
    const result = await this.db.select().from(versions).where(eq3(versions.versionId, versionId)).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Find all versions for a node
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(versions).where(eq3(versions.nodeId, nodeId)).orderBy(desc(versions.createdAt));
    return result.map(this.rowToVersion);
  }
  /**
   * Find the latest version for a node
   */
  async findLatest(nodeId) {
    const result = await this.db.select().from(versions).where(eq3(versions.nodeId, nodeId)).orderBy(desc(versions.createdAt)).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Find version by content hash
   */
  async findByContentHash(nodeId, contentHash) {
    const result = await this.db.select().from(versions).where(and3(eq3(versions.nodeId, nodeId), eq3(versions.contentHash, contentHash))).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Get version chain (all ancestors)
   */
  async getVersionChain(versionId) {
    const chain = [];
    let currentId = versionId;
    while (currentId) {
      const version = await this.findById(currentId);
      if (!version) break;
      chain.push(version);
      currentId = version.parentVersionId ?? null;
    }
    return chain;
  }
  /**
   * Get child versions
   */
  async findChildren(versionId) {
    const result = await this.db.select().from(versions).where(eq3(versions.parentVersionId, versionId));
    return result.map(this.rowToVersion);
  }
  /**
   * Update a version (mainly for summary)
   */
  async update(versionId, data) {
    await this.db.update(versions).set({ summary: data.summary ?? null }).where(eq3(versions.versionId, versionId));
    const updated = await this.findById(versionId);
    if (!updated) {
      throw new Error(`Version ${versionId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a version
   */
  async delete(versionId) {
    await this.db.delete(versions).where(eq3(versions.versionId, versionId));
  }
  /**
   * Delete all versions for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(versions).where(eq3(versions.nodeId, nodeId));
    return result.changes;
  }
  /**
   * Count versions
   */
  async count() {
    const result = await this.db.select({ count: sql3`count(*)` }).from(versions);
    return result[0]?.count ?? 0;
  }
  /**
   * Count versions per node
   */
  async countPerNode() {
    const result = await this.db.select({
      nodeId: versions.nodeId,
      count: sql3`count(*)`
    }).from(versions).groupBy(versions.nodeId);
    return new Map(result.map((r) => [r.nodeId, r.count]));
  }
  /**
   * Convert database row to Version type
   */
  rowToVersion(row) {
    return {
      versionId: row.versionId,
      nodeId: row.nodeId,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
      ...row.parentVersionId != null && { parentVersionId: row.parentVersionId },
      ...row.summary != null && { summary: row.summary }
    };
  }
};

// src/storage/database/repositories/chunk-repository.ts
import { eq as eq4, sql as sql4, inArray as inArray3 } from "drizzle-orm";
import { nanoid as nanoid4 } from "nanoid";
var ChunkRepository = class {
  constructor(db, sqlite) {
    this.db = db;
    this.sqlite = sqlite;
  }
  /**
   * Create a new chunk
   */
  async create(data) {
    const chunkId = nanoid4();
    const row = {
      chunkId,
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null
    };
    await this.db.insert(chunks).values(row);
    return this.rowToChunk({ ...row, chunkId });
  }
  /**
   * Create multiple chunks
   */
  async createMany(dataArray) {
    if (dataArray.length === 0) return [];
    const rows = dataArray.map((data) => ({
      chunkId: nanoid4(),
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null
    }));
    await this.db.insert(chunks).values(rows);
    return rows.map((row) => this.rowToChunk(row));
  }
  /**
   * Find a chunk by ID
   */
  async findById(chunkId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.chunkId, chunkId)).limit(1);
    return result[0] ? this.rowToChunk(result[0]) : null;
  }
  /**
   * Find all chunks for a node
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.nodeId, nodeId)).orderBy(chunks.offsetStart);
    return result.map(this.rowToChunk);
  }
  /**
   * Find chunks by version
   */
  async findByVersionId(versionId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.versionId, versionId)).orderBy(chunks.offsetStart);
    return result.map(this.rowToChunk);
  }
  /**
   * Find chunks by IDs
   */
  async findByIds(chunkIds) {
    if (chunkIds.length === 0) return [];
    const result = await this.db.select().from(chunks).where(inArray3(chunks.chunkId, chunkIds));
    return result.map(this.rowToChunk);
  }
  /**
   * Full-text search using FTS5
   */
  searchFullText(query, limit = 20) {
    const escapedQuery = query.replace(/['"]/g, "").replace(/\*/g, "").split(/\s+/).filter((word) => word.length > 0).join(" OR ");
    if (!escapedQuery) return [];
    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        rank
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    return stmt.all(escapedQuery, limit);
  }
  /**
   * Full-text search with BM25 ranking
   */
  searchBM25(query, limit = 20) {
    const escapedQuery = query.replace(/['"]/g, "").replace(/\*/g, "").split(/\s+/).filter((word) => word.length > 0).join(" OR ");
    if (!escapedQuery) return [];
    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        bm25(chunks_fts) as score
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY bm25(chunks_fts)
      LIMIT ?
    `);
    return stmt.all(escapedQuery, limit);
  }
  /**
   * Update a chunk
   */
  async update(chunkId, data) {
    const updateData = {};
    if (data.nodeId !== void 0) updateData.nodeId = data.nodeId;
    if (data.text !== void 0) updateData.text = data.text;
    if (data.offsetStart !== void 0) updateData.offsetStart = data.offsetStart;
    if (data.offsetEnd !== void 0) updateData.offsetEnd = data.offsetEnd;
    if (data.versionId !== void 0) updateData.versionId = data.versionId;
    if (data.tokenCount !== void 0) updateData.tokenCount = data.tokenCount;
    await this.db.update(chunks).set(updateData).where(eq4(chunks.chunkId, chunkId));
    const updated = await this.findById(chunkId);
    if (!updated) {
      throw new Error(`Chunk ${chunkId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a chunk
   */
  async delete(chunkId) {
    await this.db.delete(chunks).where(eq4(chunks.chunkId, chunkId));
  }
  /**
   * Delete all chunks for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(chunks).where(eq4(chunks.nodeId, nodeId));
    return result.changes;
  }
  /**
   * Delete chunks by version
   */
  async deleteByVersion(versionId) {
    const result = await this.db.delete(chunks).where(eq4(chunks.versionId, versionId));
    return result.changes;
  }
  /**
   * Count chunks
   */
  async count() {
    const result = await this.db.select({ count: sql4`count(*)` }).from(chunks);
    return result[0]?.count ?? 0;
  }
  /**
   * Get total token count
   */
  async getTotalTokens() {
    const result = await this.db.select({ total: sql4`COALESCE(SUM(token_count), 0)` }).from(chunks);
    return result[0]?.total ?? 0;
  }
  /**
   * Convert database row to Chunk type
   */
  rowToChunk(row) {
    return {
      chunkId: row.chunkId,
      nodeId: row.nodeId,
      text: row.text,
      offsetStart: row.offsetStart,
      offsetEnd: row.offsetEnd,
      versionId: row.versionId,
      ...row.tokenCount != null && { tokenCount: row.tokenCount }
    };
  }
};

// src/storage/database/repositories/mention-repository.ts
import { eq as eq5, and as and4, sql as sql5 } from "drizzle-orm";
import { nanoid as nanoid5 } from "nanoid";
var MentionRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new mention candidate
   */
  async create(data) {
    const candidateId = nanoid5();
    const row = {
      candidateId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status
    };
    await this.db.insert(mentionCandidates).values(row);
    return this.rowToMention({ ...row, candidateId });
  }
  /**
   * Create multiple mention candidates
   */
  async createMany(dataArray) {
    if (dataArray.length === 0) return [];
    const rows = dataArray.map((data) => ({
      candidateId: nanoid5(),
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status
    }));
    await this.db.insert(mentionCandidates).values(rows);
    return rows.map((row) => this.rowToMention(row));
  }
  /**
   * Find a mention by ID
   */
  async findById(candidateId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.candidateId, candidateId)).limit(1);
    return result[0] ? this.rowToMention(result[0]) : null;
  }
  /**
   * Find mentions by source node
   */
  async findBySourceId(sourceId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.sourceId, sourceId));
    return result.map(this.rowToMention);
  }
  /**
   * Find mentions by target node
   */
  async findByTargetId(targetId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.targetId, targetId));
    return result.map(this.rowToMention);
  }
  /**
   * Find mentions by status
   */
  async findByStatus(status) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.status, status));
    return result.map(this.rowToMention);
  }
  /**
   * Find new (pending review) mentions for a source
   */
  async findNewForSource(sourceId) {
    const result = await this.db.select().from(mentionCandidates).where(and4(eq5(mentionCandidates.sourceId, sourceId), eq5(mentionCandidates.status, "new")));
    return result.map(this.rowToMention);
  }
  /**
   * Check if a mention already exists
   */
  async exists(sourceId, targetId, spanStart, spanEnd) {
    const result = await this.db.select({ count: sql5`count(*)` }).from(mentionCandidates).where(
      and4(
        eq5(mentionCandidates.sourceId, sourceId),
        eq5(mentionCandidates.targetId, targetId),
        eq5(mentionCandidates.spanStart, spanStart),
        eq5(mentionCandidates.spanEnd, spanEnd)
      )
    );
    return (result[0]?.count ?? 0) > 0;
  }
  /**
   * Update mention status
   */
  async updateStatus(candidateId, status) {
    await this.db.update(mentionCandidates).set({ status }).where(eq5(mentionCandidates.candidateId, candidateId));
    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }
  /**
   * Approve a mention (converts to edge)
   */
  async approve(candidateId) {
    return this.updateStatus(candidateId, "approved");
  }
  /**
   * Reject a mention
   */
  async reject(candidateId) {
    return this.updateStatus(candidateId, "rejected");
  }
  /**
   * Defer a mention for later review
   */
  async defer(candidateId) {
    return this.updateStatus(candidateId, "deferred");
  }
  /**
   * Update confidence score
   */
  async updateConfidence(candidateId, confidence) {
    await this.db.update(mentionCandidates).set({ confidence }).where(eq5(mentionCandidates.candidateId, candidateId));
    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a mention
   */
  async delete(candidateId) {
    await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.candidateId, candidateId));
  }
  /**
   * Delete all mentions for a source
   */
  async deleteForSource(sourceId) {
    const result = await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.sourceId, sourceId));
    return result.changes;
  }
  /**
   * Delete rejected mentions
   */
  async deleteRejected() {
    const result = await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.status, "rejected"));
    return result.changes;
  }
  /**
   * Count mentions
   */
  async count() {
    const result = await this.db.select({ count: sql5`count(*)` }).from(mentionCandidates);
    return result[0]?.count ?? 0;
  }
  /**
   * Count mentions by status
   */
  async countByStatus() {
    const result = await this.db.select({
      status: mentionCandidates.status,
      count: sql5`count(*)`
    }).from(mentionCandidates).groupBy(mentionCandidates.status);
    const counts = {};
    for (const row of result) {
      if (row.status) {
        counts[row.status] = row.count;
      }
    }
    return counts;
  }
  /**
   * Get top mentions by confidence
   */
  async getTopByConfidence(limit = 10) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.status, "new")).orderBy(sql5`${mentionCandidates.confidence} DESC`).limit(limit);
    return result.map(this.rowToMention);
  }
  /**
   * Convert database row to MentionCandidate type
   */
  rowToMention(row) {
    return {
      candidateId: row.candidateId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      surfaceText: row.surfaceText,
      confidence: row.confidence,
      status: row.status ?? "new",
      ...row.spanStart != null && { spanStart: row.spanStart },
      ...row.spanEnd != null && { spanEnd: row.spanEnd },
      ...row.reasons != null && { reasons: row.reasons }
    };
  }
};

// src/storage/database/repositories/unresolved-link-repository.ts
import { sql as sql6 } from "drizzle-orm";
var UnresolvedLinkRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Get all unresolved links grouped by target text for ghost node visualization.
   * Returns ghost node data sorted by reference count (most referenced first).
   */
  async getGhostNodes() {
    const result = await this.db.select({
      targetText: unresolvedLinks.targetText,
      sourceIds: sql6`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
      referenceCount: sql6`COUNT(*)`,
      firstSeen: sql6`MIN(${unresolvedLinks.createdAt})`
    }).from(unresolvedLinks).groupBy(unresolvedLinks.targetText).orderBy(sql6`COUNT(*) DESC`);
    return result.filter((row) => row.targetText && row.targetText.trim() !== "").map((row) => ({
      targetText: row.targetText,
      sourceIds: row.sourceIds ? row.sourceIds.split(",") : [],
      referenceCount: row.referenceCount,
      firstSeen: row.firstSeen
    }));
  }
  /**
   * Get ghost nodes with a minimum reference count threshold.
   * Useful for filtering out rarely-referenced unresolved links.
   */
  async getGhostNodesWithThreshold(minReferenceCount) {
    const result = await this.db.select({
      targetText: unresolvedLinks.targetText,
      sourceIds: sql6`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
      referenceCount: sql6`COUNT(*)`,
      firstSeen: sql6`MIN(${unresolvedLinks.createdAt})`
    }).from(unresolvedLinks).groupBy(unresolvedLinks.targetText).having(sql6`COUNT(*) >= ${minReferenceCount}`).orderBy(sql6`COUNT(*) DESC`);
    return result.filter((row) => row.targetText && row.targetText.trim() !== "").map((row) => ({
      targetText: row.targetText,
      sourceIds: row.sourceIds ? row.sourceIds.split(",") : [],
      referenceCount: row.referenceCount,
      firstSeen: row.firstSeen
    }));
  }
  /**
   * Count total number of unique unresolved link targets (ghost nodes)
   */
  async countGhostNodes() {
    const result = await this.db.select({
      count: sql6`COUNT(DISTINCT ${unresolvedLinks.targetText})`
    }).from(unresolvedLinks);
    return result[0]?.count ?? 0;
  }
  /**
   * Count total number of unresolved link references
   */
  async countReferences() {
    const result = await this.db.select({
      count: sql6`COUNT(*)`
    }).from(unresolvedLinks);
    return result[0]?.count ?? 0;
  }
  /**
   * Get ghost nodes with most recent reference time included.
   * The most recent reference time is the latest of:
   * - The unresolved_link createdAt timestamp
   * - The referencing node's updatedAt timestamp
   *
   * Returns ghost node data sorted by reference count (most referenced first).
   */
  async getGhostNodesWithRecency() {
    const result = await this.db.select({
      targetText: unresolvedLinks.targetText,
      sourceIds: sql6`GROUP_CONCAT(${unresolvedLinks.sourceId}, ',')`,
      referenceCount: sql6`COUNT(*)`,
      firstSeen: sql6`MIN(${unresolvedLinks.createdAt})`,
      mostRecentLinkCreated: sql6`MAX(${unresolvedLinks.createdAt})`
    }).from(unresolvedLinks).groupBy(unresolvedLinks.targetText).orderBy(sql6`COUNT(*) DESC`);
    const ghostsWithRecency = await Promise.all(
      result.filter((row) => row.targetText && row.targetText.trim() !== "").map(async (row) => {
        const sourceIds = row.sourceIds ? row.sourceIds.split(",") : [];
        let mostRecentReferencerUpdate = null;
        if (sourceIds.length > 0) {
          const referencerResult = await this.db.select({
            maxUpdatedAt: sql6`MAX(${nodes.updatedAt})`
          }).from(nodes).where(
            sql6`${nodes.nodeId} IN (${sql6.join(
              sourceIds.map((id) => sql6`${id}`),
              sql6`, `
            )})`
          );
          mostRecentReferencerUpdate = referencerResult[0]?.maxUpdatedAt ?? null;
        }
        const mostRecentRef = [row.mostRecentLinkCreated, mostRecentReferencerUpdate].filter((t) => t !== null).sort().reverse()[0];
        return {
          targetText: row.targetText,
          sourceIds,
          referenceCount: row.referenceCount,
          firstSeen: row.firstSeen,
          mostRecentRef
        };
      })
    );
    return ghostsWithRecency;
  }
  /**
   * Delete unresolved links by target text
   */
  async deleteByTargetText(targetText) {
    const result = await this.db.delete(unresolvedLinks).where(sql6`${unresolvedLinks.targetText} COLLATE NOCASE = ${targetText}`);
    return result.changes;
  }
};

// src/storage/database/repositories/constellation-repository.ts
import { eq as eq6 } from "drizzle-orm";
import { randomUUID } from "crypto";
var ConstellationRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Convert a database row to a Constellation object
   */
  rowToConstellation(row) {
    return {
      constellationId: row.constellationId,
      name: row.name,
      description: row.description ?? void 0,
      hiddenNodeTypes: row.hiddenNodeTypes ?? [],
      hiddenEdgeTypes: row.hiddenEdgeTypes ?? [],
      showGhosts: row.showGhosts === 1,
      ghostThreshold: row.ghostThreshold,
      cameraX: row.cameraX ?? void 0,
      cameraY: row.cameraY ?? void 0,
      cameraZoom: row.cameraZoom ?? void 0,
      focusNodeIds: row.focusNodeIds ?? void 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
  /**
   * Create a new constellation
   */
  async create(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = randomUUID();
    const row = {
      constellationId: id,
      name: input.name,
      description: input.description ?? null,
      hiddenNodeTypes: input.hiddenNodeTypes ?? [],
      hiddenEdgeTypes: input.hiddenEdgeTypes ?? [],
      showGhosts: input.showGhosts !== false ? 1 : 0,
      ghostThreshold: input.ghostThreshold ?? 1,
      cameraX: input.cameraX ?? null,
      cameraY: input.cameraY ?? null,
      cameraZoom: input.cameraZoom ?? null,
      focusNodeIds: input.focusNodeIds ?? null,
      createdAt: now,
      updatedAt: now
    };
    await this.db.insert(constellations).values(row);
    return this.rowToConstellation(row);
  }
  /**
   * Find a constellation by ID
   */
  async findById(id) {
    const rows = await this.db.select().from(constellations).where(eq6(constellations.constellationId, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.rowToConstellation(row);
  }
  /**
   * Find a constellation by name
   */
  async findByName(name) {
    const rows = await this.db.select().from(constellations).where(eq6(constellations.name, name)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.rowToConstellation(row);
  }
  /**
   * Find all constellations
   */
  async findAll() {
    const rows = await this.db.select().from(constellations);
    return rows.map((row) => this.rowToConstellation(row));
  }
  /**
   * Update an existing constellation
   */
  async update(id, input) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updates = {
      updatedAt: now
    };
    if (input.name !== void 0) updates.name = input.name;
    if (input.description !== void 0) updates.description = input.description;
    if (input.hiddenNodeTypes !== void 0) updates.hiddenNodeTypes = input.hiddenNodeTypes;
    if (input.hiddenEdgeTypes !== void 0) updates.hiddenEdgeTypes = input.hiddenEdgeTypes;
    if (input.showGhosts !== void 0) updates.showGhosts = input.showGhosts ? 1 : 0;
    if (input.ghostThreshold !== void 0) updates.ghostThreshold = input.ghostThreshold;
    if (input.cameraX !== void 0) updates.cameraX = input.cameraX;
    if (input.cameraY !== void 0) updates.cameraY = input.cameraY;
    if (input.cameraZoom !== void 0) updates.cameraZoom = input.cameraZoom;
    if (input.focusNodeIds !== void 0) updates.focusNodeIds = input.focusNodeIds;
    await this.db.update(constellations).set(updates).where(eq6(constellations.constellationId, id));
    return this.findById(id);
  }
  /**
   * Delete a constellation by ID
   */
  async delete(id) {
    const result = await this.db.delete(constellations).where(eq6(constellations.constellationId, id));
    return result.changes !== 0;
  }
  /**
   * Delete a constellation by name
   */
  async deleteByName(name) {
    const result = await this.db.delete(constellations).where(eq6(constellations.name, name));
    return result.changes !== 0;
  }
};

// src/storage/database/repositories/embedding-repository.ts
import { eq as eq7, inArray as inArray4, sql as sql7 } from "drizzle-orm";
import { nanoid as nanoid6 } from "nanoid";

// src/core/logger.ts
var Logger = class _Logger {
  level;
  prefix;
  constructor(options = {}) {
    this.level = options.level ?? 1 /* INFO */;
    this.prefix = options.prefix ?? "";
  }
  /**
   * Set the log level
   */
  setLevel(level) {
    this.level = level;
  }
  /**
   * Get the current log level
   */
  getLevel() {
    return this.level;
  }
  /**
   * Format a log message with optional prefix
   */
  format(message) {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }
  /**
   * Log a debug message
   */
  debug(message, ...args) {
    if (this.level <= 0 /* DEBUG */) {
      console.debug(this.format(message), ...args);
    }
  }
  /**
   * Log an info message
   */
  info(message, ...args) {
    if (this.level <= 1 /* INFO */) {
      console.log(this.format(message), ...args);
    }
  }
  /**
   * Log a warning message
   */
  warn(message, ...args) {
    if (this.level <= 2 /* WARN */) {
      console.warn(this.format(message), ...args);
    }
  }
  /**
   * Log an error message
   */
  error(message, ...args) {
    if (this.level <= 3 /* ERROR */) {
      console.error(this.format(message), ...args);
    }
  }
  /**
   * Create a child logger with a prefix
   */
  child(prefix) {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new _Logger({ level: this.level, prefix: childPrefix });
  }
};
var defaultLogger = new Logger();
function getLogger() {
  return defaultLogger;
}

// src/core/circuit-breaker.ts
var logger = getLogger().child("circuit-breaker");
var DEFAULT_CONFIG2 = {
  maxFailures: 3,
  cooldownMs: 6e5
  // 10 minutes
};
var SubsystemBreaker = class {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }
  state = {
    failureCount: 0,
    lastFailure: null,
    lastError: null,
    recoveryInProgress: false
  };
  /**
   * Check if a call should be attempted
   * Returns true for CLOSED or HALF_OPEN states
   */
  shouldAttempt() {
    if (this.state.failureCount < this.config.maxFailures) {
      return true;
    }
    if (this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      if (elapsed >= this.config.cooldownMs) {
        if (this.state.recoveryInProgress) {
          return false;
        }
        this.state.recoveryInProgress = true;
        logger.info(`${this.name}: circuit breaker entering HALF_OPEN - attempting recovery`);
        return true;
      }
    }
    return false;
  }
  /**
   * Record a successful call (resets the breaker)
   */
  recordSuccess() {
    const wasOpen = this.state.failureCount >= this.config.maxFailures;
    this.state.failureCount = 0;
    this.state.lastFailure = null;
    this.state.lastError = null;
    this.state.recoveryInProgress = false;
    if (wasOpen) {
      logger.info(`${this.name}: circuit breaker CLOSED - recovery successful`);
    }
  }
  /**
   * Record a failed call
   */
  recordFailure(error) {
    this.state.failureCount++;
    this.state.lastFailure = Date.now();
    this.state.lastError = error.message;
    this.state.recoveryInProgress = false;
    logger.warn(
      `${this.name}: failure ${this.state.failureCount}/${this.config.maxFailures}: ${error.message}`
    );
    if (this.state.failureCount >= this.config.maxFailures) {
      logger.error(
        `${this.name}: circuit breaker OPEN - will retry after ${this.config.cooldownMs / 1e3}s cooldown`
      );
    }
  }
  /**
   * Get the current state of this subsystem
   */
  getState() {
    if (this.state.failureCount < this.config.maxFailures) {
      return "CLOSED" /* CLOSED */;
    }
    if (this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      if (elapsed >= this.config.cooldownMs) {
        return "HALF_OPEN" /* HALF_OPEN */;
      }
    }
    return "OPEN" /* OPEN */;
  }
  /**
   * Get detailed status for reporting
   */
  getStatus() {
    const state = this.getState();
    let cooldownRemainingMs = null;
    if (state === "OPEN" /* OPEN */ && this.state.lastFailure !== null) {
      const elapsed = Date.now() - this.state.lastFailure;
      cooldownRemainingMs = Math.max(0, this.config.cooldownMs - elapsed);
    }
    return {
      state,
      failureCount: this.state.failureCount,
      lastFailure: this.state.lastFailure ? new Date(this.state.lastFailure) : null,
      lastError: this.state.lastError,
      cooldownRemainingMs
    };
  }
  /**
   * Reset the breaker (for testing or manual intervention)
   */
  reset() {
    this.state = {
      failureCount: 0,
      lastFailure: null,
      lastError: null,
      recoveryInProgress: false
    };
    logger.info(`${this.name}: circuit breaker manually reset`);
  }
};
var CircuitBreaker = class {
  breakers = /* @__PURE__ */ new Map();
  config;
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG2, ...config };
  }
  getBreaker(subsystem) {
    let breaker = this.breakers.get(subsystem);
    if (!breaker) {
      breaker = new SubsystemBreaker(subsystem, this.config);
      this.breakers.set(subsystem, breaker);
    }
    return breaker;
  }
  /**
   * Check if a call to the subsystem should be attempted
   */
  shouldAttempt(subsystem) {
    return this.getBreaker(subsystem).shouldAttempt();
  }
  /**
   * Record a successful call to the subsystem
   */
  recordSuccess(subsystem) {
    this.getBreaker(subsystem).recordSuccess();
  }
  /**
   * Record a failed call to the subsystem
   */
  recordFailure(subsystem, error) {
    this.getBreaker(subsystem).recordFailure(error);
  }
  /**
   * Get the state of a subsystem
   */
  getState(subsystem) {
    return this.getBreaker(subsystem).getState();
  }
  /**
   * Get detailed status of a subsystem
   */
  getStatus(subsystem) {
    return this.getBreaker(subsystem).getStatus();
  }
  /**
   * Get status of all active subsystems
   */
  getAllStatus() {
    const result = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStatus();
    }
    return result;
  }
  /**
   * Check if any subsystem is in a degraded state (OPEN or HALF_OPEN)
   */
  hasDegradedSubsystems() {
    for (const breaker of this.breakers.values()) {
      const state = breaker.getState();
      if (state !== "CLOSED" /* CLOSED */) {
        return true;
      }
    }
    return false;
  }
  /**
   * Get warnings for degraded subsystems (for health summary)
   */
  getWarnings() {
    const warnings = [];
    for (const [name, breaker] of this.breakers) {
      const status = breaker.getStatus();
      if (status.state === "OPEN" /* OPEN */ && status.cooldownRemainingMs !== null) {
        const cooldownMinutes = Math.ceil(status.cooldownRemainingMs / 6e4);
        warnings.push(`${name} disabled (cooldown ${cooldownMinutes}m)`);
      } else if (status.state === "HALF_OPEN" /* HALF_OPEN */) {
        warnings.push(`${name} recovering`);
      }
    }
    return warnings;
  }
  /**
   * Reset a specific subsystem (for testing or manual intervention)
   */
  reset(subsystem) {
    this.getBreaker(subsystem).reset();
  }
  /**
   * Reset all subsystems
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
};
var defaultCircuitBreaker = null;
function getCircuitBreaker() {
  if (!defaultCircuitBreaker) {
    defaultCircuitBreaker = new CircuitBreaker();
  }
  return defaultCircuitBreaker;
}

// src/storage/database/repositories/embedding-repository.ts
var EmbeddingRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new embedding
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async create(data) {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt("embeddings")) {
      return null;
    }
    const embeddingId = nanoid6();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      embeddingId,
      nodeId: data.nodeId,
      embedding: data.embedding,
      model: data.model,
      dimensions: data.dimensions,
      contentHash: data.contentHash,
      computedAt: now
    };
    try {
      await this.db.insert(nodeEmbeddings).values(row);
      cb.recordSuccess("embeddings");
      return this.rowToEmbedding({ ...row, embeddingId, computedAt: now });
    } catch (error) {
      cb.recordFailure("embeddings", error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
  /**
   * Create or update an embedding for a node
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async upsert(data) {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt("embeddings")) {
      return null;
    }
    const existing = await this.findByNodeId(data.nodeId);
    if (existing) {
      return this.update(existing.embeddingId, data);
    }
    return this.create(data);
  }
  /**
   * Find an embedding by ID
   */
  async findById(embeddingId) {
    const result = await this.db.select().from(nodeEmbeddings).where(eq7(nodeEmbeddings.embeddingId, embeddingId)).limit(1);
    return result[0] ? this.rowToEmbedding(result[0]) : null;
  }
  /**
   * Find embedding by node ID
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(nodeEmbeddings).where(eq7(nodeEmbeddings.nodeId, nodeId)).limit(1);
    return result[0] ? this.rowToEmbedding(result[0]) : null;
  }
  /**
   * Find all embeddings
   * Protected by vectorDb circuit breaker as this powers similarity search
   */
  async findAll() {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt("vectorDb")) {
      return [];
    }
    try {
      const result = await this.db.select().from(nodeEmbeddings);
      cb.recordSuccess("vectorDb");
      return result.map((row) => this.rowToEmbedding(row));
    } catch (error) {
      cb.recordFailure("vectorDb", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
  /**
   * Find embeddings by model
   */
  async findByModel(model) {
    const result = await this.db.select().from(nodeEmbeddings).where(eq7(nodeEmbeddings.model, model));
    return result.map((row) => this.rowToEmbedding(row));
  }
  /**
   * Find embeddings by node IDs
   * Protected by vectorDb circuit breaker as this powers similarity search
   */
  async findByNodeIds(nodeIds) {
    if (nodeIds.length === 0) return [];
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt("vectorDb")) {
      return [];
    }
    try {
      const result = await this.db.select().from(nodeEmbeddings).where(inArray4(nodeEmbeddings.nodeId, nodeIds));
      cb.recordSuccess("vectorDb");
      return result.map((row) => this.rowToEmbedding(row));
    } catch (error) {
      cb.recordFailure("vectorDb", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
  /**
   * Find nodes that need embedding computation
   * Returns nodes where either:
   * - No embedding exists
   * - The content hash has changed since last embedding
   */
  async findDirtyNodeIds() {
    const allNodes = await this.db.select({
      nodeId: nodes.nodeId,
      contentHash: nodes.contentHash
    }).from(nodes);
    const embeddings = await this.db.select({
      nodeId: nodeEmbeddings.nodeId,
      contentHash: nodeEmbeddings.contentHash
    }).from(nodeEmbeddings);
    const embeddingMap = new Map(embeddings.map((e) => [e.nodeId, e.contentHash]));
    const dirtyNodeIds = [];
    for (const node of allNodes) {
      const existingHash = embeddingMap.get(node.nodeId);
      if (!existingHash || existingHash !== node.contentHash) {
        dirtyNodeIds.push(node.nodeId);
      }
    }
    return dirtyNodeIds;
  }
  /**
   * Update an embedding
   * Protected by embeddings circuit breaker as this is part of the embedding pipeline
   */
  async update(embeddingId, data) {
    const cb = getCircuitBreaker();
    if (!cb.shouldAttempt("embeddings")) {
      return null;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updateData = {
      computedAt: now
    };
    if (data.embedding !== void 0) updateData.embedding = data.embedding;
    if (data.model !== void 0) updateData.model = data.model;
    if (data.dimensions !== void 0) updateData.dimensions = data.dimensions;
    if (data.contentHash !== void 0) updateData.contentHash = data.contentHash;
    try {
      await this.db.update(nodeEmbeddings).set(updateData).where(eq7(nodeEmbeddings.embeddingId, embeddingId));
      cb.recordSuccess("embeddings");
      const updated = await this.findById(embeddingId);
      if (!updated) {
        return null;
      }
      return updated;
    } catch (error) {
      cb.recordFailure("embeddings", error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
  /**
   * Delete an embedding by ID
   */
  async delete(embeddingId) {
    await this.db.delete(nodeEmbeddings).where(eq7(nodeEmbeddings.embeddingId, embeddingId));
  }
  /**
   * Delete embedding by node ID
   */
  async deleteByNodeId(nodeId) {
    await this.db.delete(nodeEmbeddings).where(eq7(nodeEmbeddings.nodeId, nodeId));
  }
  /**
   * Delete all embeddings for a model
   */
  async deleteByModel(model) {
    const result = await this.db.delete(nodeEmbeddings).where(eq7(nodeEmbeddings.model, model));
    return result.changes;
  }
  /**
   * Count embeddings
   */
  async count() {
    const result = await this.db.select({ count: sql7`count(*)` }).from(nodeEmbeddings);
    return result[0]?.count ?? 0;
  }
  /**
   * Count embeddings by model
   */
  async countByModel() {
    const result = await this.db.select({
      model: nodeEmbeddings.model,
      count: sql7`count(*)`
    }).from(nodeEmbeddings).groupBy(nodeEmbeddings.model);
    const counts = {};
    for (const row of result) {
      counts[row.model] = row.count;
    }
    return counts;
  }
  /**
   * Convert database row to NodeEmbedding type
   */
  rowToEmbedding(row) {
    return {
      embeddingId: row.embeddingId,
      nodeId: row.nodeId,
      embedding: row.embedding,
      model: row.model,
      dimensions: row.dimensions,
      contentHash: row.contentHash,
      computedAt: row.computedAt
    };
  }
};

// src/storage/database/repositories/wormhole-repository.ts
import { eq as eq8, and as and5, or as or2, sql as sql8 } from "drizzle-orm";
import { nanoid as nanoid7 } from "nanoid";
var WormholeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new rejection
   */
  async createRejection(data) {
    const rejectionId = nanoid7();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const [normalizedSourceId, normalizedTargetId, normalizedSourceHash, normalizedTargetHash] = data.sourceId < data.targetId ? [data.sourceId, data.targetId, data.sourceContentHash, data.targetContentHash] : [data.targetId, data.sourceId, data.targetContentHash, data.sourceContentHash];
    const row = {
      rejectionId,
      sourceId: normalizedSourceId,
      targetId: normalizedTargetId,
      sourceContentHash: normalizedSourceHash,
      targetContentHash: normalizedTargetHash,
      rejectedAt: now
    };
    await this.db.insert(wormholeRejections).values(row);
    return this.rowToRejection({ ...row, rejectionId, rejectedAt: now });
  }
  /**
   * Check if a pair is rejected (considering content hashes)
   * Returns true if the pair was rejected AND the content hasn't changed
   */
  async isRejected(sourceId, targetId, sourceContentHash, targetContentHash) {
    const [normalizedSourceId, normalizedTargetId, normalizedSourceHash, normalizedTargetHash] = sourceId < targetId ? [sourceId, targetId, sourceContentHash, targetContentHash] : [targetId, sourceId, targetContentHash, sourceContentHash];
    const result = await this.db.select().from(wormholeRejections).where(
      and5(
        eq8(wormholeRejections.sourceId, normalizedSourceId),
        eq8(wormholeRejections.targetId, normalizedTargetId),
        eq8(wormholeRejections.sourceContentHash, normalizedSourceHash),
        eq8(wormholeRejections.targetContentHash, normalizedTargetHash)
      )
    ).limit(1);
    return result.length > 0;
  }
  /**
   * Check if any rejection exists for a pair (regardless of content hash)
   */
  async hasAnyRejection(sourceId, targetId) {
    const [normalizedSourceId, normalizedTargetId] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    const result = await this.db.select().from(wormholeRejections).where(
      and5(
        eq8(wormholeRejections.sourceId, normalizedSourceId),
        eq8(wormholeRejections.targetId, normalizedTargetId)
      )
    ).limit(1);
    return result.length > 0;
  }
  /**
   * Find all rejections
   */
  async findAll() {
    const result = await this.db.select().from(wormholeRejections);
    return result.map((row) => this.rowToRejection(row));
  }
  /**
   * Find rejections for a specific node
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(wormholeRejections).where(or2(eq8(wormholeRejections.sourceId, nodeId), eq8(wormholeRejections.targetId, nodeId)));
    return result.map((row) => this.rowToRejection(row));
  }
  /**
   * Delete a rejection by ID
   */
  async delete(rejectionId) {
    await this.db.delete(wormholeRejections).where(eq8(wormholeRejections.rejectionId, rejectionId));
  }
  /**
   * Delete rejections for a node pair
   */
  async deleteForPair(sourceId, targetId) {
    const [normalizedSourceId, normalizedTargetId] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    await this.db.delete(wormholeRejections).where(
      and5(
        eq8(wormholeRejections.sourceId, normalizedSourceId),
        eq8(wormholeRejections.targetId, normalizedTargetId)
      )
    );
  }
  /**
   * Delete all rejections for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(wormholeRejections).where(or2(eq8(wormholeRejections.sourceId, nodeId), eq8(wormholeRejections.targetId, nodeId)));
    return result.changes;
  }
  /**
   * Clear all rejections
   */
  async clearAll() {
    const result = await this.db.delete(wormholeRejections);
    return result.changes;
  }
  /**
   * Count rejections
   */
  async count() {
    const result = await this.db.select({ count: sql8`count(*)` }).from(wormholeRejections);
    return result[0]?.count ?? 0;
  }
  /**
   * Convert database row to WormholeRejection type
   */
  rowToRejection(row) {
    return {
      rejectionId: row.rejectionId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      sourceContentHash: row.sourceContentHash,
      targetContentHash: row.targetContentHash,
      rejectedAt: row.rejectedAt
    };
  }
};

// src/storage/database/repositories/candidate-edge-repository.ts
import { eq as eq9, and as and6, inArray as inArray5, sql as sql9 } from "drizzle-orm";
var CandidateEdgeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new candidate edge
   */
  async create(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const [fromIdNorm, toIdNorm] = data.fromId < data.toId ? [data.fromId, data.toId] : [data.toId, data.fromId];
    const row = {
      suggestionId: data.suggestionId,
      fromId: data.fromId,
      toId: data.toId,
      suggestedEdgeType: data.suggestedEdgeType,
      fromIdNorm,
      toIdNorm,
      status: "suggested",
      signals: data.signals ?? null,
      reasons: data.reasons ?? null,
      provenance: data.provenance ?? null,
      createdAt: now,
      lastComputedAt: now
    };
    await this.db.insert(candidateEdges).values(row);
    return this.rowToCandidateEdge({
      ...row,
      statusChangedAt: null,
      lastSeenAt: null,
      writebackStatus: null,
      writebackReason: null,
      approvedEdgeId: null
    });
  }
  /**
   * Create or update a candidate edge (upsert by suggestionId)
   */
  async upsert(data) {
    const existing = await this.findById(data.suggestionId);
    if (existing) {
      const mergedSignals = { ...existing.signals, ...data.signals };
      const mergedReasons = [.../* @__PURE__ */ new Set([...existing.reasons || [], ...data.reasons || []])];
      const mergedProvenance = [...existing.provenance || [], ...data.provenance || []];
      return this.update(data.suggestionId, {
        signals: mergedSignals,
        reasons: mergedReasons.slice(0, 3),
        // Keep top 3
        provenance: mergedProvenance
      });
    }
    return this.create(data);
  }
  /**
   * Find a candidate edge by ID
   */
  async findById(suggestionId) {
    const result = await this.db.select().from(candidateEdges).where(eq9(candidateEdges.suggestionId, suggestionId)).limit(1);
    return result[0] ? this.rowToCandidateEdge(result[0]) : null;
  }
  /**
   * Find candidate edges by status
   */
  async findByStatus(status) {
    const result = await this.db.select().from(candidateEdges).where(eq9(candidateEdges.status, status));
    return result.map((row) => this.rowToCandidateEdge(row));
  }
  /**
   * Find candidate edges involving a specific node (as source or target)
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(candidateEdges).where(
      sql9`${candidateEdges.fromId} = ${nodeId} OR ${candidateEdges.toId} = ${nodeId}`
    );
    return result.map((row) => this.rowToCandidateEdge(row));
  }
  /**
   * Find suggested candidate edges for nodes in a given set
   */
  async findSuggestedForNodes(nodeIds) {
    if (nodeIds.length === 0) return [];
    const result = await this.db.select().from(candidateEdges).where(
      and6(
        eq9(candidateEdges.status, "suggested"),
        sql9`(${candidateEdges.fromId} IN ${nodeIds} OR ${candidateEdges.toId} IN ${nodeIds})`
      )
    );
    return result.map((row) => this.rowToCandidateEdge(row));
  }
  /**
   * Find by normalized pair (for checking duplicates)
   */
  async findByNormalizedPair(nodeId1, nodeId2, edgeType) {
    const [fromIdNorm, toIdNorm] = nodeId1 < nodeId2 ? [nodeId1, nodeId2] : [nodeId2, nodeId1];
    const result = await this.db.select().from(candidateEdges).where(
      and6(
        eq9(candidateEdges.fromIdNorm, fromIdNorm),
        eq9(candidateEdges.toIdNorm, toIdNorm),
        eq9(candidateEdges.suggestedEdgeType, edgeType)
      )
    ).limit(1);
    return result[0] ? this.rowToCandidateEdge(result[0]) : null;
  }
  /**
   * Update a candidate edge
   */
  async update(suggestionId, data) {
    const updateData = {
      lastComputedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (data.status !== void 0) {
      updateData.status = data.status;
      updateData.statusChangedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (data.signals !== void 0) updateData.signals = data.signals;
    if (data.reasons !== void 0) updateData.reasons = data.reasons;
    if (data.provenance !== void 0) updateData.provenance = data.provenance;
    if (data.writebackStatus !== void 0) updateData.writebackStatus = data.writebackStatus;
    if (data.writebackReason !== void 0) updateData.writebackReason = data.writebackReason;
    if (data.approvedEdgeId !== void 0) updateData.approvedEdgeId = data.approvedEdgeId;
    await this.db.update(candidateEdges).set(updateData).where(eq9(candidateEdges.suggestionId, suggestionId));
    const updated = await this.findById(suggestionId);
    if (!updated) {
      throw new Error(`Candidate edge ${suggestionId} not found after update`);
    }
    return updated;
  }
  /**
   * Update status of a candidate edge
   */
  async updateStatus(suggestionId, status, approvedEdgeId) {
    const updateData = { status };
    if (approvedEdgeId !== void 0) {
      updateData.approvedEdgeId = approvedEdgeId;
    }
    return this.update(suggestionId, updateData);
  }
  /**
   * Mark last seen time for candidate edges (for pruning stale suggestions)
   */
  async markSeen(suggestionIds) {
    if (suggestionIds.length === 0) return;
    await this.db.update(candidateEdges).set({ lastSeenAt: (/* @__PURE__ */ new Date()).toISOString() }).where(inArray5(candidateEdges.suggestionId, suggestionIds));
  }
  /**
   * Delete a candidate edge
   */
  async delete(suggestionId) {
    await this.db.delete(candidateEdges).where(eq9(candidateEdges.suggestionId, suggestionId));
  }
  /**
   * Delete all candidate edges for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(candidateEdges).where(
      sql9`${candidateEdges.fromId} = ${nodeId} OR ${candidateEdges.toId} = ${nodeId}`
    );
    return result.changes;
  }
  /**
   * Count candidate edges by status
   */
  async countByStatus() {
    const result = await this.db.select({
      status: candidateEdges.status,
      count: sql9`count(*)`
    }).from(candidateEdges).groupBy(candidateEdges.status);
    const counts = {
      suggested: 0,
      approved: 0,
      rejected: 0
    };
    for (const row of result) {
      counts[row.status] = row.count;
    }
    return counts;
  }
  /**
   * Count total candidate edges
   */
  async count() {
    const result = await this.db.select({ count: sql9`count(*)` }).from(candidateEdges);
    return result[0]?.count ?? 0;
  }
  /**
   * Convert database row to CandidateEdge type
   */
  rowToCandidateEdge(row) {
    const result = {
      suggestionId: row.suggestionId,
      fromId: row.fromId,
      toId: row.toId,
      suggestedEdgeType: row.suggestedEdgeType,
      status: row.status,
      createdAt: row.createdAt,
      lastComputedAt: row.lastComputedAt
    };
    if (row.statusChangedAt) result.statusChangedAt = row.statusChangedAt;
    if (row.signals) result.signals = row.signals;
    if (row.reasons) result.reasons = row.reasons;
    if (row.provenance) result.provenance = row.provenance;
    if (row.lastSeenAt) result.lastSeenAt = row.lastSeenAt;
    if (row.writebackStatus) result.writebackStatus = row.writebackStatus;
    if (row.writebackReason) result.writebackReason = row.writebackReason;
    if (row.approvedEdgeId) result.approvedEdgeId = row.approvedEdgeId;
    return result;
  }
};

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
  CandidateEdgeRepository,
  CandidateEdgeSourceSchema,
  CandidateEdgeStatusSchema,
  ChunkRepository,
  ChunkSchema,
  ConfigError,
  ConnectionManager,
  ConstellationRepository,
  ContextAssembler,
  ContinuityError,
  DEFAULT_CONFIG,
  DatabaseError,
  EdgeProvenanceSchema,
  EdgeRepository,
  EdgeSchema,
  EdgeTypeSchema,
  EmbeddingError,
  EmbeddingRepository,
  FileSystemError,
  FrontmatterSchema,
  GraphEngine,
  GraphError,
  GraphMetricsSchema,
  InMemoryLinkResolver,
  IndexingPipeline,
  LAYER_A_EDGES,
  LAYER_B_EDGES,
  LAYER_C_EDGES,
  LinkResolver,
  MentionCandidateSchema,
  MentionRepository,
  MentionStatusSchema,
  NodeRepository,
  NodeSchema,
  NodeTypeSchema,
  ParseError,
  ProposalError,
  ProposalSchema,
  ProposalStatusSchema,
  ProposalTypeSchema,
  ResolutionError,
  RetrievalError,
  UnresolvedLinkRepository,
  ValidationError,
  VersionRepository,
  VersionSchema,
  WormholeRepository,
  ZettelScriptError,
  createLinkResolver,
  createWikilink,
  extractAliases,
  extractLinkTargets,
  extractNodeType,
  extractPlainText,
  extractTitle,
  extractWikilinks,
  generateSuggestionId,
  getDatabase,
  getEdgeLayer,
  getRawSqlite,
  getUniqueTargets,
  getWikilinkContext,
  hasWikilinks,
  insertWikilink,
  isUndirectedEdgeType,
  normalizeTarget,
  parseFrontmatter,
  parseMarkdown,
  parseWikilinkString,
  serializeFrontmatter,
  shouldRenderEdge,
  splitIntoParagraphs,
  splitIntoSections,
  stringifyMarkdown,
  targetsMatch,
  updateFrontmatter,
  validateFrontmatter
};
//# sourceMappingURL=index.js.map