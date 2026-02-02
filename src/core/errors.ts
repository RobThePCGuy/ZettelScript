/**
 * Base error class for ZettelScript
 */
export class ZettelScriptError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ZettelScriptError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends ZettelScriptError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * Parsing errors (markdown, frontmatter, wikilinks)
 */
export class ParseError extends ZettelScriptError {
  constructor(
    message: string,
    public filePath: string,
    public line?: number,
    public column?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'PARSE_ERROR', { filePath, line, column, ...details });
    this.name = 'ParseError';
  }
}

/**
 * Link resolution errors
 */
export class ResolutionError extends ZettelScriptError {
  constructor(
    message: string,
    public linkText: string,
    public candidates?: string[],
    details?: Record<string, unknown>
  ) {
    super(message, 'RESOLUTION_ERROR', { linkText, candidates, ...details });
    this.name = 'ResolutionError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ZettelScriptError {
  constructor(
    message: string,
    public issues: Array<{
      path: string;
      message: string;
      severity: 'error' | 'warning';
    }>,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { issues, ...details });
    this.name = 'ValidationError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends ZettelScriptError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

/**
 * Graph operation errors
 */
export class GraphError extends ZettelScriptError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GRAPH_ERROR', details);
    this.name = 'GraphError';
  }
}

/**
 * Retrieval/embedding errors
 */
export class RetrievalError extends ZettelScriptError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RETRIEVAL_ERROR', details);
    this.name = 'RetrievalError';
  }
}

/**
 * File system errors
 */
export class FileSystemError extends ZettelScriptError {
  constructor(
    message: string,
    public filePath: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'FILESYSTEM_ERROR', { filePath, ...details });
    this.name = 'FileSystemError';
  }
}

/**
 * Manuscript/continuity errors
 */
export class ContinuityError extends ZettelScriptError {
  constructor(
    message: string,
    public issueType: string,
    public nodeId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'CONTINUITY_ERROR', { issueType, nodeId, ...details });
    this.name = 'ContinuityError';
  }
}

/**
 * Proposal/writeback errors
 */
export class ProposalError extends ZettelScriptError {
  constructor(
    message: string,
    public proposalId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'PROPOSAL_ERROR', { proposalId, ...details });
    this.name = 'ProposalError';
  }
}

/**
 * Embedding provider errors
 */
export class EmbeddingError extends ZettelScriptError {
  constructor(
    message: string,
    public provider: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EMBEDDING_ERROR', { provider, ...details });
    this.name = 'EmbeddingError';
  }
}
