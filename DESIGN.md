# ZettelScript DESIGN.md (v2)
## From graph database to memory prosthetic

This document defines what ZettelScript is trying to become, how it should feel to use, and the architectural rules that prevent it from turning into a hairball generator.

ZettelScript v1 built graphs. v2 must build understanding.

---

## 1. Problem and vision

### The problem

ZettelScript currently succeeds at producing a dense graph, but users do not get "bigger picture" value because:

- Mention edges dominate the visualization and explode combinatorially.
- The graph is treated as the destination instead of a tool that supports writing and thinking.
- Multi-step rituals (extract -> discover -> approve -> viz) hide the feedback loop.
- Silent failures (especially embeddings) destroy trust.
- The result feels like a database, not a memory aid.

### The vision: a memory prosthetic

ZettelScript should behave like a live extension of memory.

When a user writes or thinks:
- It surfaces the most relevant prior material.
- It highlights what is missing, abandoned, or disconnected.
- It suggests connections that can be accepted with one click.
- It presents structure at the right level of abstraction (clusters/threads first, details on demand).

### Core principles

1. **The editor is home**
   - The graph is a map, not a dashboard.
   - The default experience is "local neighborhood of the current note."

2. **Connections have meaning**
   - Co-occurrence is not relationship.
   - Mention edges are suggestions, not first-class truth.

3. **Abstraction over exhaustion**
   - Default view emphasizes clusters and threads.
   - Full detail is available, but never the default.

4. **Silence is failure**
   - Any failure to compute (embeddings, similarity, extraction) must be visible.
   - Prefer loud warnings and status panels over quiet degradation.

5. **One command, immediate value**
   - The primary path should not require multi-step rituals.
   - A user should be able to run one command and get a useful view.

---

## 2. Product goals and non-goals

### Goals

- Make "connections" actionable, not decorative.
- Make orphans and gaps obvious and prioritized.
- Make suggestions safe (user approval, provenance, undoability).
- Support real-time updates (write -> suggestions update -> graph patches).
- Work across any folder of notes, not only Obsidian.
- Keep user data local and portable (markdown stays markdown).

### Non-goals (for v2)

- Perfect world-model reasoning or long-form agent behavior.
- Fully automatic link writing with no user approval (default).
- A single monolithic UI that replaces the editor.

---

## 3. The three-layer graph model

The key design correction is to treat different edge classes differently.

### Layer A: Truth edges (default ON)

Edges that represent explicit user intent or durable structure:
- `explicit_link` (markdown links, wikilinks)
- `hierarchy` (tags, folders, parent/child if meaningful)
- `sequence` (chapter/scene order)
- other typed user-authored relations if present

These edges are stable and safe to visualize by default.

### Layer B: Semantic edges (default ON, bounded)

Edges that represent computed similarity:
- `semantic_wormhole` (top-k nearest neighbors above threshold)

Rules:
- Bounded per node (top-k) to avoid density blowups.
- Visually distinct (dotted or subdued).
- Never silent-fail: show status if embeddings missing or stale.

### Layer C: Suggestion edges (default OFF or faint)

Edges that represent candidates, not truth:
- `mention_candidate`
- `semantic_suggestion` (below threshold)
- `unresolved_link` (ghost nodes)
- `backlink` only if it adds noise

Rules:
- Not part of the default hairball.
- Shown via "Suggestions mode" or via side panels and focused local views.
- Must support accept/ignore with provenance.

---

## 4. Default UX: focus-first, not universe-first

### The default view is a focus view

On open (or on focus command), show:
- The current note (center)
- Its local neighborhood under a node budget (e.g., 200 nodes)
- Cluster summaries for anything beyond the budget
- A suggestions panel: related notes, suggested links, orphans

### The graph is for navigation, not interpretation

Interpretation comes from:
- Ranked lists (what to look at next)
- Filters that reduce noise
- Cluster names and thread summaries
- Provenance and confidence indicators

---

## 5. Orphans and gaps: define what matters

A useful orphan is not `degree == 0`. A useful orphan is "lonely but relevant."

### Orphan score (draft)

Compute a score that prioritizes integration work:

- `lowTruthDegree`: few Layer A edges
- `highSemanticPull`: many strong semantic neighbors (Layer B)
- `highMentionPressure`: repeatedly referenced but not resolved (Layer C)
- `importance`: recency (Heat Vision), frequency, or user pin

