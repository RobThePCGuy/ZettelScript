import { type TSchema } from '@sinclair/typebox';
import type { Node } from '../core/types/index.js';
import { NodeRepository } from '../storage/database/repositories/index.js';
export interface SchemaError {
    nodeId: string;
    path: string;
    field: string;
    message: string;
    value?: unknown;
}
export interface SchemaValidationResult {
    errors: SchemaError[];
    warnings: SchemaError[];
    valid: number;
    total: number;
}
export interface SchemaValidatorOptions {
    nodeRepository: NodeRepository;
    customSchemas?: Record<string, TSchema>;
}
/**
 * Validates frontmatter schema for nodes
 */
export declare class SchemaValidator {
    private nodeRepo;
    private ajv;
    private validators;
    constructor(options: SchemaValidatorOptions);
    /**
     * Validate all nodes
     */
    validate(): Promise<SchemaValidationResult>;
    /**
     * Validate a single node's frontmatter
     */
    validateNode(node: Node): {
        errors: SchemaError[];
        warnings: SchemaError[];
    };
    /**
     * Add a custom schema for a type
     */
    addSchema(type: string, schema: TSchema): void;
    /**
     * Get validation summary by type
     */
    getSummary(): Promise<Record<string, {
        total: number;
        valid: number;
        errors: number;
    }>>;
}
//# sourceMappingURL=schema-validator.d.ts.map