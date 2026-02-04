# Fix TypeScript Strict Mode Errors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 53 TypeScript compilation errors blocking `npm publish`, caused by strict mode flags `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.

**Architecture:** The errors fall into 3 categories that repeat across 6 files. We fix each file in isolation, run typecheck after each, and commit. No type definitions need changing — all fixes are at call sites.

**Tech Stack:** TypeScript 5.x with `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, Vitest for tests.

---

## Error Categories

Before diving in, understand the three error patterns:

### Pattern A: `exactOptionalPropertyTypes` (TS2375, TS2412, TS2379)
When a type has `foo?: string`, you **cannot** assign `string | undefined` to it.
With `exactOptionalPropertyTypes`, `foo?: string` means "either omit the key, or provide a `string`". Assigning `undefined` explicitly is not allowed.

**Fix:** Use conditional spread or only set the property when the value is defined:
```typescript
// BAD: assigns undefined explicitly
{ model: embeddingModel }  // where embeddingModel is string | undefined

// GOOD: omit key when undefined
{ ...(embeddingModel !== undefined && { model: embeddingModel }) }
// OR: only include when defined
...(embeddingModel !== undefined ? { model: embeddingModel } : {})
```

### Pattern B: `noUncheckedIndexedAccess` (TS2532, TS18048)
Array indexing returns `T | undefined`. Must check before using.

**Fix:** Add non-null assertions where already guarded, or add runtime checks:
```typescript
// BAD: embeddings[i] could be undefined
dotProduct += a[i] * b[i];

// GOOD: use non-null assertion when loop bounds guarantee existence
dotProduct += a[i]! * b[i]!;
```

### Pattern C: Nullable chain mismatches (TS2345, TS2322, TS2677)
Passing `string | undefined` to a parameter expecting `string`, or assigning nullable to non-nullable.

**Fix:** Add guards or use `!` when already guarded by control flow.

---

## Task 1: Fix `src/cli/commands/doctor.ts` (3 errors)

**Files:**
- Modify: `src/cli/commands/doctor.ts:201-220`

**Errors:**
1. Line 201-208: `EmbeddingHealth` — `model: embeddingModel` where `embeddingModel` is `string | undefined`, but `model?: string` doesn't accept explicit `undefined`
2. Line 210-214: `WormholeHealth` — `disabledReason: wormholeDisabledReason` same pattern
3. Line 216-219: `ExtractionHealth` — `badChunksPath` same pattern

**Step 1: Apply the fix**

In `computeDoctorStats`, change the return object (lines 201-225) to use conditional spread for optional properties:

```typescript
    embeddings: {
      level: embeddingLevel,
      total: nodeCount,
      embedded: embeddingCount,
      coverage: embeddingCoverage,
      pending: pendingEmbeddings.length,
      errorCount: getCircuitBreaker().getStatus('embeddings').totalFailures,
      ...(embeddingModel !== undefined && { model: embeddingModel }),
    },
    wormholes: {
      enabled: !wormholeDisabledReason,
      count: wormholeCount,
      threshold: wormholeThreshold,
      ...(wormholeDisabledReason !== undefined && { disabledReason: wormholeDisabledReason }),
    },
    extraction: {
      ...(parseFailCount > 0 ? { badChunksPath } : {}),
      parseFailCount,
    },
```

**Step 2: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/cli/commands/doctor.ts"`
Expected: No output (no errors)

**Step 3: Run tests**

Run: `npx vitest run tests/unit/doctor-version.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands/doctor.ts
git commit -m "fix: resolve exactOptionalPropertyTypes errors in doctor.ts"
```

---

## Task 2: Fix `src/cli/commands/approve.ts` (8 errors)

**Files:**
- Modify: `src/cli/commands/approve.ts:98,214,243,256,258,272,273,276`

