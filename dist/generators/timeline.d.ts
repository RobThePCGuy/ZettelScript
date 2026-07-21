/**
 * Timeline Generator
 * Creates timeline event notes from KB data
 */
import type { GeneratorOptions, GeneratorResult } from './types.js';
/**
 * Generate timeline event notes from KB data
 */
export declare function generateTimeline(options: GeneratorOptions): Promise<GeneratorResult>;
/**
 * Generate a timeline index MOC
 */
export declare function generateTimelineIndex(options: GeneratorOptions): Promise<string | null>;
//# sourceMappingURL=timeline.d.ts.map