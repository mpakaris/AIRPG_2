/**
 * handle-go - NEW ARCHITECTURE
 *
 * Handles moving between locations.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, Location, PlayerState, ChapterId, Flag, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { GameStateManager } from "@/lib/game/engine";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { normalizeName } from "@/lib/utils";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;

/**
 * Helper to find which location contains a specific object or item
 */
function findLocationContaining(entityId: GameObjectId | ItemId, entityType: 'object' | 'item', game: Game): Location | undefined {
    for (const location of Object.values(game.locations)) {
        if (entityType === 'object' && location.gameObjects?.includes(entityId as GameObjectId)) {
            return location;
        }
        if (entityType === 'item' && location.items?.includes(entityId as ItemId)) {
            return location;
        }
    }
    return undefined;
}

/**
 * Helper to find parent object if entity is a child
 */
function findParentObject(entityId: GameObjectId | ItemId, game: Game): GameObjectId | undefined {
    for (const [parentId, parentObj] of Object.entries(game.gameObjects)) {
        if (parentObj.children?.objects?.includes(entityId as GameObjectId) ||
            parentObj.children?.items?.includes(entityId as ItemId)) {
            return parentId as GameObjectId;
        }
    }
    return undefined;
}

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
                const message = await MessageExpander.static(game.systemMessages.noNextChapter);
                return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
            }
        } else {
            const message = await MessageExpander.static(game.systemMessages.chapterIncomplete(chapter.goal, currentLocation.name));
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: message
            }];
        }
    }

    // Find target location by name
    let targetLocation: Location | undefined;
    targetLocation = Object.values(game.locations).find(loc => loc.name.toLowerCase() === targetName);

    if (targetLocation) {
        return [
            { type: 'MOVE_TO_LOCATION', toLocationId: targetLocation.locationId },
            { type: 'END_CONVERSATION' },
            { type: 'END_INTERACTION' },
            { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(targetLocation.name) },
            createLocationMessage(targetLocation)
        ];
    }

    // If not a location, try to find as an object or item
    const normalizedTargetName = normalizeName(targetName);
    const bestMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: true,
        searchObjects: true,
        requireFocus: false  // Don't require focus for "go to" command
    });

    if (bestMatch) {
        let entityId = bestMatch.id as GameObjectId | ItemId;
        let entityType: 'object' | 'item' = bestMatch.category === 'object' ? 'object' : 'item';

        // If it's a child entity, find the parent object
        const parentId = findParentObject(entityId, game);
        if (parentId) {
            entityId = parentId;
            entityType = 'object';
        }

        // Find which location contains this entity
        const locationWithEntity = findLocationContaining(entityId, entityType, game);

        if (locationWithEntity) {
            const effects: Effect[] = [
                { type: 'MOVE_TO_LOCATION', toLocationId: locationWithEntity.locationId },
                { type: 'END_CONVERSATION' },
                { type: 'END_INTERACTION' },
                { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(locationWithEntity.name) },
                createLocationMessage(locationWithEntity)
            ];

            // If it's an object (not an item), set focus on it
            if (entityType === 'object') {
                const targetObject = game.gameObjects[entityId as GameObjectId];
                if (targetObject) {
                    effects.push({
                        type: 'SET_FOCUS',
                        focusId: entityId as GameObjectId,
                        focusType: 'object'
                    });
                }
            }

            return effects;
        }
    }

    const message = await MessageExpander.static(game.systemMessages.cannotGoThere);
    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
}