

import type { Game, PlayerState, Chapter, ChapterId, GameObjectId, GameObjectState, PortalState, PortalId, NpcId, NpcState, LocationId, ItemId, ItemState, LocationState, EntityRuntimeState } from './game/types';

/**
 * NEW ARCHITECTURE: Initialize PlayerState with unified world state
 *
 * This function creates the initial game state by:
 * 1. Building a unified world state from all entities
 * 2. Copying stateDefaults from cartridge entities
 * 3. Maintaining backward compatibility with legacy state structures
 */
export function getInitialState(game: Game): PlayerState {

  // ============================================================================
  // NEW: Unified World State
  // ============================================================================
  // Initialize world with default state from all entities
  const world: Record<string, EntityRuntimeState> = {};

  // Initialize game objects
  for (const gameObjectId in game.gameObjects) {
    const gameObject = game.gameObjects[gameObjectId as GameObjectId];
    world[gameObject.id] = {
      // Universal properties
      isVisible: true, // Default to visible unless explicitly hidden
      discovered: false,
      currentStateId: gameObject.state?.currentStateId || 'default',

      // Object-specific properties
      isOpen: gameObject.state?.isOpen || false,
      isLocked: gameObject.state?.isLocked || false,
      isBroken: gameObject.state?.isBroken || false,
      isMoved: false,
      isPoweredOn: gameObject.state?.isPoweredOn || false,

      // Container
      items: gameObject.inventory?.items ? [...gameObject.inventory.items] : [],

      // Analytics
      usedCount: 0,
      examinedCount: 0,
    };
  }

  // Initialize items
  for (const itemId in game.items) {
    const item = game.items[itemId as ItemId];

    // Check if item is a child of a container - if so, start hidden
    let isHiddenChild = false;
    for (const objId in game.gameObjects) {
      const obj = game.gameObjects[objId as GameObjectId];
      if (obj.children?.items?.includes(item.id as any)) {
        // Item is a child - start hidden if parent is closed/unmoved
        isHiddenChild = true;
        break;
      }
    }

    world[item.id] = {
      isVisible: !isHiddenChild, // Hidden if child of container, visible otherwise
      discovered: false,
      taken: false,
      readCount: item.state?.readCount || 0,
      currentStateId: item.state?.currentStateId || 'default',
    };
  }

  // Initialize NPCs
  for (const npcId in game.npcs) {
    const npc = game.npcs[npcId as NpcId];
    world[npc.id] = {
      isVisible: true,
      discovered: false,
      stage: npc.initialState?.stage || 'active',
      importance: npc.importance,
      trust: npc.initialState?.trust || 0,
      attitude: npc.initialState?.attitude || 'neutral',
      completedTopics: [],
      interactionCount: 0,
    };
  }

  // Initialize portals
  for (const portalId in game.portals) {
    const portal = game.portals[portalId as PortalId];
    world[portal.portalId] = {
      isVisible: true,
      discovered: false,
      isOpen: portal.state?.isOpen || false,
      isLocked: portal.state?.isLocked || false,
    };
  }

  // ============================================================================
  // Legacy State Structures (for backward compatibility)
  // ============================================================================
  const initialObjectStates: Record<GameObjectId, GameObjectState> = {};
  for (const gameObjectId in game.gameObjects) {
    const gameObject = game.gameObjects[gameObjectId as GameObjectId];
    initialObjectStates[gameObject.id] = {
      isLocked: gameObject.state.isLocked,
      isOpen: gameObject.state.isOpen,
      isBroken: gameObject.state.isBroken,
      isPoweredOn: gameObject.state.isPoweredOn,
      items: gameObject.inventory?.items ? [...gameObject.inventory.items] : [],
      currentStateId: gameObject.state.currentStateId,
    };
  }

  const initialItemStates: Record<ItemId, Partial<ItemState>> = {};
  for (const itemId in game.items) {
      const item = game.items[itemId as ItemId];
      if (item.state) {
          initialItemStates[item.id] = {
              readCount: item.state.readCount || 0,
              currentStateId: item.state.currentStateId || 'default'
          };
      }
  }

  const initialPortalStates: Record<PortalId, PortalState> = {};
  for (const portalId in game.portals) {
      const portal = game.portals[portalId as PortalId];
      initialPortalStates[portal.portalId] = {
          isLocked: portal.state.isLocked,
          isOpen: portal.state.isOpen,
      };
  }

  const initialNpcStates: Record<NpcId, NpcState> = {};
  for (const npcId in game.npcs) {
    const npc = game.npcs[npcId as NpcId];
    initialNpcStates[npc.id] = {
      stage: npc.initialState.stage,
      importance: npc.importance,
      trust: npc.initialState.trust,
      attitude: npc.initialState.attitude,
      completedTopics: [],
      interactionCount: 0,
    };
  }

  const initialLocationStates: Record<LocationId, LocationState> = {};
    for (const locationId in game.locations) {
        const location = game.locations[locationId as LocationId];
        initialLocationStates[location.locationId] = {
            objects: [...location.objects]
        };
    }

  // ============================================================================
  // Find Starting Location
  // ============================================================================
  const startChapter = game.chapters[game.startChapterId];
  if (!startChapter) {
      throw new Error(`Start chapter "${game.startChapterId}" not found in game data.`);
  }

  const startingInventory: ItemId[] = ['item_player_phone' as ItemId];

  // ============================================================================
  // Return Complete PlayerState
  // ============================================================================
  return {
    currentGameId: game.id,
    currentChapterId: game.startChapterId,
    currentLocationId: startChapter.startLocationId,
    inventory: startingInventory,

    // NEW: Flags as Record<string, boolean>
    flags: {},

    // NEW: Unified world state
    world,

    // NEW: Counters for analytics
    counters: {},

    // Legacy state structures (preserved for backward compatibility)
    objectStates: initialObjectStates,
    locationStates: initialLocationStates,
    itemStates: initialItemStates,
    portalStates: initialPortalStates,
    npcStates: initialNpcStates,

    stories: {},
    activeConversationWith: null,
    interactingWithObject: null,
  };
}
