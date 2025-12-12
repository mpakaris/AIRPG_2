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
 * Helper to recursively check if an entity is a child (or nested child) of any object
 */
function isChildOfAnyObject(entityId: GameObjectId | ItemId, searchObjects: GameObjectId[], game: Game): boolean {
    for (const objectId of searchObjects) {
        const obj = game.gameObjects[objectId];
        if (!obj) continue;

        // Check direct children
        if (obj.children?.objects?.includes(entityId as GameObjectId) ||
            obj.children?.items?.includes(entityId as ItemId)) {
            return true;
        }

        // Recursively check nested children (e.g., tire_stack → alley → location)
        if (obj.children?.objects && obj.children.objects.length > 0) {
            if (isChildOfAnyObject(entityId, obj.children.objects, game)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Helper to find which location contains a specific object or item
 * Supports nested children (e.g., tire_stack inside side_alley inside loc_street)
 */
function findLocationContaining(entityId: GameObjectId | ItemId, entityType: 'object' | 'item', game: Game): Location | undefined {
    for (const location of Object.values(game.locations)) {
        // Check direct children of location (existing behavior - preserves Cartridge 0)
        if (entityType === 'object' && location.objects?.includes(entityId as GameObjectId)) {
            return location;
        }
        if (entityType === 'item' && location.items?.includes(entityId as ItemId)) {
            return location;
        }

        // NEW: Check nested children for Cartridge 1's reveal system
        // (e.g., "go to pile of tires" when tires are children of side_alley)
        if (location.objects && isChildOfAnyObject(entityId, location.objects, game)) {
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
    // Strip ALL quotes that AI might have added (both surrounding and embedded)
    const cleanedTargetName = targetName.replace(/["']/g, '');
    console.log('[DEBUG GOTO] Original target:', targetName, '→ Cleaned:', cleanedTargetName);
    console.log('[DEBUG GOTO] Current focus:', { focusId: state.focus?.focusId, currentFocusId: state.currentFocusId });
    const normalizedTargetName = normalizeName(cleanedTargetName);
    const bestMatch = findBestMatch(normalizedTargetName, state, game, {
        searchInventory: false,
        searchVisibleItems: true,
        searchObjects: true,
        requireFocus: false  // Don't require focus for "go to" command
    });
    console.log('[DEBUG GOTO] findBestMatch result:', bestMatch);

    if (bestMatch) {
        let entityId = bestMatch.id as GameObjectId | ItemId;
        let entityType: 'object' | 'item' = bestMatch.category === 'object' ? 'object' : 'item';

        // NEW: Check if target is a child of another object
        const parentId = findParentObject(entityId, game);

        // Find which location contains this entity (supports nested children)
        const locationWithEntity = findLocationContaining(entityId, entityType, game);

        if (locationWithEntity) {
            const effects: Effect[] = [];
            const spatialMode = locationWithEntity.spatialMode || 'compact'; // Default to compact for backward compatibility

            // DEBUG: Log spatial navigation check
            console.log('[SPRAWLING DEBUG]', {
                entityId,
                parentId,
                spatialMode,
                currentFocus: state.focus?.focusId,
                locationId: locationWithEntity.locationId,
                checkResult: spatialMode === 'sprawling' && parentId && state.focus?.focusId !== parentId
            });

            // SPRAWLING LOCATION LOGIC: Require step-by-step navigation through parent hierarchy
            if (spatialMode === 'sprawling' && parentId) {
                // Player wants to navigate to a child object (e.g., tire_stack)
                // In sprawling mode, they must be at the parent first (e.g., side_alley)
                const currentFocus = state.currentFocusId || state.focus?.focusId;

                if (currentFocus !== parentId) {
                    // Not at parent - redirect to parent first
                    const parentObj = game.gameObjects[parentId];
                    const message = await MessageExpander.static(
                        `You need to get closer to the ${parentObj?.name || 'area'} first. Try: GO TO ${parentObj?.name?.toUpperCase() || 'PARENT'}`
                    );
                    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
                }

                // Player IS at parent - allow navigation to child
                // Continue to focus logic below (don't redirect to parent)
            }

            // COMPACT LOCATION LOGIC (default - Cartridge 0): Allow direct navigation to children
            // OR player is already at parent in sprawling mode - continue

            // Only do location transition if moving to a DIFFERENT location
            if (locationWithEntity.locationId !== state.currentLocationId) {
                effects.push(
                    { type: 'MOVE_TO_LOCATION', toLocationId: locationWithEntity.locationId },
                    { type: 'END_CONVERSATION' },
                    { type: 'END_INTERACTION' },
                    { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(locationWithEntity.name) },
                    createLocationMessage(locationWithEntity)
                );
            }

            // If it's an object (not an item), set focus on it
            if (entityType === 'object') {
                const targetObject = game.gameObjects[entityId as GameObjectId];
                if (targetObject) {
                    // In sprawling mode, always use the object's transitionNarration (don't filter out children)
                    // In compact mode, use FocusResolver which filters out children
                    let transitionMessage: string | null = null;

                    if (spatialMode === 'sprawling' && targetObject.transitionNarration) {
                        // Sprawling: children ARE spatially distant, use their narration
                        transitionMessage = targetObject.transitionNarration;
                    } else {
                        // Compact: use FocusResolver (filters out small items inside containers)
                        const { FocusResolver } = await import('@/lib/game/engine/FocusResolver');
                        transitionMessage = FocusResolver.getTransitionNarration(entityId as GameObjectId, 'object', state, game);
                    }

                    console.log('[DEBUG GOTO] Transition message:', transitionMessage);
                    console.log('[DEBUG GOTO] Spatial mode:', spatialMode);

                    effects.push({
                        type: 'SET_FOCUS',
                        focusId: entityId as GameObjectId,
                        focusType: 'object',
                        transitionMessage: transitionMessage || undefined
                    });
                }
            }

            return effects;
        }
    }

    const message = await MessageExpander.static(game.systemMessages.cannotGoThere);
    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
}