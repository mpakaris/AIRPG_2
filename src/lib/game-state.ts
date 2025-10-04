import type { Game, PlayerState, Flag } from './game/types';

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
    // DEPRECATED state, will be removed later
    notebookInteractionState: 'start',
    hasTalkedToBarista: false,
    hasReceivedBusinessCard: false,
    hasSeenNotebookUrl: false,
    hasUnlockedNotebook: false,
  };
}
