import type { Game, PlayerState, Chapter, ChapterId } from './game/types';

export function getInitialState(game: Game): PlayerState {
  const chapterKeys = Object.keys(game.chapters);
  let startChapter: Chapter | undefined = game.chapters[game.startChapterId];
  let startChapterId = game.startChapterId;

  // If the specified start chapter doesn't exist, fall back to the first one.
  if (!startChapter && chapterKeys.length > 0) {
    startChapterId = chapterKeys[0] as ChapterId;
    startChapter = game.chapters[startChapterId];
  }

  if (!startChapter) {
    throw new Error("No chapters found in the game cartridge. Cannot initialize state.");
  }
  
  // Create a clean state. This will be called on every page refresh.
  const initialObjectStates = {};
  for (const chapterId in game.chapters) {
      const chapter = game.chapters[chapterId as ChapterId];
      for (const gameObjectId in chapter.gameObjects) {
          const gameObject = chapter.gameObjects[gameObjectId as keyof typeof chapter.gameObjects];
           initialObjectStates[gameObject.id] = {
               isLocked: typeof gameObject.isLocked === 'boolean' ? gameObject.isLocked : false,
               items: gameObject.items || [],
           };
      }
  }

  return {
    currentGameId: game.id,
    currentChapterId: startChapterId,
    currentLocationId: startChapter.startLocationId,
    inventory: [],
    flags: [],
    objectStates: initialObjectStates,
    activeConversationWith: null,
    interactingWithObject: null,
  };
}
