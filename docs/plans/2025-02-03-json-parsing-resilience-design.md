# JSON Parsing Resilience Design

## Overview

Enhance the entity extractor to handle malformed LLM JSON responses through a multi-stage fallback pipeline. When the LLM returns invalid JSON, the system attempts increasingly aggressive recovery strategies before giving up on a chunk.

## Architecture

```
LLM Response
    ↓
┌─────────────┐
│ 1. Strict   │ ← Current cleanup + JSON.parse
└─────┬───────┘
      ↓ fail
┌─────────────┐
│ 2. Repair   │ ← jsonrepair library + JSON.parse
└─────┬───────┘
      ↓ fail
┌─────────────┐
│ 3. Salvage  │ ← Find JSON islands, parse each
└─────┬───────┘
      ↓ fail
┌─────────────┐
│ 4. Record   │ ← Write to bad-chunks.jsonl, continue
└─────────────┘
```

**Key Principles:**
- **Non-blocking**: A failed chunk never stops the extraction
- **Provenance tracking**: Every entity records how it was parsed
- **Schema validation**: Final gate regardless of parse mode
- **Visibility**: Summary at end shows what happened

## Files

| File | Purpose |
|------|---------|
| `src/extraction/json-parser.ts` | New file - isolated parsing logic |
| `src/extraction/entity-extractor.ts` | Modified - integrate parser, add provenance |
| `package.json` | Add `jsonrepair` dependency |

---

## Parser API (`src/extraction/json-parser.ts`)

### Types

```typescript
type ParseMode = 'strict' | 'repaired' | 'salvaged';

interface ParseSuccess {
  ok: true;
  mode: ParseMode;
  values: unknown[];  // Always array (1 for strict/repair, N for salvage)
  warnings?: string[];  // e.g., "salvage: used 2/5 islands"
}

interface ParseFailure {
  ok: false;
  mode: ParseMode;  // Last stage attempted
  error: string;
  errors?: Partial<Record<ParseMode, string>>;  // Per-stage errors
  rawSnippet: string;      // First 500 chars of cleaned input
  repairedSnippet?: string; // First 500 chars of repair attempt
  attemptedRepair: boolean;
  islandsFound: number;
}

type ParseResult = ParseSuccess | ParseFailure;
```

### Entry Point

```typescript
export function parseJSONWithFallbacks(raw: string): ParseResult;
```

### Pipeline Implementation

```typescript
function parseJSONWithFallbacks(raw: string): ParseResult {
  // Shared cleanup (runs once, before all stages)
  const cleaned = cleanupRaw(raw);
  const errors: Partial<Record<ParseMode, string>> = {};

  // Stage 1: Strict
  const strict = tryStrictParse(cleaned);
  if (strict.ok) return { ok: true, mode: 'strict', values: [strict.value] };
  errors.strict = strict.error;

  // Stage 2: Repair
  const repaired = tryRepairParse(cleaned);
  if (repaired.ok) return { ok: true, mode: 'repaired', values: [repaired.value] };
  if (repaired.error) errors.repaired = repaired.error;

  // Stage 3: Salvage
  const salvaged = trySalvageParse(cleaned);
  if (salvaged.ok) return {
    ok: true,
    mode: 'salvaged',
    values: salvaged.values,
    warnings: salvaged.warnings,
  };

  // All failed
  return {
    ok: false,
    mode: 'salvaged',
    error: salvaged.error ?? 'No valid JSON found',
    errors,
    rawSnippet: cleaned.slice(0, 500),
    repairedSnippet: repaired.repairedText?.slice(0, 500),
    attemptedRepair: true,
    islandsFound: salvaged.islandsFound ?? 0,
  };
}
```

### Cleanup Function

```typescript
function cleanupRaw(raw: string): string {
  let text = raw.trim();

  // Strip markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Find outermost JSON boundaries
  const start = Math.min(
    text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
    text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
  );

  if (start !== Infinity) {
    const openChar = text[start];
    const closeChar = openChar === '{' ? '}' : ']';
    const end = text.lastIndexOf(closeChar);
    if (end > start) {
      text = text.slice(start, end + 1);
    }
  }

  return text;
}
```

### Island Extraction (String-Aware)

```typescript
function findJSONIslands(text: string): string[] {
  const islands: string[] = [];
  const stack: string[] = [];
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle string state
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    // Handle braces
    if (char === '{' || char === '[') {
      if (stack.length === 0) start = i;
      stack.push(char === '{' ? '}' : ']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
        if (stack.length === 0 && start !== -1) {
          const island = text.slice(start, i + 1);
          if (island.length >= 20) {
            islands.push(island);
          }
          start = -1;
        }
      }
    }
  }
  return islands;
}
```