Example formula (not final):
```
orphanScore =
  w1 * (1 / (1 + truthDegree)) +
  w2 * semanticPull +
  w3 * mentionPressure +
  w4 * importance
```

Output:
- A backlog list of top orphans
- One-click actions (create note, link, accept suggestion)
- Visual highlighting in focus view

---

## 6. Real-time loop: the system must respond while writing

### The loop

1. User edits a note
2. System updates local index for that note (and affected neighbors)
3. System recomputes suggestions (wormholes, mentions, orphan score)
4. UI updates immediately (no refresh, no rebuild ritual)
5. User accepts or rejects suggestions
6. Accept writes back to markdown and patches the graph

### Architectural requirement

Batch CLI remains valuable, but the core experience needs a long-lived process:
- Daemon mode or editor plugin mode
- WebSocket or local IPC for patches
- Clear status and health reporting

---

## 7. Commands and workflows (user-facing)

### One-command path to value

```bash
zs focus <file-or-node>
```

This command:
- Builds or updates index as needed
- Computes semantic neighbors for the focus area
- Opens Atlas in focus mode (bounded expansion)
- Shows suggestions and orphan backlog

### Batch and maintenance commands (still exist)

```bash
zs index
zs embed compute
zs wormhole compute
zs discover          # mentions/candidates
zs approve           # apply accepted suggestions
zs visualize         # full export
```

But the default documentation and onboarding should lead with `zs focus`.

---

## 8. Visualization rules (Atlas)

### Defaults

- Render Layer A and Layer B only.
- Layer C hidden or very faint until Suggestions mode is toggled.
- Mention edges never dominate the screen.

### Modes

| Mode | Purpose |
|------|---------|
| Focus mode | Default - current note + local neighborhood |
| Suggestions mode | Shows candidates, backlog |
| Cluster view | Macro - nodes are clusters |
| Heat Vision | Recency halo |
| Path mode | Narrative Pathfinder |
| Constellations | Saved viewpoints |

### Cluster/zoom requirement (v2 milestone)

- Provide a macro view where nodes are clusters.
- Clicking a cluster expands it (progressive disclosure).
- Cluster auto-naming is allowed, but must be explainable and editable.

---

## 9. Reliability and observability (no silent failures)

### Status panel requirements

Atlas (and CLI) must show:
- Embeddings status (computed, stale, missing)
- Wormhole computation status
- Last index time
- Last patch time (in live mode)
- Any errors, with pointers to logs/artifacts

### Error artifacts

- `bad-chunks.jsonl` for extraction failures
- Embedding errors log with file names and causes
- "Why no wormholes" explanation (missing embeddings, threshold too high, etc.)

---

## 10. Data and provenance

Every computed edge must be explainable:
- `source`: which files/chunks
- `method`: mention, semantic similarity, rule-based
- `confidence`: score (where applicable)
- `timestamps`: createdAt, updatedAt
- `approval_state`: for suggestions

Truth edges are always separated from suggestions to preserve trust.

---

## 11. Migration strategy (v1 to v2)

### The rule

**v2 is the default. Classic mode is opt-in.**

Do NOT make v2 behavior opt-in. Make it the default, but provide a one-click "Classic mode" toggle that restores v1 hairball visibility. Otherwise you will keep shipping the same confusing first impression forever.

### Config flag

```yaml
# .zettelscript/config.yaml
visualization:
  mode: focus          # "focus" (v2 default) | "classic" (v1 hairball)
```

**Persisted per vault**, not global, because different vaults have different tolerance for noise.

### Edge visibility by mode

| Edge Type | Layer | Focus Mode (v2) | Classic Mode (v1) |
|-----------|-------|-----------------|-------------------|
| `explicit_link` | A | ON | ON |
| `hierarchy` | A | ON | ON |
| `sequence` | A | ON | ON |
| `causes` | A | ON | ON |
| `semantic` (wormhole) | B | ON (dotted) | ON |
| `mention` | C | OFF | ON |
| `mention_candidate` | C | OFF | ON |
| `backlink` | C | OFF (computed on demand) | ON |
| `unresolved_link` | C | Ghosts toggle | ON |

