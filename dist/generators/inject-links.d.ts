/**
 * Link Injection
 * Post-processor that adds wikilinks to notes based on entity names
 * Carefully avoids frontmatter, code blocks, existing links, and headers
 */
import type { InjectLinksOptions, InjectLinksResult } from './types.js';
/**
 * Inject wikilinks into all matching files in a vault
 */
export declare function injectLinks(options: InjectLinksOptions): Promise<InjectLinksResult>;
/**
 * Preview link injection without modifying files
 */
export declare function previewLinkInjection(options: InjectLinksOptions): Promise<Map<string, Array<{
    original: string;
    linked: string;
    position: number;
}>>>;
//# sourceMappingURL=inject-links.d.ts.map