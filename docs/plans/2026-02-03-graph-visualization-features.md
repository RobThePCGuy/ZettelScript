# Novel Graph Visualization Features for ZettelScript

## Overview

Analysis of 8 novel graph visualization concepts and their applicability to ZettelScript's existing architecture.

## ZettelScript's Current Capabilities

- **Atlas Visualization**: Force-directed interactive graph (force-graph library)
- **10 node types**: note, scene, character, location, object, event, concept, moc, timeline, draft
- **11 edge types**: explicit_link, backlink, sequence, hierarchy, participation, pov_visible_to, causes, setup_payoff, semantic, mention, alias
- **Graph engine**: Traversal, shortest path, centrality, connected components
- **Timestamps**: createdAt/updatedAt on all nodes
- **Embedding infrastructure**: OpenAI/Ollama providers (semantic edges not yet populated)
- **Unresolved links tracking**: Already in database

---

## Feature Analysis

### 1. Ghost Nodes
**Show unresolved links as translucent nodes floating at the edge. Click to create them.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Excellent - `unresolvedLinks` table already exists |
| **Complexity** | LOW |
| **Infrastructure** | 80% complete |
| **Work needed** | Add ghost node rendering to Atlas, click-to-create handler |

**Key files**: `visualize.ts`, `schema.ts` (unresolvedLinks table)

---

### 2. Time Scrubber
**Slider to scrub through vault history based on file dates.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Good - timestamps exist on nodes/edges/versions |
| **Complexity** | MEDIUM |
| **Infrastructure** | 50% complete |
| **Work needed** | Timeline queries, time-filtered graph generator, slider UI |

**Key files**: `visualize.ts`, node/edge repositories

---

### 3. Heat Vision Mode
**Nodes glow based on recency (red=recent, blue=old).**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Excellent - `updatedAt` provides exact recency |
| **Complexity** | LOW |
| **Infrastructure** | 90% complete |
| **Work needed** | Heat calculation, color interpolation, toggle button |

**Key files**: `visualize.ts` only

---

### 4. Narrative Pathfinder
**Select two nodes, get reading order through notes. Export as TOC.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Excellent - `findShortestPath()` exists, `sequence` edges for ordering |
| **Complexity** | MEDIUM |
| **Infrastructure** | 70% complete |
| **Work needed** | Narrative ordering algorithm, TOC export, two-node selection UI |

**Key files**: `engine.ts`, `visualize.ts`

---

### 5. Constellation Snapshots
**Save specific views as named constellations.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Partial - no view persistence currently |
| **Complexity** | MEDIUM |
| **Infrastructure** | 30% complete |
| **Work needed** | New `constellations` table, repository, save/load UI, CLI flag |

**Key files**: `schema.ts`, `visualize.ts`, new repository

---

### 6. Cluster Auto-Naming
**Detect dense clusters and suggest names based on common tags/types.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Excellent - `findConnectedComponents()` exists, `graphMetrics.clusterId` ready |
| **Complexity** | MEDIUM |
| **Infrastructure** | 60% complete |
| **Work needed** | Naming algorithm (tag/type frequency analysis), UI popup |

**Key files**: `engine.ts`, `moc-engine.ts`, `visualize.ts`

---

### 7. Gravity Mode
**High-connectivity nodes become gravity wells pulling satellites closer.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Good - force-graph supports custom D3 forces, `getDegree()` exists |
| **Complexity** | MEDIUM |
| **Infrastructure** | 40% complete |
| **Work needed** | Custom gravity force function, weight pre-computation, toggle |

**Key files**: `visualize.ts`, `engine.ts`

---

### 8. Semantic Wormholes
**Dotted lines connecting semantically similar but unlinked nodes.**

| Aspect | Assessment |
|--------|------------|
| **Fit** | Infrastructure exists but not populated |
| **Complexity** | HIGH |
| **Infrastructure** | 20% complete |
| **Work needed** | Embeddings table, similarity computation, batch embedding pipeline, vector search |

**Key files**: `schema.ts`, `provider.ts`, new similarity service, `visualize.ts`

Note: The `semantic` edge type and styling already exist - this feature would populate them.

