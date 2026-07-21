import type { ImpactAnalysis, ZettelScriptConfig } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import { GraphEngine } from '../../core/graph/engine.js';
export interface ImpactAnalyzerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    graphEngine: GraphEngine;
    config?: ZettelScriptConfig;
}
/**
 * Analyzes the impact of changes to a scene
 */
export declare class ImpactAnalyzer {
    private nodeRepo;
    private edgeRepo;
    private graphEngine;
    private config;
    constructor(options: ImpactAnalyzerOptions);
    /**
     * Analyze the impact of modifying a scene
     */
    analyze(sceneNodeId: string): Promise<ImpactAnalysis>;
    /**
     * Get directly linked nodes
     */
    private getDirectImpact;
    /**
     * Get transitively impacted nodes via graph expansion
     */
    private getTransitiveImpact;
    /**
     * Get scenes with the same POV character
     */
    private getPovImpact;
    /**
     * Get adjacent scenes in the timeline
     */
    private getTimelineImpact;
    /**
     * Get characters whose knowledge might be affected
     */
    private getCharacterImpact;
    /**
     * Get detailed impact report
     */
    getDetailedReport(sceneNodeId: string): Promise<{
        impact: ImpactAnalysis;
        summary: {
            totalAffected: number;
            directCount: number;
            transitiveCount: number;
            characterCount: number;
            riskLevel: 'low' | 'medium' | 'high';
        };
        recommendations: string[];
    }>;
}
//# sourceMappingURL=impact-analyzer.d.ts.map