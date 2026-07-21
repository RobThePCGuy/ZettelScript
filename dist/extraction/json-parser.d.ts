/**
 * Resilient JSON parser for LLM outputs
 *
 * Multi-stage fallback pipeline:
 * 1. Strict - Standard JSON.parse after cleanup
 * 2. Repair - Use jsonrepair library to fix common issues
 * 3. Salvage - Find and parse individual JSON islands
 */
export type ParseMode = 'strict' | 'repaired' | 'salvaged';
export interface ParseSuccess {
    ok: true;
    mode: ParseMode;
    values: unknown[];
    warnings?: string[] | undefined;
}
export interface ParseFailure {
    ok: false;
    mode: ParseMode;
    error: string;
    errors?: Partial<Record<ParseMode, string>> | undefined;
    rawSnippet: string;
    repairedSnippet?: string | undefined;
    attemptedRepair: boolean;
    islandsFound: number;
}
export type ParseResult = ParseSuccess | ParseFailure;
/**
 * Parse JSON with multi-stage fallback
 *
 * Attempts strict parsing first, then repair, then salvage.
 * Returns parsed values with provenance metadata.
 */
export declare function parseJSONWithFallbacks(raw: string): ParseResult;
//# sourceMappingURL=json-parser.d.ts.map