

import type { Game, PlayerState, Chapter, ChapterId, GameObjectId, GameObjectState, PortalState, PortalId, NpcId, NpcState, LocationId, ItemId, ItemState } from './game/types';

export function getInitialState(game: Game): PlayerState {
  
  // Create a clean state for all game objects
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

  // Create a clean state for all portals
  const initialPortalStates: Record<PortalId, PortalState> = {};
  for (const portalId in game.portals) {
      const portal = game.portals[portalId as PortalId];
      initialPortalStates[portal.portalId] = {
          isLocked: portal.state.isLocked,
          isOpen: portal.state.isOpen,
      };
  }

  // Create a clean state for all NPCs
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

  // Find the starting location, which could be a cell or a location
  const startChapter = game.chapters[game.startChapterId];
  if (!startChapter) {
      throw new Error(`Start chapter "${game.startChapterId}" not found in game data.`);
  }

  return {
    currentGameId: game.id,
    currentChapterId: game.startChapterId,
    currentLocationId: startChapter.startLocationId,
    inventory: [],
    flags: [],
    objectStates: initialObjectStates,
    itemStates: initialItemStates,
    portalStates: initialPortalStates,
    npcStates: initialNpcStates,
    stories: {},
    activeConversationWith: null,
    interactingWithObject: null,
  };
}
