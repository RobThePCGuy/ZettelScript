import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import { SceneGraph } from './scene-graph.js';
export interface CharacterState {
    characterId: string;
    characterName: string;
    knowledge: Map<string, {
        learnedAt: string;
        source: string;
        sceneOrder: number;
    }>;
    presentIn: string[];
    povScenes: string[];
    lastKnownLocation: string | null;
    relationships: Map<string, {
        type: string;
        establishedAt: string;
    }>;
}
export interface CharacterTrackerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    sceneGraph: SceneGraph;
}
/**
 * Tracks character knowledge and state through the manuscript
 */
export declare class CharacterTracker {
    private nodeRepo;
    private edgeRepo;
    private sceneGraph;
    private characterStates;
    constructor(options: CharacterTrackerOptions);
    /**
     * Build character state by processing scenes in order
     */
    buildState(): Promise<void>;
    /**
     * Process a scene to update character states
     */
    private processScene;
    /**
     * Get character state by name
     */
    private getStateByName;
    /**
     * Get character state by ID
     */
    getState(characterId: string): CharacterState | null;
    /**
     * Check if a character knows about something at a given scene
     */
    knowsAbout(characterName: string, informationId: string, atSceneOrder: number): boolean;
    /**
     * Get what a character knows at a specific point
     */
    getKnowledgeAt(characterName: string, atSceneOrder: number): string[];
    /**
     * Get scenes where two characters have met
     */
    getSharedScenes(char1Name: string, char2Name: string): string[];
    /**
     * Find potential POV leakage
     * Returns information that POV shouldn't know at a scene
     */
    findPovLeakage(sceneNodeId: string): Promise<Array<{
        informationId: string;
        reason: string;
    }>>;
    /**
     * Get all character names
     */
    getCharacterNames(): string[];
    /**
     * Get character statistics
     */
    getCharacterStats(): Array<{
        name: string;
        sceneCount: number;
        povSceneCount: number;
        knowledgeCount: number;
        relationshipCount: number;
    }>;
}
//# sourceMappingURL=character-tracker.d.ts.map