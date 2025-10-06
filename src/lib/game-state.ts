import type { Game, PlayerState, Chapter } from './game/types';

export function getInitialState(game: Game): PlayerState {
  const chapterKeys = Object.keys(game.chapters);
  let startChapter: Chapter | undefined = game.chapters[game.startChapterId];
  let startChapterId = game.startChapterId;

  // If the specified start chapter doesn't exist, fall back to the first one.
  if (!startChapter && chapterKeys.length > 0) {
    startChapterId = chapterKeys[0] as typeof startChapterId;
    startChapter = game.chapters[startChapterId];
  }

  if (!startChapter) {
    throw new Error("No chapters found in the game cartridge. Cannot initialize state.");
  }
  
  return {
    currentGameId: game.id,
    currentChapterId: startChapterId,
    currentLocationId: startChapter.startLocationId,
    inventory: [],
    flags: [],
    objectStates: {},
    activeConversationWith: null,
    interactingWithObject: null,
  };
}