### First-run upgrade banner

On first Atlas open after upgrade, show:

> **New: Focus-first view.** Suggestions and mention edges are now hidden by default.
> Toggle **Classic mode** in settings to see all edges.

No surprises, but no paralysis either.

---

## 12. Implementation specifications

### 12.1 The `focus` command

```bash
zs focus [file-or-node]
```

**With argument:** Focus on the specified file or node title.

**Without argument:** Focus on the most recently edited file. Fallback order:
1. File with most recent `mtime` in vault
2. Last focused node (persisted in `.zettelscript/state.json`)
3. Arbitrary node (with warning)

This matches the "one command, immediate value" principle.

### 12.2 Orphan score weights

```javascript
const ORPHAN_WEIGHTS = {
  semanticPull: 0.45,      // Similar to many things but not linked
  lowTruthDegree: 0.25,    // Few Layer A edges
  mentionPressure: 0.20,   // Frequently referenced but unresolved
  importance: 0.10         // Recency, frequency, user pins
};
```

**Rationale:** A note that is semantically similar to many others but already well-linked is not an orphan—it's a hub. The orphan signal is "similar but not integrated."

Formula:
```
orphanScore =
  0.45 * semanticPull +
  0.25 * (1 / (1 + truthDegree)) +
  0.20 * mentionPressure +
  0.10 * importance
```

Where:
- `semanticPull` = average similarity to top-k semantic neighbors (0-1)
- `truthDegree` = count of Layer A edges
- `mentionPressure` = count of unresolved mentions pointing to this node / max across vault
- `importance` = recency score (days since edit, normalized) or pin boost

### 12.3 Cluster naming

**Auto-name by default**, but label as suggestion.

Display format:
```
Suggested: Elena + Cascade Event
```

Rules:
- One-click rename, persisted in `.zettelscript/clusters.json`
- User names override suggestions permanently
- Unnamed clusters are cognitively expensive; suggested names are wrong sometimes but still cheaper than blank

Naming algorithm (simple):
- Top 2-3 nodes by degree within cluster
- Concatenate titles, truncate to 40 chars

### 12.4 Embedding health thresholds

Measure **in the focus area**, not the whole vault. Users care about what they're looking at now.

| Status | Coverage | Behavior |
|--------|----------|----------|
| OK | ≥ 95% | Full semantic features |
| Warning | 60-95% | Show warning badge, wormholes may be incomplete |
| Failure | < 60% | Disable semantic edges, show banner with action |

Status panel shows:
```
Embeddings: 127/134 nodes (95%) ✓
Wormholes: 43 edges computed
Last index: 2 minutes ago
```

On failure:
```
⚠ Embeddings incomplete (34%)
Semantic features disabled. Run: zs embed compute
```

---

## 13. Roadmap (high-level)

### Phase 1: Stop the hairball

- [ ] Add `visualization.mode` config flag (focus/classic)
- [ ] Flip default edge visibility (mentions off by default)
- [ ] Add first-run upgrade banner
- [ ] Make embeddings fail loudly with actionable errors
- [ ] Add `zs focus` command (with and without argument)
- [ ] Add status panel to Atlas (embedding health, index time)

### Phase 2: Make it actionable

- [ ] Implement orphan score algorithm
- [ ] Add orphan backlog panel to Atlas
- [ ] Suggestions side panel (accept/ignore/defer)
- [ ] One-click accept writes to markdown + patches graph
- [ ] Live WebSocket updates on accept

### Phase 3: Add abstraction

- [ ] Implement clustering algorithm (Louvain or similar)
- [ ] Cluster condensation view (macro graph)
- [ ] Click-to-expand clusters (progressive disclosure)
- [ ] Auto-naming with user override
- [ ] Thread-level summaries (optional LLM feature)

### Phase 4: Editor integration

- [ ] Daemon mode (`zs daemon`) for persistent process
- [ ] Obsidian plugin skeleton
- [ ] Side panel API (5 related, 3 suggestions, 1 orphan)
- [ ] Real-time on-save updates

---

## Appendix A: Design invariants

These rules must never be violated:

1. **The default view must never render all suggestion edges.**
2. **Any computed feature that fails must be visible to the user.**
3. **Suggestions must be reversible and provenance-tracked.**
4. **The system must provide value from a single command path.**

