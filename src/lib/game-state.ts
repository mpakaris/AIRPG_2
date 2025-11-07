

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

    // Check if object is a child of another object - if so, check parent state
    let isHiddenChild = false;
    for (const parentObjId in game.gameObjects) {
      const parentObj = game.gameObjects[parentObjId as GameObjectId];
      if (parentObj.children?.objects?.includes(gameObject.id as any)) {
        // Object is a child - check parent accessibility based on capabilities
        const parentState = parentObj.state || {};

        // If parent is a container, check if it's open/unlocked
        if (parentObj.capabilities?.container) {
          // If container is NOT openable, children are hidden until revealed (e.g., via examination)
          if (!parentObj.capabilities?.openable) {
            isHiddenChild = true;
          }
          // If container IS openable, children hidden if parent is closed OR locked
          else if (!(parentState as any).isOpen || (parentState as any).isLocked) {
            isHiddenChild = true;
          }
        }
        // If parent is movable (non-container), check if it's moved
        else if (parentObj.capabilities?.movable) {
          // Movable objects: child hidden until parent is moved (e.g., safe behind painting)
          if (!(parentState as any).isMoved) {
            isHiddenChild = true;
          }
        }
        break;
      }
    }

    world[gameObject.id] = {
      // Universal properties
      isVisible: !isHiddenChild, // Visible if not a hidden child (parent has been moved/revealed)
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

    // Check if item is a child of a container - if so, check parent state
    let isHiddenChild = false;
    for (const objId in game.gameObjects) {
      const obj = game.gameObjects[objId as GameObjectId];
      if (obj.children?.items?.includes(item.id as any)) {
        // Item is a child - check parent accessibility based on capabilities
        const parentState = obj.state || { isOpen: false, isLocked: false, isBroken: false };

        // If parent is lockable and locked, child is hidden
        if (obj.capabilities?.lockable && parentState.isLocked) {
          isHiddenChild = true;
        }
        // If parent is breakable (and NOT openable), child hidden until broken
        else if (obj.capabilities?.breakable && !obj.capabilities?.openable && !parentState.isBroken) {
          isHiddenChild = true;
        }
        // If parent is a container
        else if (obj.capabilities?.container) {
          // If container is NOT openable, children are hidden until revealed (e.g., via examination)
          if (!obj.capabilities?.openable) {
            isHiddenChild = true;
          }
          // If container IS openable, children hidden if not open
          else if (!parentState.isOpen) {
            isHiddenChild = true;
          }
        }

        break;
      }
    }

    world[item.id] = {
      isVisible: !isHiddenChild, // Visible if not a hidden child (parent is open/unlocked)
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
  // NEW: Initialize Parent-Child Relationships from Cartridge
  // ============================================================================
  // Set up parent-child relationships based on children property in cartridge
  for (const gameObjectId in game.gameObjects) {
    const gameObject = game.gameObjects[gameObjectId as GameObjectId];

    if (gameObject.children) {
      // Initialize containedEntities array for parent
      if (!world[gameObject.id]) world[gameObject.id] = {};
      world[gameObject.id].containedEntities = [];

      // Add child objects
      if (gameObject.children.objects) {
        for (const childId of gameObject.children.objects) {
          // Add child to parent's containedEntities
          world[gameObject.id].containedEntities!.push(childId);

          // Set parent on child
          if (!world[childId]) world[childId] = {};
          world[childId].parentId = gameObject.id;
        }
      }

      // Add child items
      if (gameObject.children.items) {
        for (const childId of gameObject.children.items) {
          // Add child to parent's containedEntities
          world[gameObject.id].containedEntities!.push(childId);

          // Set parent on child
          if (!world[childId]) world[childId] = {};
          world[childId].parentId = gameObject.id;
        }
      }
    }
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
  const initialState: PlayerState = {
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

    // NEW: Focus system - set starting focus from chapter
    currentFocusId: startChapter.startingFocus?.entityId,
    focusType: startChapter.startingFocus?.entityType,

    stories: {},
    activeConversationWith: null,
    interactingWithObject: null,
  };

  // Only add previousFocusId if it's not undefined (Firestore doesn't accept undefined)
  if (startChapter.startingFocus?.previousEntityId !== undefined) {
    initialState.previousFocusId = startChapter.startingFocus.previousEntityId;
  }

  return initialState;
}