**Errors:**
1. Line 98: `generateSuggestionId(options.from, ...)` — `options.from` is `string | undefined`, but param expects `string`. Already guarded by `if (options.from && options.to)` branch.
2. Line 214: `response.edgeId = candidate.approvedEdgeId` — `approvedEdgeId` is `string | undefined`, `edgeId` on `ApproveResponse` is `string | undefined` too, but with exactOptionalPropertyTypes we can't assign `undefined` to an optional property. Fix: only assign when defined.
3. Line 243: `strength: candidate.signals?.semantic` — `semantic` is `number | undefined`, but `Omit<Edge, ...>` has `strength?: number` (can't be `undefined`).
4. Lines 256, 258: `response.fromTitle = fromNode?.title` and `response.toTitle = toNode?.title` — same pattern as #2.
5. Lines 272, 273: `response.writebackReason = writebackResult.reason` and `response.writebackPath = writebackResult.path` — same pattern.
6. Line 276: `writebackReason: writebackResult.reason` — in `candidateEdgeRepository.update()` call, `writebackReason` is `string | undefined` but `UpdateCandidateEdgeInput.writebackReason` is `writebackReason?: string`.

**Step 1: Apply fixes**

For line 98 — the code is inside `else if (options.from && options.to)`, so `options.from` is narrowed. But commander types aren't narrowed. Use non-null assertion:
```typescript
suggestionId = generateSuggestionId(options.from!, options.to!, edgeType, isUndirected);
```
Wait — actually the existing code at line 178 already passes `options.from` and `options.to` directly. The guard is on line 174. The issue is that TypeScript doesn't narrow `options.from` through the `else if` because `options` is a generic record. The fix is to cast:

```typescript
suggestionId = generateSuggestionId(options.from as string, options.to as string, edgeType, isUndirected);
```

For line 214 — change to conditional assignment:
```typescript
if (candidate.approvedEdgeId !== undefined) {
  response.edgeId = candidate.approvedEdgeId;
}
```

For line 243 — use conditional spread for `strength`:
```typescript
const truthEdge = await ctx.edgeRepository.create({
  sourceId: candidate.fromId,
  targetId: candidate.toId,
  edgeType: candidate.suggestedEdgeType,
  provenance: 'user_approved',
  ...(candidate.signals?.semantic !== undefined && { strength: candidate.signals.semantic }),
});
```

For lines 256, 258 — guard assignments:
```typescript
if (fromNode) response.fromTitle = fromNode.title;
if (toNode) response.toTitle = toNode.title;
```

For lines 272, 273 — guard assignments:
```typescript
if (writebackResult.reason !== undefined) response.writebackReason = writebackResult.reason;
if (writebackResult.path !== undefined) response.writebackPath = writebackResult.path;
```

For line 276 — use conditional spread in the update call:
```typescript
await ctx.candidateEdgeRepository.update(suggestionId, {
  writebackStatus: writebackResult.status,
  ...(writebackResult.reason !== undefined && { writebackReason: writebackResult.reason }),
});
```

**Step 2: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/cli/commands/approve.ts"`
Expected: No output (no errors)

**Step 3: Run tests**

Run: `npx vitest run tests/unit/approve-reject.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands/approve.ts
git commit -m "fix: resolve strict type errors in approve.ts"
```

---

## Task 3: Fix `src/cli/commands/reject.ts` (2 errors)

**Files:**
- Modify: `src/cli/commands/reject.ts:113,115`

**Errors:**
1. Line 113: `response.fromTitle = fromNode?.title` — same pattern as approve.ts
2. Line 115: `response.toTitle = toNode?.title` — same pattern

**Step 1: Apply fixes**

```typescript
if (fromNode) response.fromTitle = fromNode.title;
if (toNode) response.toTitle = toNode.title;
```

**Step 2: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/cli/commands/reject.ts"`
Expected: No output (no errors)

**Step 3: Run tests**

Run: `npx vitest run tests/unit/approve-reject.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cli/commands/reject.ts
git commit -m "fix: resolve strict type errors in reject.ts"
```

---

## Task 4: Fix `src/cli/commands/focus.ts` (15 errors)

**Files:**
- Modify: `src/cli/commands/focus.ts`

**Errors (grouped by pattern):**

### Pattern B — `noUncheckedIndexedAccess` array indexing:
- Line 92: `byTitle[0]` is `Node | undefined`, assigned to `Node`
- Line 96: `byAlias[0]` same
- Line 117: `nodes[0]` same (the `mostRecent` variable)
- Line 251: `nodeColors[n.type]` — record indexing returns `string | undefined`
- Lines 321, 328, 345, 356, 362, 370: `focusNodes[0]`, `focusEmbeddings[0]`, other array indexing
- Lines 438, 439, 440, 444, 445: `a[i]`, `b[i]` in `cosineSimilarity` — number array indexing

### Pattern A — `exactOptionalPropertyTypes` in return objects:
- Line 251: `updatedAtMs` property with `undefined` value
- Line 421: `lexical: kwScore > 0 ? kwScore : undefined` in signals object

**Step 1: Fix `resolveTargetNode` (lines 88-133)**

Add non-null guard since we check `.length > 0` before accessing:
```typescript
    // Try as title
    const byTitle = await nodeRepository.findByTitle(target);
    if (byTitle.length > 0) return byTitle[0]!;

    // Try as alias
    const byAlias = await nodeRepository.findByTitleOrAlias(target);
    if (byAlias.length > 0) return byAlias[0]!;
```

For `nodes[0]` (mostRecent), we check `nodes.length === 0` before, so:
```typescript
  const mostRecent = nodes[0]!;
```

**Step 2: Fix `subgraphToGraphData` (line 251)**

For `nodeColors[n.type]` — use nullish coalescing (already has fallback):
```typescript
    color: nodeColors[n.type] ?? '#94a3b8',  // Already OK — the ?? handles it
```

Actually this errors because `nodeColors[n.type]` is `string | undefined` in strict mode. The `??` already handles runtime, but TypeScript sees the intermediate type. Since the `??` already guards it, we need to check the actual error. The error is that `nodeColors` is `Record<string, string>` and with `noUncheckedIndexedAccess`, indexing gives `string | undefined`. The `??` coalesces it fine. Let me re-check — actually the existing code already has the `||` operator on line 248. That should work. Let me look at the actual errors more carefully.

For `updatedAtMs` on line 251 — the ternary produces `number | undefined`:
```typescript
    updatedAtMs: n.updatedAt ? new Date(n.updatedAt).getTime() : undefined,
```
With `exactOptionalPropertyTypes`, we can't assign `undefined` to `updatedAtMs?: number`. Fix with conditional spread:
```typescript
    ...(n.updatedAt ? { updatedAtMs: new Date(n.updatedAt).getTime() } : {}),
```

**Step 3: Fix `computeRelatedNotes` (lines 317-425)**

Array indexing after length check:
```typescript
  const focusNode = focusNodes[0]!;   // after: if (focusNodes.length === 0) return []
  const focusEmbedding = focusEmbeddings[0]!.embedding;  // after length === 0 check
```

For `lexical` signal (line 421):
```typescript
    signals: {
      semantic: vecScore,
      ...(kwScore > 0 ? { lexical: kwScore } : {}),
    },
```

**Step 4: Fix `cosineSimilarity` (lines 431-446)**

Add non-null assertions for array indexing in loop:
```typescript
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
```

**Step 5: Fix remaining indexed access in `findGroupBoundaries` and `applyGrouping`**

Lines 574, 622: `results[i]`, `results[i + 1]`, `boundaries[maxGroups - 1]` — add `!` where bounds are already checked.

**Step 6: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/cli/commands/focus.ts"`
Expected: No output (no errors)

**Step 7: Run tests**

Run: `npx vitest run tests/unit/grouping.test.ts tests/unit/hybrid-search.test.ts`
Expected: PASS

**Step 8: Commit**

```bash
git add src/cli/commands/focus.ts
git commit -m "fix: resolve strict type errors in focus.ts"
```

---

## Task 5: Fix `src/discovery/focus-bundle.ts` (10 errors)

**Files:**
- Modify: `src/discovery/focus-bundle.ts`

**Errors (grouped):**

### Pattern A — `exactOptionalPropertyTypes`:
- Lines 457-465: `lastError` in `embeddings` health — `stats.embeddings.lastError` is `string | undefined`
- Lines 468-473: `disabledReason` in `wormholes` health — same pattern
- Lines 476-479: `lastRunAt` in `index` health — `stats.index.lastIndexTime?.toISOString()` produces `string | undefined`
- Lines 482-485: `badChunksPath` in `extraction` health — same pattern

### Pattern C — CandidateLink provenance:
- Lines 311-318: Building `provenance` object — inner properties `model`, `excerpt`, `createdAt` are `string | undefined` from `ce.provenance[0].model` etc, but `CandidateLink.provenance` has optional properties that don't accept explicit `undefined`.

### Pattern B — Array indexing:
- Lines 314, 315, 316: `ce.provenance[0].model` etc. — `ce.provenance[0]` is possibly undefined
- Line 310: `ce.signals || {}` — `CandidateEdgeSignals | undefined` assigned to `CandidateLink.signals` (signals has optional properties)

**Step 1: Fix `buildHealthSummary` (lines 453-486)**

Use conditional spreads for all optional fields in the returned health object:
```typescript
  return {
    level: stats.overallLevel,
    warnings: circuitWarnings,

    embeddings: {
      level: stats.embeddings.level,
      coverageInView,
      eligibleInView,
      embeddedInView,
      missingInView,
      pending: stats.embeddings.pending,
      errors: stats.embeddings.errorCount,
      ...(stats.embeddings.lastError !== undefined && { lastError: stats.embeddings.lastError }),
    },

    wormholes: {
      enabled: stats.wormholes.enabled,
      level: wormholeLevel,
      countInView: wormholesInView,
      threshold: stats.wormholes.threshold,
      ...(stats.wormholes.disabledReason !== undefined && { disabledReason: stats.wormholes.disabledReason }),
    },

    index: {
      ...(stats.index.lastIndexTime !== undefined && { lastRunAt: stats.index.lastIndexTime.toISOString() }),
      nodeCount: stats.index.nodeCount,
      edgeCountsByLayer,
    },

    extraction: {
      parseFailures: stats.extraction.parseFailCount,
      ...(stats.extraction.badChunksPath !== undefined && { badChunksPath: stats.extraction.badChunksPath }),
    },
  };
```

**Step 2: Fix candidateLinks builder (lines 276-327)**

Fix the `provenance` and `signals` building:
```typescript
        signals: ce.signals ?? {},
        ...(ce.provenance && ce.provenance.length > 0 && ce.provenance[0]
          ? {
              provenance: {
                ...(ce.provenance[0].model !== undefined && { model: ce.provenance[0].model }),
                ...(ce.provenance[0].excerpt !== undefined && { excerpt: ce.provenance[0].excerpt.slice(0, SUGGESTION_CAPS.excerptMaxLength) }),
                ...(ce.provenance[0].createdAt !== undefined && { createdAt: ce.provenance[0].createdAt }),
              },
            }
          : {}),
```

For `ce.signals || {}` — the issue is `CandidateEdgeSignals | undefined` being assigned to `CandidateLink.signals` which has the same shape. Use `ce.signals ?? {}`:
```typescript
        signals: ce.signals ?? {},
```

**Step 3: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/discovery/focus-bundle.ts"`
Expected: No output (no errors)

**Step 4: Run tests**

Run: `npx vitest run tests/unit/focus-bundle.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/discovery/focus-bundle.ts
git commit -m "fix: resolve strict type errors in focus-bundle.ts"
```

---

## Task 6: Fix `src/discovery/suggestion-engine.ts` (15 errors)

**Files:**
- Modify: `src/discovery/suggestion-engine.ts`

**Errors (grouped):**

### TS6138 — unused property:
- Line 76: `nodeRepository` declared but never read. The class accepts it in constructor but never uses it. Fix: prefix with underscore or remove if truly unused (check if subclass uses it). Actually, `SuggestionEngine` uses `this.candidateEdgeRepository`, `this.edgeRepository`, `this.mentionRepository`, `this.embeddingRepository` but NOT `this.nodeRepository`. Since `tsconfig` has `noUnusedLocals`, we need to either use it or remove it.

### Pattern B — Array indexing:
- Lines 200 (x2): `e1` and `e2` from `embeddings[i]` and `embeddings[j]` — possibly undefined
- Lines 204 (x2): Same `e1.nodeId`, `e2.nodeId`
- Lines 212, 213: `e1.nodeId`, `e2.nodeId` again
- Lines 381 (x2), 382 (x2), 383 (x2): `a[i]`, `b[i]` in `cosineSimilarity` function — same pattern as focus.ts
- Lines 580, 581: Array indexing in some other location

**Step 1: Fix unused `nodeRepository`**

The `SuggestionEngine` constructor takes `nodeRepository` but never reads it. Remove the `private` modifier and prefix with underscore:
```typescript
  constructor(
    _nodeRepository: NodeRepository,
    private edgeRepository: EdgeRepository,
    ...
```

Wait — check all callers first. The constructor is called in `focus.ts:731`:
```typescript
const suggestionEngine = new SuggestionEngine(
  ctx.nodeRepository,
  ctx.edgeRepository,
  ctx.mentionRepository,
  ctx.embeddingRepository,
  ctx.candidateEdgeRepository
);
```

The fix is to just remove `private` from the `nodeRepository` parameter and prefix with underscore. But actually `noUnusedParameters` is also true. Let's check — the param is used by being passed to the constructor. The TS error is TS6138 which is "Property is declared but its value is never read" — this is about the `private` making it a class property. We can just remove `private`:

```typescript
  constructor(
    _nodeRepository: NodeRepository,  // Kept for API compatibility
    private edgeRepository: EdgeRepository,
    ...
```

**Step 2: Fix `computeSemanticCandidates` array indexing (lines 194-217)**

Add guards or non-null assertions:
```typescript
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          const e1 = embeddings[i]!;
          const e2 = embeddings[j]!;
```

**Step 3: Fix `cosineSimilarity` (lines 380-388)**

Same fix as focus.ts:
```typescript
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
```

**Step 4: Fix remaining indexed access (lines 580-581)**

Check what's at lines 580-581. These are in the `OrphanEngine.computeSemanticNeighbors` or similar. Add `!` assertions where bounds are already checked.

**Step 5: Run typecheck for this file**

Run: `npx tsc --noEmit 2>&1 | grep "src/discovery/suggestion-engine.ts"`
Expected: No output (no errors)

**Step 6: Run tests**

Run: `npx vitest run tests/unit/suggestion-engine.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/discovery/suggestion-engine.ts
git commit -m "fix: resolve strict type errors in suggestion-engine.ts"
```

---

## Task 7: Final verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: Exit code 0, no errors

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Run lint**

Run: `npm run lint`
Expected: No new errors

**Step 4: Commit any stragglers**

If any files needed additional fixes during verification, commit them.

**Step 5: Final commit (if changes were squashed)**

```bash
git add -A
git commit -m "fix: resolve all 53 TypeScript strict mode errors blocking publish"
```