### Salvage Implementation

```typescript
function trySalvageParse(text: string): SalvageResult {
  const islands = findJSONIslands(text);
  const values: unknown[] = [];
  let failed = 0;

  for (const island of islands) {
    // Try strict first
    const strict = tryStrictParse(island);
    if (strict.ok) {
      // Skip empty objects/arrays and primitives
      if (isNonEmptyObjectOrArray(strict.value)) {
        values.push(strict.value);
      }
      continue;
    }

    // Try repair
    const repaired = tryRepairParse(island);
    if (repaired.ok && isNonEmptyObjectOrArray(repaired.value)) {
      values.push(repaired.value);
      continue;
    }

    failed++;
  }

  if (values.length > 0) {
    return {
      ok: true,
      values,
      warnings: islands.length > 1
        ? [`salvage: used ${values.length}/${islands.length} islands`]
        : undefined,
    };
  }

  return {
    ok: false,
    error: islands.length === 0
      ? 'No JSON islands found'
      : `All ${islands.length} islands failed to parse`,
    islandsFound: islands.length,
  };
}

function isNonEmptyObjectOrArray(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return false;
}
```

---

## Extractor Changes (`src/extraction/entity-extractor.ts`)

### Updated Entity Interface

```typescript
export interface ExtractedEntity {
  name: string;
  type: NodeType;
  aliases: string[];
  description: string;
  mentions: number;
  // New provenance fields
  parseMode: 'strict' | 'repaired' | 'salvaged';
  chunkIndex: number;
  islandIndex?: number;  // Only set for salvaged mode
}
```

### Schema Validation

```typescript
interface RawExtractionResponse {
  characters?: unknown[];
  locations?: unknown[];
  objects?: unknown[];
  events?: unknown[];
}

function isValidExtractionResponse(candidate: unknown): candidate is RawExtractionResponse {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const obj = candidate as Record<string, unknown>;

  const allowedKeys = ['characters', 'locations', 'objects', 'events'];
  for (const key of allowedKeys) {
    if (key in obj && !Array.isArray(obj[key])) return false;
  }

  // Must have at least one non-empty array
  return allowedKeys.some(key => Array.isArray(obj[key]) && obj[key].length > 0);
}

function isValidEntity(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  return typeof candidate.name === 'string' && candidate.name.trim().length > 0;
}
```

### Normalization

```typescript
function normalizeAliases(raw: unknown): string[] {
  let aliases: string[];

  if (typeof raw === 'string') {
    aliases = [raw.trim()];
  } else if (Array.isArray(raw)) {
    aliases = raw.filter(s => typeof s === 'string').map(s => s.trim());
  } else {
    aliases = [];
  }

  // Filter empties and dedupe (case-insensitive)
  const seen = new Set<string>();
  return aliases.filter(a => {
    if (!a) return false;
    const lower = a.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function normalizeDescription(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}
```

### Extraction Flow

```typescript
interface ChunkStats {
  strict: number;
  repaired: number;
  salvaged: number;
  parsedEmpty: number;  // Parse ok but zero valid entities
  failed: number;
}

async extractFromText(text: string, onProgress?: ProgressCallback): Promise<ExtractionResult> {
  const chunks = this.chunkText(text);
  const allEntities = new Map<string, ExtractedEntity>();
  const stats: ChunkStats = { strict: 0, repaired: 0, salvaged: 0, parsedEmpty: 0, failed: 0 };
  const badChunks: BadChunkRecord[] = [];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    if (!chunk) continue;
    if (onProgress) onProgress(chunkIndex + 1, chunks.length);

    const llmResponse = await this.llm.complete(EXTRACTION_PROMPT + chunk.text, {
      temperature: 0.1,
      maxTokens: this.maxTokens,
    });

    const result = parseJSONWithFallbacks(llmResponse);

    if (result.ok) {
      let entitiesFromChunk = 0;

      for (let islandIndex = 0; islandIndex < result.values.length; islandIndex++) {
        const candidate = result.values[islandIndex];
        if (!isValidExtractionResponse(candidate)) continue;

        const entities = this.extractEntitiesFromCandidate(candidate, {
          parseMode: result.mode,
          chunkIndex,
          islandIndex: result.mode === 'salvaged' ? islandIndex : undefined,
        });

        entitiesFromChunk += entities.length;
        this.mergeEntities(allEntities, entities);
      }

      if (entitiesFromChunk > 0) {
        stats[result.mode]++;
      } else {
        stats.parsedEmpty++;
      }
    } else {
      stats.failed++;
      badChunks.push({
        chunkIndex,
        phase: result.mode,
        error: result.error,
        errors: result.errors,
        rawSnippet: result.rawSnippet,
        repairedSnippet: result.repairedSnippet,
        attemptedRepair: result.attemptedRepair,
        islandsFound: result.islandsFound,
        model: this.llm.modelName,
        extractorVersion: VERSION,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Write bad chunks if any
  if (badChunks.length > 0) {
    await this.writeBadChunks(badChunks);
  }

  // Print summary
  this.printSummary(stats, allEntities, badChunks.length);

  return {
    entities: Array.from(allEntities.values()).sort((a, b) => b.mentions - a.mentions),
    scenes: await this.extractScenes(text, chunks),
  };
}
```

