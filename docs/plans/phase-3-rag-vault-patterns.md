# Phase 3: Signal Quality and Reliability (rag-vault patterns)

## Goal

Improve suggestion quality (fewer false positives, better ordering) and system resilience (no silent degradation) without breaking the Phase 2 contract (focus.json schema, CLI JSON invariants).

## Non-goals

- Redesign UI surfaces (Atlas/Obsidian). They should simply see better suggestions.
- Change schemaVersion unless strictly necessary.

## Deliverables

| ID | Deliverable | Description |
|----|-------------|-------------|
| A | Grouping algorithm | Replace hard thresholds with statistical bands (mean + k*std) |
| B | Circuit breaker | Graceful degradation for embeddings/vector search/FTS |
| C | Hybrid search | Combine vector similarity with keyword boost for Related Notes |
| D | Chunk fingerprinting | (Optional) Stable IDs for chunks if needed after A-C |

---

## A) Grouping Algorithm (mean + k*std style "natural breaks")

### Problem

Hard thresholds (0.4-0.74) are brittle across vaults, domains, and embedding models.

### Plan

- Keep minSimilarity as a floor, but derive suggestion bands from the actual score distribution per query.
- For each focus query, compute topK similarities, then compute:
  - `mu = mean(scores)`
  - `sigma = std(scores)`
  - Define "groups" using boundaries like `mu + k*sigma`, or the rag-vault grouping logic.
- Use groups to decide:
  - Which items become "relatedNotes" vs "candidateLinks (semantic source)" vs "ignore"
  - How to label reasons (example: "Top cluster: very similar", "Second cluster: related")

### Config

```yaml
suggestions:
  relatedNotes:
    minSimilarity: 0.35
    topK: 50
    grouping:
      enabled: true
      kStrong: 1.0   # boundary for "similar" group
      kWeak: 0.0     # boundary for "related" group
    maxRelated: 10
```

### Behavior

- `relatedNotes` = strongest group (or top group above strong boundary)
- `semantic candidateLinks` = next group(s) above weak boundary but below wormhole threshold
- Still cap and sort deterministically

### Tests

- Deterministic fixtures for score arrays (known mean/std) -> expected group boundaries
- Ensure stable ordering remains (score desc, title/id tie-breakers)

### Reference

- `rag-vault/src/vectordb/index.ts:686-728` - `applyGrouping()` implementation
- `GROUPING_BOUNDARY_STD_MULTIPLIER = 1.5` - configurable via env var

---

## B) Circuit Breaker (fail loudly, degrade gracefully)

### Problem

Repeated failures can create a confusing UX and can also burn time retrying.

### Plan

Add a small circuit breaker module with:

- **Counters** per subsystem: `embeddings`, `vectorDb`, `fts`
- **Thresholds**: `maxFailures`, `cooldownMs`
- **State**: `CLOSED`, `OPEN`, `HALF_OPEN`
- **Behavior**:
  - If `OPEN`: skip expensive calls, return a structured warning in health and suggestions empty state
  - After cooldown: `HALF_OPEN` allows a probe call; success closes it, failure opens again

### Where it shows up

- `doctor`: reports circuit state and lastError
- `focus`: `health.warnings` includes "vector search disabled (cooldown 10m)"
- Atlas/Obsidian empty states: "Disabled due to repeated failures. Run `zs doctor`."

### Config

```yaml
health:
  circuitBreaker:
    maxFailures: 3
    cooldownSeconds: 600
```

### Tests

- State transitions: closed -> open -> half_open -> closed
- No ANSI in JSON mode even when warning printed (goes to stderr)

### Reference

- `rag-vault/src/vectordb/index.ts:52-62` - FTS circuit breaker constants
- `FTS_MAX_FAILURES = 3`, `FTS_COOLDOWN_MS = 300000` (5 min)

---

## C) Hybrid Search (vector + keyword boost)

### Problem

Pure vector similarity is good, but users expect exact terms to matter (names, jargon, repeated phrases).

### Plan

For Related Notes:

1. **Step 1**: Get vector topK (same as now)
2. **Step 2**: Compute keyword score for each candidate:
   - Tokenize focus note (or title + key terms)
   - Simple TF-IDF or BM25 if you already have FTS; otherwise a lightweight term overlap score
3. **Step 3**: Combine:
   ```
   finalScore = (wVec * vecScore) + (wKw * kwScore)
   ```
4. **Step 4**: Apply grouping algorithm on finalScore (or group on vecScore and reorder within group by hybrid)

### Config

```yaml
suggestions:
  relatedNotes:
    hybrid:
      enabled: true
      wVec: 0.85
      wKw: 0.15
```

### Output

- `score` in DTO remains 0..1 (normalize finalScore)
- `reasons` include both signals:
  - "Semantic similarity 0.82"
  - "Keyword boost: 3 matches (kevin, basement, lock)"

### Tests

- Fixtures where vector ties are broken by keyword boost
- Fixtures where keyword-only does not override low vector similarity (guardrail)

### Reference

- `rag-vault/src/vectordb/index.ts:769-800` - hybrid search pipeline
- `HYBRID_SEARCH_CANDIDATE_MULTIPLIER = 2` - fetch 2x candidates for reranking

---

## D) Chunk Fingerprinting (only if still needed)

You already have `contentHash` on nodes. Only do more here if you have a specific instability bug (for example, wormholes or provenance referencing chunks that shift after edits).

If you do:

- Create stable chunk IDs as `sha256(filePath + chunkIndex + chunkTextHash)`
- Use `chunkId` in provenance, candidate evidence, and any future contradiction tracking

### Reference

- `rag-vault/src/vectordb/index.ts:119-133` - `generateChunkFingerprint()`

---

## Phase 3 Sequencing

| Order | Deliverable | Rationale |
|-------|-------------|-----------|
| 1 | Circuit breaker | Makes failures obvious and safe |
| 2 | Hybrid search | Quick win, improves Related Notes immediately |
| 3 | Grouping algorithm | Bigger ranking behavior change; easier to evaluate after hybrid |
| 4 | Chunk fingerprinting | Only if concrete bug it fixes |

---

## Acceptance Criteria

1. Same Phase 2 schemaVersion and CLI JSON invariants unchanged
2. `relatedNotes` quality improves on real vault: fewer irrelevant suggestions, better top 5
3. Repeated embedding/vector failures produce clear warnings and do not spam retries
4. `doctor` surfaces circuit state and actionable fix commands

---

## Implementation Notes

If you want a clean workflow: commit Phase 2 now, then open a new branch `feat/phase-3-signal-quality` with these three deliverables as separate commits (breaker, hybrid, grouping). That keeps review and debugging sane.

### Files likely to change

- `src/discovery/suggestion-engine.ts` - grouping + hybrid scoring
- `src/core/circuit-breaker.ts` (new) - state machine for failures
- `src/cli/commands/doctor.ts` - report circuit state
- `src/discovery/focus-bundle.ts` - include circuit warnings in health
- `src/storage/database/repositories/embedding-repository.ts` - wrap calls with breaker

### Tests to add

- `tests/unit/circuit-breaker.test.ts`
- `tests/unit/grouping.test.ts`
- `tests/unit/hybrid-search.test.ts`
