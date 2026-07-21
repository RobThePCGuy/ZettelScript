/**
 * Entity extraction from prose using LLM
 *
 * Features:
 * - Multi-stage JSON parsing with repair and salvage
 * - Provenance tracking for each entity
 * - bad-chunks.jsonl for failed chunk diagnostics
 * - Summary output with parse statistics
 */
import type { LLMProvider } from '../llm/provider.js';
import type { NodeType } from '../core/types/index.js';
import { type ParseMode } from './json-parser.js';
export interface ExtractedEntity {
    name: string;
    type: NodeType;
    aliases: string[];
    description: string;
    mentions: number;
    parseMode: ParseMode;
    chunkIndex: number;
    islandIndex?: number | undefined;
}
export interface ExtractionResult {
    entities: ExtractedEntity[];
    scenes: Array<{
        title: string;
        summary: string;
        startOffset: number;
        endOffset: number;
        entities: string[];
    }>;
    stats: ChunkStats;
    badChunksPath?: string | undefined;
}
export interface EntityExtractorOptions {
    llmProvider: LLMProvider;
    chunkSize?: number;
    overlapSize?: number;
    maxTokens?: number;
    outputDir?: string;
    verbose?: boolean;
    quiet?: boolean;
}
interface ChunkStats {
    total: number;
    strict: number;
    repaired: number;
    salvaged: number;
    parsedEmpty: number;
    failed: number;
    entitiesByType: Record<string, number>;
    entitiesByMode: Record<ParseMode, number>;
}
export declare const SCENE_EXTRACTION_PROMPT = "Analyze this text and identify distinct scenes or chapters. A scene is a continuous unit of action in one location/time.\n\nReturn ONLY valid JSON (no markdown):\n{\n  \"scenes\": [\n    {\n      \"title\": \"Brief scene title\",\n      \"summary\": \"One sentence summary\",\n      \"characters\": [\"Character names present\"],\n      \"locations\": [\"Location names\"],\n      \"startMarker\": \"First few words of scene\",\n      \"endMarker\": \"Last few words of scene\"\n    }\n  ]\n}\n\nTEXT:\n";
export declare class EntityExtractor {
    private llm;
    private chunkSize;
    private overlapSize;
    private maxTokens;
    private outputDir;
    private verbose;
    private quiet;
    constructor(options: EntityExtractorOptions);
    /**
     * Extract entities from a full manuscript
     */
    extractFromText(text: string, onProgress?: (current: number, total: number) => void): Promise<ExtractionResult>;
    /**
     * Print extraction summary to console
     */
    printSummary(result: ExtractionResult): void;
    private chunkText;
    private extractEntitiesFromCandidate;
    private mergeEntities;
    private extractScenes;
    private normalizeEntityKey;
    private writeBadChunks;
}
export {};
//# sourceMappingURL=entity-extractor.d.ts.map