/**
 * Resilient JSON parser for LLM outputs
 *
 * Multi-stage fallback pipeline:
 * 1. Strict - Standard JSON.parse after cleanup
 * 2. Repair - Use jsonrepair library to fix common issues
 * 3. Salvage - Find and parse individual JSON islands
 */

import { jsonrepair } from 'jsonrepair';

// ============================================================================
// Types
// ============================================================================

export type ParseMode = 'strict' | 'repaired' | 'salvaged';

export interface ParseSuccess {
  ok: true;
  mode: ParseMode;
  values: unknown[]; // Always array (1 for strict/repair, N for salvage)
  warnings?: string[] | undefined;
}

export interface ParseFailure {
  ok: false;
  mode: ParseMode; // Last stage attempted
  error: string;
  errors?: Partial<Record<ParseMode, string>> | undefined;
  rawSnippet: string;
  repairedSnippet?: string | undefined;
  attemptedRepair: boolean;
  islandsFound: number;
}

export type ParseResult = ParseSuccess | ParseFailure;

// Internal helper types
interface StrictResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

interface RepairResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  repairedText?: string;
}

interface SalvageResult {
  ok: boolean;
  values?: unknown[] | undefined;
  error?: string | undefined;
  warnings?: string[] | undefined;
  islandsFound: number;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Parse JSON with multi-stage fallback
 *
 * Attempts strict parsing first, then repair, then salvage.
 * Returns parsed values with provenance metadata.
 */
export function parseJSONWithFallbacks(raw: string): ParseResult {
  // Shared cleanup (runs once, before all stages)
  const cleaned = cleanupRaw(raw);
  const errors: Partial<Record<ParseMode, string>> = {};

  // Stage 1: Strict
  const strict = tryStrictParse(cleaned);
  if (strict.ok && strict.value !== undefined) {
    return { ok: true, mode: 'strict', values: [strict.value] };
  }
  if (strict.error) errors.strict = strict.error;

  // Stage 2: Repair
  const repaired = tryRepairParse(cleaned);
  if (repaired.ok && repaired.value !== undefined) {
    return { ok: true, mode: 'repaired', values: [repaired.value] };
  }
  if (repaired.error) errors.repaired = repaired.error;

  // Stage 3: Salvage
  const salvaged = trySalvageParse(cleaned);
  if (salvaged.ok && salvaged.values && salvaged.values.length > 0) {
    return {
      ok: true,
      mode: 'salvaged',
      values: salvaged.values,
      warnings: salvaged.warnings,
    };
  }

  // All failed
  return {
    ok: false,
    mode: 'salvaged',
    error: salvaged.error ?? 'No valid JSON found',
    errors,
    rawSnippet: cleaned.slice(0, 500),
    repairedSnippet: repaired.repairedText?.slice(0, 500),
    attemptedRepair: true,
    islandsFound: salvaged.islandsFound,
  };
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up raw LLM output before parsing
 * - Strip markdown fences
 * - Find outermost JSON boundaries
 */
function cleanupRaw(raw: string): string {
  let text = raw.trim();

  // Strip markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Find outermost JSON boundaries
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');

  // Determine which comes first
  let start: number;
  let closeChar: string;

  if (objStart === -1 && arrStart === -1) {
    return text; // No JSON structure found
  } else if (objStart === -1) {
    start = arrStart;
    closeChar = ']';
  } else if (arrStart === -1) {
    start = objStart;
    closeChar = '}';
  } else if (objStart < arrStart) {
    start = objStart;
    closeChar = '}';
  } else {
    start = arrStart;
    closeChar = ']';
  }

  const end = text.lastIndexOf(closeChar);
  if (end > start) {
    text = text.slice(start, end + 1);
  }

  return text;
}

// ============================================================================
// Stage 1: Strict Parse
// ============================================================================

function tryStrictParse(text: string): StrictResult {
  try {
    const value = JSON.parse(text);
    return { ok: true, value };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ============================================================================
// Stage 2: Repair Parse
// ============================================================================

function tryRepairParse(text: string): RepairResult {
  let repairedText: string | undefined;

  try {
    repairedText = jsonrepair(text);
  } catch (e) {
    return {
      ok: false,
      error: `Repair failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  try {
    const value = JSON.parse(repairedText);
    return { ok: true, value, repairedText };
  } catch (e) {
    return {
      ok: false,
      error: `Parse after repair failed: ${e instanceof Error ? e.message : String(e)}`,
      repairedText,
    };
  }
}

// ============================================================================
// Stage 3: Salvage Parse
// ============================================================================

function trySalvageParse(text: string): SalvageResult {
  const islands = findJSONIslands(text);
  const values: unknown[] = [];
  let failed = 0;

  for (const island of islands) {
    // Try strict first
    const strict = tryStrictParse(island);
    if (strict.ok && isNonEmptyObjectOrArray(strict.value)) {
      values.push(strict.value);
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
    const warnings: string[] = [];
    if (islands.length > 1 || failed > 0) {
      warnings.push(`salvage: used ${values.length}/${islands.length} islands`);
    }
    return {
      ok: true,
      values,
      warnings: warnings.length > 0 ? warnings : undefined,
      islandsFound: islands.length,
    };
  }

  return {
    ok: false,
    error:
      islands.length === 0
        ? 'No JSON islands found'
        : `All ${islands.length} islands failed to parse`,
    islandsFound: islands.length,
  };
}

/**
 * Find JSON islands (balanced {...} or [...] regions) in text
 *
 * Uses a string-aware scanner to avoid treating braces inside
 * quoted strings as structural boundaries.
 */
function findJSONIslands(text: string): string[] {
  const islands: string[] = [];
  const stack: string[] = [];
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    // Handle escape sequences
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    // Handle string boundaries
    if (char === '"') {
      inString = !inString;
      continue;
    }

    // Skip everything inside strings
    if (inString) continue;

    // Handle structural braces
    if (char === '{' || char === '[') {
      if (stack.length === 0) start = i;
      stack.push(char === '{' ? '}' : ']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
        if (stack.length === 0 && start !== -1) {
          const island = text.slice(start, i + 1);
          // Skip tiny islands (< 20 chars)
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

/**
 * Check if a value is a non-empty object or array
 * Filters out primitives and empty containers
 */
function isNonEmptyObjectOrArray(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return false;
}
