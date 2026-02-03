import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import { SceneGraph, type SceneNode } from './scene-graph.js';

export interface CharacterState {
  characterId: string;
  characterName: string;
  // What the character knows and when they learned it
  knowledge: Map<string, { learnedAt: string; source: string; sceneOrder: number }>;
  // Scenes where the character is present
  presentIn: string[];
  // POV scenes for this character
  povScenes: string[];
  // Current location (last known)
  lastKnownLocation: string | null;
  // Relationships established
  relationships: Map<string, { type: string; establishedAt: string }>;
}

export interface CharacterTrackerOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  sceneGraph: SceneGraph;
}

/**
 * Tracks character knowledge and state through the manuscript
 */
export class CharacterTracker {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private sceneGraph: SceneGraph;
  private characterStates: Map<string, CharacterState> = new Map();

  constructor(options: CharacterTrackerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.sceneGraph = options.sceneGraph;
  }

  /**
   * Build character state by processing scenes in order
   */
  async buildState(): Promise<void> {
    this.characterStates.clear();

    // Get all character nodes
    const characters = await this.nodeRepo.findByType('character');

    // Initialize character states
    for (const char of characters) {
      this.characterStates.set(char.nodeId, {
        characterId: char.nodeId,
        characterName: char.title,
        knowledge: new Map(),
        presentIn: [],
        povScenes: [],
        lastKnownLocation: null,
        relationships: new Map(),
      });
    }

    // Process scenes in order
    const scenes = this.sceneGraph.getScenesInOrder();

    for (const scene of scenes) {
      await this.processScene(scene);
    }
  }

  /**
   * Process a scene to update character states
   */
  private async processScene(scene: SceneNode): Promise<void> {
    // Get characters present in this scene
    const presentCharacters = new Set(scene.characters);
    if (scene.pov) {
      presentCharacters.add(scene.pov);
    }

    // Update presence tracking
    for (const charName of presentCharacters) {
      const state = this.getStateByName(charName);
      if (state) {
        state.presentIn.push(scene.nodeId);

        // Update last known location
        if (scene.locations.length > 0) {
          state.lastKnownLocation = scene.locations[0] ?? null;
        }

        // POV tracking
        if (scene.pov === charName) {
          state.povScenes.push(scene.nodeId);
        }
      }
    }

    // Process what characters learn in this scene
    // Characters present learn about events/information in the scene
    const sceneLinks = await this.edgeRepo.findOutgoing(scene.nodeId);

    for (const link of sceneLinks) {
      const targetNode = await this.nodeRepo.findById(link.targetId);
      if (!targetNode) continue;

      // All present characters learn about linked content
      for (const charName of presentCharacters) {
        const state = this.getStateByName(charName);
        if (state && !state.knowledge.has(link.targetId)) {
          state.knowledge.set(link.targetId, {
            learnedAt: scene.title,
            source: scene.nodeId,
            sceneOrder: scene.sceneOrder,
          });
        }
      }

      // Track character relationships
      if (targetNode.type === 'character') {
        for (const charName of presentCharacters) {
          if (charName === targetNode.title) continue;

          const state = this.getStateByName(charName);
          if (state && !state.relationships.has(targetNode.nodeId)) {
            state.relationships.set(targetNode.nodeId, {
              type: link.edgeType,
              establishedAt: scene.title,
            });
          }
        }
      }
    }
  }

  /**
   * Get character state by name
   */
  private getStateByName(name: string): CharacterState | null {
    for (const state of this.characterStates.values()) {
      if (state.characterName === name) {
        return state;
      }
    }
    return null;
  }

  /**
   * Get character state by ID
   */
  getState(characterId: string): CharacterState | null {
    return this.characterStates.get(characterId) ?? null;
  }

  /**
   * Check if a character knows about something at a given scene
   */
  knowsAbout(characterName: string, informationId: string, atSceneOrder: number): boolean {
    const state = this.getStateByName(characterName);
    if (!state) return false;

    const knowledge = state.knowledge.get(informationId);
    if (!knowledge) return false;

    return knowledge.sceneOrder <= atSceneOrder;
  }

  /**
   * Get what a character knows at a specific point
   */
  getKnowledgeAt(characterName: string, atSceneOrder: number): string[] {
    const state = this.getStateByName(characterName);
    if (!state) return [];

    const knownItems: string[] = [];
    for (const [itemId, info] of state.knowledge) {
      if (info.sceneOrder <= atSceneOrder) {
        knownItems.push(itemId);
      }
    }

    return knownItems;
  }

  /**
   * Get scenes where two characters have met
   */
  getSharedScenes(char1Name: string, char2Name: string): string[] {
    const state1 = this.getStateByName(char1Name);
    const state2 = this.getStateByName(char2Name);

    if (!state1 || !state2) return [];

    const set1 = new Set(state1.presentIn);
    return state2.presentIn.filter((sceneId) => set1.has(sceneId));
  }

  /**
   * Find potential POV leakage
   * Returns information that POV shouldn't know at a scene
   */
  async findPovLeakage(sceneNodeId: string): Promise<
    Array<{
      informationId: string;
      reason: string;
    }>
  > {
    const scene = this.sceneGraph.getScene(sceneNodeId);
    if (!scene || !scene.pov) return [];

    const leakages: Array<{ informationId: string; reason: string }> = [];

    // Get all links from this scene
    const links = await this.edgeRepo.findOutgoing(sceneNodeId);

    for (const link of links) {
      const targetNode = await this.nodeRepo.findById(link.targetId);
      if (!targetNode) continue;

      // Check if POV should know about this
      const povKnows = this.knowsAbout(scene.pov, link.targetId, scene.sceneOrder);

      if (!povKnows) {
        // Check if it's established in this scene (first introduction is ok)
        const isNewInfo = !this.getStateByName(scene.pov)?.knowledge.has(link.targetId);

        if (!isNewInfo) {
          leakages.push({
            informationId: link.targetId,
            reason: `POV "${scene.pov}" references "${targetNode.title}" but hasn't learned about it yet`,
          });
        }
      }
    }

    return leakages;
  }

  /**
   * Get all character names
   */
  getCharacterNames(): string[] {
    return Array.from(this.characterStates.values()).map((s) => s.characterName);
  }

  /**
   * Get character statistics
   */
  getCharacterStats(): Array<{
    name: string;
    sceneCount: number;
    povSceneCount: number;
    knowledgeCount: number;
    relationshipCount: number;
  }> {
    return Array.from(this.characterStates.values()).map((state) => ({
      name: state.characterName,
      sceneCount: state.presentIn.length,
      povSceneCount: state.povScenes.length,
      knowledgeCount: state.knowledge.size,
      relationshipCount: state.relationships.size,
    }));
  }
}