---

## Revised Priority Order

| Priority | Feature | Rationale |
|----------|---------|-----------|
| 1 | **Ghost Nodes** | Slam dunk. Turns database fact into visible affordance. Low risk. |
| 2 | **Constellations** | Foundational UX. Makes everything else more usable. Prevents hairball problem. |
| 3 | **Semantic Wormholes** | Strategic win. Completes embedding infrastructure story. |
| 4 | **Narrative Pathfinder** | Sneaky-good. "Publishing algorithm" not just graph algorithm. |
| 5 | **Heat Vision** | High value, low risk. Answers "what am I actually working on". |
| 6 | **Time Scrubber** | Powerful but expensive. Needs precomputed deltas to avoid performance issues. |
| 7 | **Cluster Auto-Naming** | Useful once clusters are stable. Keep labels as suggestions, not auto-rename. |
| 8 | **Gravity Mode** | Optional delight mode after core feels stable. |

**Meta-pattern**: "Suggest, don't silently mutate" - aligns with provenance tracking culture.

---

## Natural Synergies

**Ghost Nodes + Proposal System**: Click ghost → create proposal → approve → new note created

**Heat Vision + Gravity Mode**: Hot hubs attract more visually - shows active knowledge centers

**Cluster Auto-Naming + MOC Engine**: Auto-named clusters become MOC notes

**Semantic Wormholes + Mention Detection**: Both discover "hidden" connections

**Time Scrubber + Constellations**: Save temporal snapshots as named views

---

## Progress

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Ghost Nodes | **COMPLETE** |
| 2 | Constellations | **COMPLETE** |
| 3 | Semantic Wormholes | **COMPLETE** |
| 4 | Narrative Pathfinder | **COMPLETE** |
| 5 | Heat Vision | Pending |
| 6 | Time Scrubber | Pending |
| 7 | Cluster Auto-Naming | Pending |
| 8 | Gravity Mode | Pending |

---

## Implementation Notes

### 1. Ghost Nodes
- Render unresolved references as lightweight pseudo-nodes (no permanent ID yet)
- Anchored near the node that references them
- Low opacity, dashed outline styling
- Click creates real node prefilled with unresolved label, backfills edge
- **Clutter mitigation**: Toggle + threshold (top N unresolved per view, or above confidence/frequency)

### 2. Constellations
Store as JSON blob with:
- Filters (node/edge types)
- Focus set (seed nodes)
- Layout state (pinned positions, camera)
- Display modes (heat, wormholes enabled, etc.)
- Name and optional description

### 3. Semantic Wormholes
- Render as dotted, low-priority edges
- Show provenance ("suggested by model X, similarity Y")
- Let users accept/reject
- Accepted → convert to first-class edge with provenance
- **False positive mitigation**: Thresholds, per-node top-k limits, review queue

### 4. Narrative Pathfinder
- v1: Take chosen path, expand into curated walk
- Optionally insert high-confidence supporting nodes (definitions, evidence, prerequisites)
- Scoring function: edge weight, confidence, recency, node type priority
- Export as table of contents
- **Label as "suggested itinerary"** not "the best"
- Knobs: max length, prefer provenance-heavy edges, avoid speculative edges

### 5. Heat Vision
- Use `updatedAt` as default signal
- Optional: blend with view counts or "touched by link edits"
- **Accessibility**: Multiple palettes (not just red/blue), legend

### 6. Time Scrubber
- **Performance**: Precompute daily/weekly deltas of nodes/edges added/updated
- Replay deltas when scrubbing (don't rebuild whole graph per slider move)
- Edges need timestamps to be historically correct

### 7. Cluster Auto-Naming
- Compute candidate labels from node titles, tags, entity mentions
- Rank by TF-IDF (term frequency in cluster, rarity globally)
- Propose 1-3 names
- **Keep humble**: "Suggested: ..." and editable, never auto-rename

### 8. Gravity Mode
- Add attractive forces toward high-degree/high-centrality nodes
- Increase repulsion elsewhere
- **Keep as explicit mode**, not default
- Consider snapping back to stable layout when toggled off
