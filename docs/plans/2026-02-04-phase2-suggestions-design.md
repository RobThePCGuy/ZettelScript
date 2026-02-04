# Phase 2 Design: Make Connections Actionable

**Date:** 2026-02-04
**Status:** Approved
**Depends on:** Phase 1 (Stop the hairball) - Complete

---

## Overview

Phase 2 transforms ZettelScript from "showing connections" to "making connections actionable." The core deliverable is a **shared data contract** (focus.json) consumed by both Atlas and Obsidian, with suggestions that users can approve or reject.

### Guiding Principle

> All suggestion surfaces consume the same focus.json schema; UI differences are rendering and execution only.

### Definition of Done (One-Minute Test)

1. Open a note
2. Within seconds, see 5 related notes, 3 suggested links, and 3 orphans
3. Click approve on one suggestion
4. The markdown file changes (a real link is written)
5. The graph updates immediately (no rerun, no refresh)
6. `zs doctor` explains any missing pieces if something is degraded

---

## 1. The Contract: focus.json Schema

This is the single source of truth that both Atlas and Obsidian consume.

```typescript
interface FocusBundle {
  meta: {
    schemaVersion: number;        // Numeric, bumps on breaking changes
    appVersion: string;           // Semver, e.g., "2.0.0"
    generatedAt: string;          // ISO timestamp
    mode: 'focus' | 'classic';
    scope: {
      kind: 'node' | 'file' | 'folder' | 'vault';
      focusNodeId: string;
      focusNodePath: string;
      focusNodeTitle: string;
    };
  };

  health: HealthSummary;

  graph: {
    nodes: NodeDTO[];
    edges: EdgeDTO[];
  };

  suggestions: {
    relatedNotes: RelatedNote[];
    candidateLinks: CandidateLink[];
    orphans: OrphanEntry[];
  };

  actions: ActionTemplates;
}
```

### 1.1 Health Summary (Stable Subset)

```typescript
interface HealthSummary {
  level: 'ok' | 'warn' | 'fail';

  embeddings: {
    level: 'ok' | 'warn' | 'fail';
    coverageInView: number;       // 0-100
    eligibleInView: number;       // Excludes ghosts, non-embeddable
    embeddedInView: number;
    missingInView: number;
    pending: number;
    errors: number;
    lastError?: string;
  };

  wormholes: {
    enabled: boolean;
    level: 'ok' | 'warn' | 'fail';
    countInView: number;
    threshold: number;
    disabledReason?: string;
  };

  index: {
    lastRunAt?: string;
    nodeCount: number;
    edgeCountsByLayer: { A: number; B: number; C: number };
  };

  extraction: {
    parseFailures: number;
    badChunksPath?: string;
  };
}
```

### 1.2 Lightweight DTOs

```typescript
interface NodeDTO {
  id: string;
  title: string;
  path: string;
  type: string;
  updatedAtMs?: number;
  isGhost: boolean;
  degreeA: number;
  degreeB: number;
  degreeC: number;
}

interface EdgeDTO {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  status: 'truth' | 'suggested' | 'approved' | 'rejected';
  layer: 'A' | 'B' | 'C';
  confidence?: number;
  provenance?: string;
}
```

### 1.3 Action Templates

```typescript
interface ActionTemplates {
  approve: {
    template: 'zs approve --suggestion-id {suggestionId} --json';
    supportsBatch: true;
  };
  reject: {
    template: 'zs reject --suggestion-id {suggestionId} --json';
  };
  focus: {
    template: 'zs focus "{path}" --json-stdout';
  };
  createNote: {
    template: 'zs create --title "{title}" --link-from {fromId} --json';
  };
}
```

---

## 2. Suggestion Types

### 2.1 Related Notes

```typescript
interface RelatedNote {
  nodeId: string;
  title: string;
  path: string;
  score: number;                  // 0-1, primary similarity
  reasons: string[];              // Human-readable explanations
  layer: 'B';
  isInView: boolean;              // Already visible in graph
  signals?: {
    semantic?: number;
    lexical?: number;
    graph?: number;
    recency?: number;
  };
}
```

### 2.2 Candidate Links

```typescript
interface CandidateLink {
  suggestionId: string;           // Canonical hash (128-bit, 32 hex chars)
  fromId: string;
  fromTitle: string;
  toId: string;
  toTitle: string;
  toIsGhost: boolean;
  suggestedEdgeType: EdgeType;
  confidence: number;             // 0-1
  reasons: string[];              // Top 3, human-readable
  source: 'mention' | 'semantic' | 'heuristic';
  status: 'suggested' | 'approved' | 'rejected';
  signals: {
    semantic?: number;
    mentionCount?: number;
    graphProximity?: number;
  };
  provenance?: {
    model?: string;
    excerpt?: string;             // Max 200 chars
    createdAt?: string;
  };
}
```

