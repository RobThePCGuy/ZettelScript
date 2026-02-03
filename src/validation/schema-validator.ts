import Ajv, { type ValidateFunction } from 'ajv';
import { Type, type TSchema } from '@sinclair/typebox';
import type { Node, Frontmatter } from '../core/types/index.js';
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

// Base frontmatter schema
const BaseFrontmatterSchema = Type.Object(
  {
    id: Type.Optional(Type.String()),
    title: Type.Optional(Type.String()),
    type: Type.Optional(
      Type.Union([
        Type.Literal('note'),
        Type.Literal('scene'),
        Type.Literal('character'),
        Type.Literal('location'),
        Type.Literal('object'),
        Type.Literal('event'),
        Type.Literal('concept'),
        Type.Literal('moc'),
        Type.Literal('timeline'),
        Type.Literal('draft'),
      ])
    ),
    aliases: Type.Optional(Type.Array(Type.String())),
    tags: Type.Optional(Type.Array(Type.String())),
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

// Scene-specific schema
const SceneFrontmatterSchema = Type.Object(
  {
    type: Type.Literal('scene'),
    pov: Type.Optional(Type.String()),
    scene_order: Type.Optional(Type.Number()),
    timeline_position: Type.Optional(Type.String()),
    characters: Type.Optional(Type.Array(Type.String())),
    locations: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: true }
);

// Character-specific schema
const CharacterFrontmatterSchema = Type.Object(
  {
    type: Type.Literal('character'),
    aliases: Type.Optional(Type.Array(Type.String())),
    description: Type.Optional(Type.String()),
    traits: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: true }
);

/**
 * Validates frontmatter schema for nodes
 */
export class SchemaValidator {
  private nodeRepo: NodeRepository;
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;

  constructor(options: SchemaValidatorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.validators = new Map();

    // Register base validator
    this.validators.set('base', this.ajv.compile(BaseFrontmatterSchema));

    // Register type-specific validators
    this.validators.set('scene', this.ajv.compile(SceneFrontmatterSchema));
    this.validators.set('character', this.ajv.compile(CharacterFrontmatterSchema));

    // Register custom schemas
    if (options.customSchemas) {
      for (const [type, schema] of Object.entries(options.customSchemas)) {
        this.validators.set(type, this.ajv.compile(schema));
      }
    }
  }

  /**
   * Validate all nodes
   */
  async validate(): Promise<SchemaValidationResult> {
    const errors: SchemaError[] = [];
    const warnings: SchemaError[] = [];
    let valid = 0;

    const nodes = await this.nodeRepo.findAll();

    for (const node of nodes) {
      const result = this.validateNode(node);

      if (result.errors.length === 0) {
        valid++;
      }

      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      errors,
      warnings,
      valid,
      total: nodes.length,
    };
  }

  /**
   * Validate a single node's frontmatter
   */
  validateNode(node: Node): { errors: SchemaError[]; warnings: SchemaError[] } {
    const errors: SchemaError[] = [];
    const warnings: SchemaError[] = [];

    const metadata = node.metadata as Frontmatter | undefined;

    if (!metadata) {
      // No frontmatter - could be a warning depending on requirements
      return { errors, warnings };
    }

    // Validate against base schema
    const baseValidator = this.validators.get('base');
    if (baseValidator && !baseValidator(metadata)) {
      for (const err of baseValidator.errors || []) {
        errors.push({
          nodeId: node.nodeId,
          path: node.path,
          field: err.instancePath || 'root',
          message: err.message || 'Validation failed',
          value: err.data,
        });
      }
    }

    // Validate against type-specific schema if available
    const typeValidator = this.validators.get(node.type);
    if (typeValidator && metadata.type === node.type) {
      if (!typeValidator(metadata)) {
        for (const err of typeValidator.errors || []) {
          errors.push({
            nodeId: node.nodeId,
            path: node.path,
            field: err.instancePath || 'root',
            message: err.message || 'Validation failed',
            value: err.data,
          });
        }
      }
    }

    // Type-specific validation rules
    if (node.type === 'scene') {
      // Scene should have POV for manuscript mode
      if (!metadata.pov) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: 'pov',
          message: 'Scene missing POV character',
        });
      }

      // Scene should have scene_order for timeline
      if (metadata.scene_order === undefined) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: 'scene_order',
          message: 'Scene missing scene_order for timeline tracking',
        });
      }
    }

    if (node.type === 'character') {
      // Character should have aliases for mention detection
      if (!metadata.aliases || metadata.aliases.length === 0) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: 'aliases',
          message: 'Character has no aliases defined',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Add a custom schema for a type
   */
  addSchema(type: string, schema: TSchema): void {
    this.validators.set(type, this.ajv.compile(schema));
  }

  /**
   * Get validation summary by type
   */
  async getSummary(): Promise<Record<string, { total: number; valid: number; errors: number }>> {
    const nodes = await this.nodeRepo.findAll();
    const summary: Record<string, { total: number; valid: number; errors: number }> = {};

    for (const node of nodes) {
      if (!summary[node.type]) {
        summary[node.type] = { total: 0, valid: 0, errors: 0 };
      }

      const typeStats = summary[node.type];
      if (typeStats) {
        typeStats.total++;

        const result = this.validateNode(node);
        if (result.errors.length === 0) {
          typeStats.valid++;
        } else {
          typeStats.errors++;
        }
      }
    }

    return summary;
  }
}
