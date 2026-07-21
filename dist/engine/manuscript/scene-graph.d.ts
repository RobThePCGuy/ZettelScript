import type { SceneInfo } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
export interface SceneNode extends SceneInfo {
    title: string;
    path: string;
}
export interface SceneGraphOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
}
/**
 * Scene graph for managing manuscript chronology
 */
export declare class SceneGraph {
    private nodeRepo;
    private edgeRepo;
    private scenes;
    private scenesByOrder;
    private scenesByPov;
    constructor(options: SceneGraphOptions);
    /**
     * Load all scenes and build the graph
     */
    load(): Promise<void>;
    /**
     * Convert Node to SceneNode
     */
    private nodeToSceneNode;
    /**
     * Get all scenes sorted by order
     */
    getScenesInOrder(): SceneNode[];
    /**
     * Get scenes before a given scene (chronologically)
     */
    getScenesBefore(sceneOrder: number): SceneNode[];
    /**
     * Get scenes after a given scene (chronologically)
     */
    getScenesAfter(sceneOrder: number): SceneNode[];
    /**
     * Get adjacent scenes (previous and next)
     */
    getAdjacentScenes(sceneOrder: number): {
        previous: SceneNode | null;
        next: SceneNode | null;
    };
    /**
     * Get scenes by POV character
     */
    getScenesByPov(povCharacter: string): SceneNode[];
    /**
     * Get scenes where a character is present
     */
    getScenesWithCharacter(characterName: string): SceneNode[];
    /**
     * Get scenes at a location
     */
    getScenesAtLocation(locationName: string): SceneNode[];
    /**
     * Get the POV character for a scene
     */
    getPov(sceneNodeId: string): string | null;
    /**
     * Get scene by order number
     */
    getSceneByOrder(order: number): SceneNode | null;
    /**
     * Get scene by node ID
     */
    getScene(nodeId: string): SceneNode | null;
    /**
     * Check if a node/event is visible to POV at a given scene
     * Following spec 11.4 visibility rules
     */
    isVisibleToPov(informationNodeId: string, povCharacter: string, atSceneOrder: number): Promise<boolean>;
    /**
     * Get timeline gaps (missing scene_order numbers)
     */
    getTimelineGaps(): Array<{
        after: number;
        before: number;
        gap: number;
    }>;
    /**
     * Get orphan scenes (no scene_order)
     */
    getOrphanScenes(): SceneNode[];
    /**
     * Get all unique POV characters
     */
    getPovCharacters(): string[];
    /**
     * Get all unique characters mentioned in scenes
     */
    getAllCharacters(): string[];
    /**
     * Get all unique locations
     */
    getAllLocations(): string[];
}
//# sourceMappingURL=scene-graph.d.ts.map