### 2.3 Orphan Entries

```typescript
interface OrphanEntry {
  nodeId: string;
  title: string;
  path: string;
  orphanScore: number;            // Raw score
  severity: 'low' | 'med' | 'high';
  percentile: number;             // 0-100
  reasons: string[];
  relatedNodeIds: string[];       // Top 3 evidence nodes
  suggestedActions: SuggestedAction[];
}

interface SuggestedAction {
  actionType: 'link_to' | 'link_from' | 'create_note' | 'pin' | 'ignore';
  targetNodeId?: string;
  label: string;
  template: string;
}
```

### 2.4 suggestionId Generation

```typescript
function generateSuggestionId(
  fromId: string,
  toId: string,
  edgeType: EdgeType,
  isUndirected: boolean
): string {
  // Canonical ordering for undirected only
  const [a, b] = isUndirected && fromId > toId
    ? [toId, fromId]
    : [fromId, toId];

  const input = `v1|${a}|${b}|${edgeType}`;
  return sha256(input).slice(0, 32); // 128-bit
}
```

---

## 3. Suggestion Computation

### 3.1 Thresholds (config.yaml)

```yaml
suggestions:
  relatedNotes:
    topK: 15                      # Take top K before filtering
    minSimilarity: 0.5            # Then apply threshold
    maxResults: 10

  candidateLinks:
    mentionMinOccurrences: 2      # Avoid single-mention noise
    semanticMinSimilarity: 0.4    # Below wormhole threshold
    semanticMaxSimilarity: 0.74   # At 0.75+, it's a wormhole
    maxResults: 20

  orphans:
    minOrphanScore: 0.3
    maxResults: 10
```

### 3.2 Hard Caps

```typescript
const SUGGESTION_CAPS = {
  relatedNotesPerFocus: 10,
  candidateLinksPerFocus: 20,
  orphansPerFocus: 10,
  reasonsPerSuggestion: 3,
  excerptMaxLength: 200,
};

// Enforced: effectiveMax = min(config.maxResults, HARD_CAP)
```

### 3.3 Orphan Score Formula

```typescript
const ORPHAN_WEIGHTS = {
  semanticPull: 0.45,
  lowTruthDegree: 0.25,
  mentionPressure: 0.20,
  importance: 0.10,
};

// semanticPull = sum(similarity to top M neighbors NOT connected by Layer A)
// lowTruthDegree = 1 / (1 + truthDegree)
// mentionPressure = unresolved mentions / max across vault
// importance = recency score or pin boost
```

### 3.4 Candidate Edge Lifecycle

```
                    ┌─────────────┐
     computation    │  suggested  │
    ──────────────> │  (in DB)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            │            ▼
       ┌──────────┐        │     ┌──────────┐
       │ approved │        │     │ rejected │
       │ (Layer A)│        │     │ (hidden) │
       └──────────┘        │     └──────────┘
```

**Transitions:**
- `suggested → approved`: `zs approve`, edge becomes Layer A truth
- `suggested → rejected`: `zs reject`, hidden from future suggestions
- Idempotent: re-approve/reject returns success with `idempotent: true`

---

## 4. Storage Schema

### 4.1 Candidate Edges Table

```sql
CREATE TABLE candidate_edges (
  suggestion_id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  suggested_edge_type TEXT NOT NULL,

  -- For undirected uniqueness
  from_id_norm TEXT NOT NULL,
  to_id_norm TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'suggested',
  status_changed_at TEXT,

  -- Evidence (merged from multiple sources)
  signals TEXT,                   -- JSON
  reasons TEXT,                   -- JSON: string[]
  provenance TEXT,                -- JSON: array of evidence

  -- Timestamps
  created_at TEXT NOT NULL,
  last_computed_at TEXT NOT NULL,
  last_seen_at TEXT,

  -- Writeback tracking
  writeback_status TEXT,
  writeback_reason TEXT,
  approved_edge_id TEXT,

  UNIQUE (from_id_norm, to_id_norm, suggested_edge_type)
);
```

### 4.2 Ghost Storage

Ghosts are stored in `nodes` table with `is_ghost = true`. This allows FK constraints to hold for candidate_edges.

---

## 5. Writeback Algorithm

### 5.1 `zs approve` Flow

```
1. Load candidate edge from DB
   - Fail if not found or status != 'suggested'
   - If already approved: return success + idempotent:true

2. Transaction 1:
   - Insert truth edge in edges table
   - Set candidate status = 'approved'
   - Set approved_edge_id

3. Attempt markdown writeback (outside transaction):
   a. Load source file (from_id's path)
   b. Find insertion point:
      - After existing Links section, OR
      - End of file (before trailing blanks)
   c. Insert link: [[folder/filename|Title]]
   d. Write atomically (tmp + rename)

4. Transaction 2:
   - Record writeback_status and details

5. Return result
```

