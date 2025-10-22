
import type { Game, PlayerState, Chapter, ChapterId, GameObjectId, GameObjectState, PortalState, PortalId } from './game/types';

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

  // Create a clean state for all portals
  const initialPortalStates: Record<PortalId, PortalState> = {};
  for (const portalId in game.portals) {
      const portal = game.portals[portalId as PortalId];
      initialPortalStates[portal.portalId] = {
          isLocked: portal.state.isLocked,
          isOpen: portal.state.isOpen,
      };
  }

  // Find the starting location, which could be a cell or a location
  const startChapter = game.chapters[game.startChapterId];
  if (!startChapter) {
      throw new Error(`Start chapter "${game.startChapterId}" not found in game data.`);
  }

  return {
    currentGameId: game.id,
    currentLocationId: startChapter.startLocationId,
    inventory: [],
    flags: [],
    objectStates: initialObjectStates,
    portalStates: initialPortalStates,
    stories: {},
    activeConversationWith: null,
    interactingWithObject: null,
    conversationCounts: {},
  };
}