---

## Appendix B: Edge type classification

For implementation, here is the canonical classification of all edge types:

### Layer A (Truth) - Always rendered

```javascript
const LAYER_A_EDGES = [
  'explicit_link',  // User-authored [[wikilinks]]
  'hierarchy',      // Parent/child, folder structure
  'sequence',       // Chapter/scene order (chronology_next)
  'causes',         // Causal relationships
  'setup_payoff',   // Narrative foreshadowing
  'participation',  // Character in scene
  'pov_visible_to', // POV constraints
];
```

### Layer B (Semantic) - Rendered with visual distinction

```javascript
const LAYER_B_EDGES = [
  'semantic',       // Accepted wormholes (similarity > threshold)
];

const LAYER_B_STYLE = {
  dash: [2, 2],     // Dotted line
  opacity: 0.7,     // Slightly subdued
  color: '#94a3b8', // Gray
};
```

### Layer C (Suggestions) - Hidden by default

```javascript
const LAYER_C_EDGES = [
  'mention',              // Approved mention (co-occurrence)
  'mention_candidate',    // Pending mention suggestion
  'semantic_suggestion',  // Wormhole below threshold
  'backlink',             // Computed incoming (can be noisy)
  'alias',                // Alternative name reference
];
```

### Rendering rules

```javascript
function shouldRenderEdge(edge, mode) {
  if (mode === 'classic') return true;

  if (LAYER_A_EDGES.includes(edge.type)) return true;
  if (LAYER_B_EDGES.includes(edge.type)) return true;
  if (LAYER_C_EDGES.includes(edge.type)) return false;

  // Unknown edge types: warn and hide
  console.warn(`Unknown edge type: ${edge.type}`);
  return false;
}
```

---

## Appendix C: Implementation references

The following sibling projects contain patterns and code that should be reused or adapted for v2.

### RAG Vault (`../rag-vault`)

A local-first RAG system with hybrid search. Key patterns to adopt:

| Component | File | What to Steal |
|-----------|------|---------------|
| **Hybrid search** | `src/vectordb/index.ts` | Vector search → Quality filter → Keyword boost architecture |
| **Grouping algorithm** | `src/vectordb/index.ts:686-728` | Statistical threshold (mean + k*std) for group boundaries |
| **Circuit breaker** | `src/vectordb/index.ts:376-440` | Fail-loudly pattern for FTS/embedding failures |
| **Chunk fingerprinting** | `src/vectordb/index.ts:119-133` | SHA-256 hash for stable chunk IDs |
| **LanceDB + Transformers.js** | `src/embedder/index.ts` | Local embeddings without API keys |

**Critical architecture insight:**
```
RAG Vault:  Vector search → Filter (distance, grouping) → Keyword boost
ZettelScript v1: Mention edges dominate → Hairball
ZettelScript v2: Adopt RAG Vault's pattern for semantic edges
```

### obsidian-zettelscript (`../obsidian-zettelscript`)

An Obsidian plugin skeleton. Key patterns for Phase 4:

| Component | File | What to Steal |
|-----------|------|---------------|
| **Auto-sync** | `main.ts:155-169` | Debounced file watcher (5 sec) |
| **Periodic sync** | `main.ts:172-186` | Configurable interval (0-60 min) |
| **Status bar** | `main.ts:36` | "ZS: Ready / Running / Error" pattern |
| **CLI wrapper** | `main.ts:188-231` | `execFile` to spawn `zettel` commands |
| **Settings UI** | `settings.ts` | Obsidian settings tab pattern |

### Migration notes

1. **Replace ZettelScript's embedding provider with RAG Vault's approach**
   - Use Transformers.js (local, no API key)
   - Default model: `Xenova/all-MiniLM-L6-v2` or `onnx-community/embeddinggemma-300m-ONNX`
   - Circuit breaker for failures

2. **Replace mention-edge visualization with grouping-based filtering**
   - Use RAG Vault's `applyGrouping()` algorithm
   - "similar" mode for focus view, "related" mode for expanded view

3. **Obsidian plugin becomes Phase 4 target**
   - Already has file watcher and CLI integration
   - Add side panel for suggestions
   - Wire up WebSocket for live patches

---

*End of document.*