### 5.2 Link Format

```typescript
// Safe format: includes path when needed for disambiguation
const linkText = targetPath.includes('/')
  ? `[[${targetPath}|${targetTitle}]]`
  : `[[${targetTitle}]]`;
```

### 5.3 Insertion Strategy (Phase 2)

- Do NOT modify YAML frontmatter
- Use Links section in body only
- If ambiguous: use end of file, log reason
- If file read-only: skip writeback, succeed in DB

---

## 6. focus.json Generation Pipeline

```
zs focus [target]
    │
    ├─ 1. Resolve focus node
    │
    ├─ 2. Build bounded subgraph
    │     → nodeIds[], edgeIds[] in view
    │
    ├─ 3. Compute candidates for scope
    │     → computeCandidateEdgesForScope()
    │     → upsert into candidate_edges
    │
    ├─ 4. Compute "in view" health metrics
    │     → eligibleInView excludes ghosts
    │
    ├─ 5. Query suggestions (scoped to nodeIds)
    │     → filter: status='suggested', not rejected
    │     → filter: not already connected by Layer A
    │
    ├─ 6. Apply caps and deterministic ordering
    │     → score desc, then title
    │
    ├─ 7. Assemble FocusBundle
    │
    └─ 8. Write atomically (tmp + rename)
          → focus.json (always)
          → focus.html (unless --json-only/--json-stdout)
```

---

## 7. Atlas Suggestions Panel

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Graph Canvas]                              │ Suggestions  │
│                                              │──────────────│
│                                              │ Related (7)  │
│                                              │  [Collapse]  │
│       ┌───┐                                  │  ○ Note A    │
│       │ X │ ← focus node                     │  ○ Note B    │
│       └───┘                                  │──────────────│
│                                              │ Links (3)    │
│                                              │  [Copy All]  │
│                                              │  □ X → Y     │
│                                              │    [Approve] │
│                                              │──────────────│
│                                              │ Orphans (2)  │
│                                              │  ⚠ Note Q    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Key Interactions

| Element | Click | Hover |
|---------|-------|-------|
| Related note row | Focus on node | Show reasons tooltip |
| Candidate link row | Highlight both nodes + dashed edge | Show provenance |
| Approve button | Copy command + toast | "Copy approve command" |
| "Copy All" button | Copy batch commands | "Copy N approve commands" |

### 7.3 Approval Flow (Phase 2)

```typescript
function handleApprove(suggestionId: string) {
  const command = actions.approve.template
    .replace('{suggestionId}', suggestionId);

  navigator.clipboard.writeText(command);
  showToast({ message: 'Command copied', detail: command });

  // Visual feedback: "Copied ✓" for 2 seconds
  setRowState(suggestionId, 'copied');
  setTimeout(() => setRowState(suggestionId, 'normal'), 2000);
}
```

### 7.4 Empty States

Empty states explain *why* empty:
- Related notes empty + embeddings fail → "Embeddings incomplete. Run: zs embed compute"
- Candidate links empty → "No link suggestions for this view."
- Orphans empty → "No orphans detected. Your notes are well-connected!"

---

## 8. Obsidian Plugin

### 8.1 Data Flow

```
Active file changes
       │
       ▼
┌─────────────────────────┐
│ Debounce (500ms)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ zs focus <file>         │
│    --json-stdout        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Parse stdout JSON       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Render panel            │
└─────────────────────────┘
```

### 8.2 Direct Execution

Unlike Atlas, Obsidian can execute CLI commands:

```typescript
async handleApprove(suggestionId: string) {
  const result = await execZs(['approve', '--suggestion-id', suggestionId, '--json']);

  if (result.success) {
    new Notice(`Linked to ${result.toTitle}`);
    if (result.writeback === 'failed') {
      new Notice(`Writeback failed: ${result.writebackReason}`);
    }
    this.refreshFocusBundle();
  }
}
```

### 8.3 Platform Degradation

- Desktop: full execution via child_process
- Mobile: falls back to copy-to-clipboard (Atlas behavior)

### 8.4 Stale Refresh Handling

```typescript
private requestId = 0;

async refreshFocusBundle() {
  const localId = ++this.requestId;
  const result = await this.runZettelScript(['focus', filePath, '--json-stdout']);

  // Only apply if still latest request
  if (localId === this.requestId) {
    this.focusBundle = JSON.parse(result);
    this.renderPanel();
  }
}
```

---

## 9. CLI Surface Area

### 9.1 `zs focus`

