/**
 * Base error class for ZettelScript
 */
export declare class ZettelScriptError extends Error {
    code: string;
    details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, details?: Record<string, unknown> | undefined);
}
/**
 * Database-related errors
 */
export declare class DatabaseError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Parsing errors (markdown, frontmatter, wikilinks)
 */
export declare class ParseError extends ZettelScriptError {
    filePath: string;
    line?: number | undefined;
    column?: number | undefined;
    constructor(message: string, filePath: string, line?: number | undefined, column?: number | undefined, details?: Record<string, unknown>);
}
/**
 * Link resolution errors
 */
export declare class ResolutionError extends ZettelScriptError {
    linkText: string;
    candidates?: string[] | undefined;
    constructor(message: string, linkText: string, candidates?: string[] | undefined, details?: Record<string, unknown>);
}
/**
 * Validation errors
 */
export declare class ValidationError extends ZettelScriptError {
    issues: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
    }>;
    constructor(message: string, issues: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
    }>, details?: Record<string, unknown>);
}
/**
 * Configuration errors
 */
export declare class ConfigError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Graph operation errors
 */
export declare class GraphError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Retrieval/embedding errors
 */
export declare class RetrievalError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * File system errors
 */
export declare class FileSystemError extends ZettelScriptError {
    filePath: string;
    constructor(message: string, filePath: string, details?: Record<string, unknown>);
}
/**
 * Manuscript/continuity errors
 */
export declare class ContinuityError extends ZettelScriptError {
    issueType: string;
    nodeId: string;
    constructor(message: string, issueType: string, nodeId: string, details?: Record<string, unknown>);
}
/**
 * Proposal/writeback errors
 */
export declare class ProposalError extends ZettelScriptError {
    proposalId: string;
    constructor(message: string, proposalId: string, details?: Record<string, unknown>);
}
/**
 * Embedding provider errors
 */
export declare class EmbeddingError extends ZettelScriptError {
    provider: string;
    constructor(message: string, provider: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map