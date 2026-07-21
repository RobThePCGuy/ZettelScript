import type { Proposal } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
export interface ProposalValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export interface ProposalValidatorOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    vaultPath: string;
}
/**
 * Validates proposals before they can be applied
 */
export declare class ProposalValidator {
    private nodeRepo;
    private edgeRepo;
    private vaultPath;
    constructor(options: ProposalValidatorOptions);
    /**
     * Validate a proposal
     */
    validate(proposal: Proposal): Promise<ProposalValidationResult>;
    /**
     * Validate content edit proposal
     */
    private validateContentEdit;
    /**
     * Validate link addition proposal
     */
    private validateLinkAddition;
    /**
     * Validate node creation proposal
     */
    private validateNodeCreation;
    /**
     * Validate node deletion proposal
     */
    private validateNodeDeletion;
    /**
     * Validate metadata update proposal
     */
    private validateMetadataUpdate;
    /**
     * Batch validate multiple proposals
     */
    validateBatch(proposals: Proposal[]): Promise<Map<string, ProposalValidationResult>>;
}
//# sourceMappingURL=proposal-validator.d.ts.map