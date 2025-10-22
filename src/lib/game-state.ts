import type { Game, PlayerState, Chapter, ChapterId, GameObjectId } from './game/types';

export function getInitialState(game: Game): PlayerState {
  const chapterKeys = Object.keys(game.chapters);
  let startChapterId = game.startChapterId;
  let startChapter: Chapter | undefined = game.chapters[startChapterId];

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
      if (chapter && chapter.gameObjects) {
        for (const gameObjectId in chapter.gameObjects) {
            const gameObject = chapter.gameObjects[gameObjectId as GameObjectId];
             initialObjectStates[gameObject.id] = {
                 isLocked: typeof gameObject.isLocked === 'boolean' ? gameObject.isLocked : false,
                 isOpen: typeof gameObject.isOpenable === 'boolean' ? !gameObject.isLocked : false, // Default to open if not lockable
                 items: gameObject.items ? [...gameObject.items] : [], // Correctly copy initial items
             };
        }
      }
  }

  return {
    currentGameId: game.id,
    currentChapterId: startChapterId,
    currentLocationId: startChapter.startLocationId,
    inventory: [],
    flags: [],
    objectStates: initialObjectStates,
    stories: {},
    activeConversationWith: null,
    interactingWithObject: null,
    conversationCounts: {},
  };
}