```bash
zs focus [target] [options]
```

| Flag | Description |
|------|-------------|
| `--budget <n>` | Max nodes in subgraph (default: 200) |
| `--depth <n>` | Max BFS depth (default: 3) |
| `--json-only` | Write focus.json only, stdout is path |
| `--json-stdout` | Print JSON to stdout, no file writes |
| `--no-open` | Skip browser open |

### 9.2 `zs approve`

```bash
zs approve --suggestion-id <id> [--json]
zs approve --from <id> --to <id> --type <type> [--json]
```

### 9.3 `zs reject`

```bash
zs reject --suggestion-id <id> [--json]
```

### 9.4 `zs suggest`

```bash
zs suggest [target] [--scope node|file|folder|vault] [--json]
```

---

## 10. JSON Output Invariants

### 10.1 Mode Definitions

| Mode | Flags | Stdout | File Writes |
|------|-------|--------|-------------|
| JSON | `--json`, `--json-stdout` | Valid JSON only | Per flag |
| File | `--json-only` | Path (not JSON) | focus.json |
| Human | (none) | Text, may have ANSI | All files |

### 10.2 Response Shape

```typescript
interface BaseResponse {
  success: boolean;
  warnings?: string[];
  error?: string;
  errorCode?: ErrorCode;
  idempotent?: boolean;
}

type ErrorCode =
  | 'NOT_VAULT'
  | 'DB_ERROR'
  | 'INVALID_ARGS'
  | 'NOT_FOUND'
  | 'COMPUTE_ERROR'
  | 'SERIALIZE_ERROR';
```

### 10.3 Invariant Summary

```
┌─────────────────────────────────────────────────────────────┐
│  JSON OUTPUT INVARIANTS - MUST NOT VIOLATE                  │
├─────────────────────────────────────────────────────────────┤
│   1. JSON modes: stdout is ONLY parseable JSON              │
│   2. File mode: stdout is path, not JSON                    │
│   3. JSON stdout may end with single trailing newline       │
│   4. JSON mode: stderr has no ANSI unless --color           │
│   5. JSON always returned in JSON modes, even on failure    │
│   6. Every response has: success, warnings?, error?         │
│   7. success = primary op succeeded (DB for approve)        │
│   8. Idempotent ops return success:true + idempotent:true   │
│   9. Writeback failure is warning, not failure              │
│  10. Mutually exclusive flags return INVALID_ARGS           │
│  11. schemaVersion bumps on breaking changes only           │
│  12. Placeholder set is fixed per schemaVersion             │
│  13. Quoted placeholders for values with spaces             │
│  14. Atomic file writes (tmp + rename)                      │
│  15. Serialization failure returns SERIALIZE_ERROR          │
│  16. UTF-8, single-line JSON, no key order guarantee        │
│  17. Array ordering is deterministic (score desc, title)    │
│  18. --json-stdout: no file writes, DB effects still occur  │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 Placeholder Contract

| Placeholder | Quoting | Source |
|-------------|---------|--------|
| `{suggestionId}` | None | CandidateLink.suggestionId |
| `{nodeId}` | None | Node.nodeId |
| `{fromId}` | None | CandidateLink.fromId |
| `{toId}` | None | CandidateLink.toId |
| `{title}` | **Quoted** | Node title (may have spaces) |
| `{path}` | **Quoted** | File path (may have spaces) |

---

## 11. Implementation Order

### Phase 2.0: Foundation
1. Candidate edge table + repository
2. suggestionId generation with canonical hashing
3. Ghost storage (is_ghost in nodes table)

### Phase 2.1: Computation
4. computeCandidateEdgesForScope() for mentions
5. computeCandidateEdgesForScope() for semantic near-miss
6. Orphan score computation
7. Merge evidence into single CandidateLink records

### Phase 2.2: Output
8. focus.json generation (FocusBundle assembly)
9. --json-stdout and --json-only flags
10. Atomic file writes

### Phase 2.3: Atlas UI
11. Suggestions panel layout
12. Row click → highlight nodes
13. Approve button → copy command
14. Batch copy button
15. Empty states with health context

### Phase 2.4: Writeback
16. `zs approve` command
17. `zs reject` command
18. Markdown insertion (Links section)
19. Idempotent approval handling

### Phase 2.5: Obsidian Plugin
20. Plugin skeleton with docked view
21. Auto-refresh on file change
22. Direct execution of approve/reject
23. Stale refresh handling
24. Mobile degradation

---

## 12. Update to DESIGN.md

Add this sentence to Section 4:

> All suggestion surfaces consume the same focus.json schema; UI differences are rendering and execution only.

Update Phase 2 roadmap checkboxes when complete.

---

*End of Phase 2 Design Document*
