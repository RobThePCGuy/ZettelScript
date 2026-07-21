import type { Node, Chunk } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository, ChunkRepository } from '../../storage/database/repositories/index.js';
import { SceneGraph } from './scene-graph.js';
import { CharacterTracker } from './character-tracker.js';
export interface PovFilterOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    chunkRepository: ChunkRepository;
    sceneGraph: SceneGraph;
    characterTracker: CharacterTracker;
}
export interface FilteredContent {
    chunks: Chunk[];
    nodes: Node[];
    filtered: Array<{
        nodeId: string;
        reason: string;
    }>;
}
/**
 * Filters content based on POV visibility rules
 * Following spec 11.4:
 * - Node is in/before target scene chronologically AND
 *   - Has participation edge to POV character, OR
 *   - Has pov_visible_to edge to POV character, OR
 *   - Is narrator-visible (if configured)
 */
export declare class PovFilter {
    private nodeRepo;
    private edgeRepo;
    private chunkRepo;
    private sceneGraph;
    private characterTracker;
    constructor(options: PovFilterOptions);
    /**
     * Filter content visible to a POV character at a specific scene
     */
    filterForPov(povCharacter: string, atSceneNodeId: string, content: {
        chunks: Chunk[];
        nodes: Node[];
    }): Promise<FilteredContent>;
    /**
     * Check if a node is visible to a POV character
     */
    private isVisibleToPov;
    /**
     * Get all content visible to a POV at a scene
     */
    getVisibleContent(povCharacter: string, atSceneNodeId: string): Promise<FilteredContent>;
    /**
     * Check for POV consistency in a scene
     */
    checkPovConsistency(sceneNodeId: string): Promise<Array<{
        type: 'error' | 'warning';
        message: string;
        nodeId?: string;
    }>>;
}
//# sourceMappingURL=pov-filter.d.ts.map