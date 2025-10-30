/**
 * handle-go - NEW ARCHITECTURE
 *
 * Handles moving between locations.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, Location, PlayerState, ChapterId, Flag, Effect } from "@/lib/game/types";
import { GameStateManager } from "@/lib/game/engine";

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;

function checkChapterCompletion(state: PlayerState, game: Game): boolean {
    const chapter = game.chapters[game.startChapterId];
    const isAlreadyComplete = GameStateManager.hasFlag(state, chapterCompletionFlag(game.startChapterId));

    if (isAlreadyComplete || !chapter.objectives || chapter.objectives.length === 0) {
        return isAlreadyComplete;
    }

    const allObjectivesMet = chapter.objectives.every(obj => GameStateManager.hasFlag(state, obj.flag));
    return allObjectivesMet;
}

/**
 * Helper to create a location message effect with optional scene image (cartridge-driven)
 */
function createLocationMessage(location: Location): Effect {
  const effect: Effect = {
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: location.sceneDescription
  };

  // Add location image if defined in cartridge
  if (location.sceneImage) {
    effect.messageType = 'image';
    effect.imageUrl = location.sceneImage.url;
    effect.imageDescription = location.sceneImage.description;
    effect.imageHint = location.sceneImage.hint;
  }

  return effect;
}

export async function handleGo(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    const chapter = game.chapters[game.startChapterId];
    const currentLocation = game.locations[state.currentLocationId];
    targetName = targetName.toLowerCase();
    const narratorName = game.narratorName || "Narrator";

    // Handle chapter progression
    if (targetName === 'next_chapter') {
        const isComplete = checkChapterCompletion(state, game);

        if (isComplete) {
            const nextChapterId = chapter.nextChapter?.id;
            if (nextChapterId && game.chapters[nextChapterId]) {
                const nextChapter = game.chapters[nextChapterId];
                const newLocation = game.locations[nextChapter.startLocationId];

                return [
                    { type: 'MOVE_TO_LOCATION', locationId: nextChapter.startLocationId },
                    { type: 'END_CONVERSATION' },
                    { type: 'END_INTERACTION' },
                    { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.chapterTransition(nextChapter.title) },
                    createLocationMessage(newLocation)
                ];
            } else {
                return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.noNextChapter }];
            }
        } else {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: game.systemMessages.chapterIncomplete(chapter.goal, currentLocation.name)
            }];
        }
    }

    // Find target location by name
    let targetLocation: Location | undefined;
    targetLocation = Object.values(game.locations).find(loc => loc.name.toLowerCase() === targetName);

    if (targetLocation) {
        return [
            { type: 'MOVE_TO_LOCATION', locationId: targetLocation.locationId },
            { type: 'END_CONVERSATION' },
            { type: 'END_INTERACTION' },
            { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(targetLocation.name) },
            createLocationMessage(targetLocation)
        ];
    }

    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.cannotGoThere }];
}