import type { Game, PlayerState } from './game/types';

export function getInitialState(game: Game): PlayerState {
  return {
    currentGameId: game.id,
    currentChapterId: game.startChapterId,
    currentLocationId: game.chapters[game.startChapterId].startLocationId,
    inventory: [],
    flags: [],
    objectStates: {},
    activeConversationWith: null,
    interactingWithObject: null,
    hasStartedFirstConversation: false,
    notebookInteractionState: 'start',
  };
}