---

## bad-chunks.jsonl Format

**Location:** `<output-dir>/extract-bad-chunks.jsonl` or `./extract-bad-chunks.jsonl`

**Record format (one line per failed chunk):**

```json
{
  "chunkIndex": 12,
  "phase": "salvaged",
  "error": "All 3 islands failed to parse",
  "errors": {
    "strict": "Unexpected token at position 145",
    "repaired": "Unterminated string"
  },
  "rawSnippet": "{\"characters\":[{\"name\":\"...",
  "repairedSnippet": "{\"characters\":[{\"name\":\"...",
  "attemptedRepair": true,
  "islandsFound": 3,
  "model": "llama3.2:latest",
  "extractorVersion": "0.4.2",
  "timestamp": "2025-02-03T14:22:00Z"
}
```

---

## CLI Output

### Default (summary only)

```
Entity extraction complete:
  Chunks processed: 47
  Parse results:
    - strict:      42 chunks
    - repaired:     3 chunks
    - salvaged:     1 chunk (used 2/5 islands)
    - parsedEmpty:  0 chunks
    - failed:       1 chunk
  Entities extracted: 156
    - characters: 23
    - locations:  18
    - objects:    12
    - events:     103

  ⚠ 1 chunk failed parsing → ./extract-bad-chunks.jsonl
```

### --verbose (per-chunk progress)

```
Chunk 1/47: 8 entities (strict)
Chunk 2/47: 5 entities (strict)
...
Chunk 12/47: 3 entities (salvaged: 2/5 islands)
Chunk 13/47: parse failed → bad-chunks.jsonl
...
```

### --quiet

Suppress all output. Exit code still reflects success (0) or failure (non-zero if all chunks failed).

---

## Dependency

Add to `package.json`:

```json
{
  "dependencies": {
    "jsonrepair": "^3.8.0"
  }
}
```

Pin version for determinism. Import isolated in `json-parser.ts` only.

---

## Implementation Order

1. Add `jsonrepair` dependency
2. Create `src/extraction/json-parser.ts` with full pipeline
3. Update `ExtractedEntity` interface with provenance fields
4. Update `entity-extractor.ts` to use new parser
5. Add bad-chunks.jsonl writing
6. Add summary output
7. Add --verbose and --quiet flags to extract command
8. Unit tests for parser with known broken JSON samples

---

## Testing

### Unit Tests (json-parser.ts)

```typescript
describe('parseJSONWithFallbacks', () => {
  it('parses valid JSON in strict mode', () => {
    const result = parseJSONWithFallbacks('{"characters":[{"name":"Alice"}]}');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('strict');
  });

  it('repairs trailing commas', () => {
    const result = parseJSONWithFallbacks('{"characters":[{"name":"Alice"},]}');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('repaired');
  });

  it('salvages multiple islands', () => {
    const result = parseJSONWithFallbacks('{"characters":[{"name":"Alice"}]} garbage {"locations":[{"name":"Paris"}]}');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('salvaged');
    expect(result.values.length).toBe(2);
  });

  it('handles braces inside strings', () => {
    const result = parseJSONWithFallbacks('{"name":"test}value"}');
    expect(result.ok).toBe(true);
  });

  it('returns failure with all stage errors', () => {
    const result = parseJSONWithFallbacks('not json at all');
    expect(result.ok).toBe(false);
    expect(result.errors?.strict).toBeDefined();
  });
});
```

### Integration Tests

- Extract from real manuscript chunks with known LLM quirks
- Verify provenance fields propagate correctly
- Verify bad-chunks.jsonl is written correctly
- Verify summary counts match actual results
