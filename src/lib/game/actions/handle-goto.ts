/**
 * handle-goto - NEW ARCHITECTURE
 *
 * Handles goto/moveto/shift commands to change focus without interacting.
 * This allows players to position themselves at objects/NPCs without examining/opening.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, NpcId, LocationId, ItemId } from "@/lib/game/types";
import { VisibilityResolver, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

/**
 * Helper to find which location contains a specific object or item
 */
function findLocationContaining(entityId: GameObjectId | ItemId, entityType: 'object' | 'item', game: Game): LocationId | undefined {
    for (const location of Object.values(game.locations)) {
        if (entityType === 'object' && location.gameObjects?.includes(entityId as GameObjectId)) {
            return location.locationId;
        }
        if (entityType === 'item' && location.items?.includes(entityId as ItemId)) {
            return location.locationId;
        }
    }
    return undefined;
}

/**
 * Helper to find parent object if entity is a child
 */
function findParentInGame(entityId: GameObjectId | ItemId, game: Game): GameObjectId | undefined {
    for (const [parentId, parentObj] of Object.entries(game.gameObjects)) {
        if (parentObj.children?.objects?.includes(entityId as GameObjectId) ||
            parentObj.children?.items?.includes(entityId as ItemId)) {
            return parentId as GameObjectId;
        }
    }
    return undefined;
}

export async function handleGoto(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    if (!targetName) {
        const message = await MessageExpander.static(game.systemMessages.needsTarget.goto);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // First try to find in current location (fast path)
    let match = FocusResolver.findEntity(targetName, state, game, {
        searchInventory: false,  // Can't "goto" items in inventory
        searchVisible: true,
        requireFocus: false      // Can goto anything visible
    });

    // If not found in current location, search globally across all locations
    let needsLocationChange = false;
    let targetLocationId: LocationId | undefined;

    if (!match) {
        const normalizedTargetName = normalizeName(targetName);
        const { matchesName } = await import('@/lib/game/utils/name-matching');

        // GLOBAL SEARCH: Manually search all objects across all locations
        let bestScore = 0;
        let bestObjectId: GameObjectId | undefined;
        let bestObjectLocationId: LocationId | undefined;

        // Search through all game objects
        for (const [objId, obj] of Object.entries(game.gameObjects)) {
            const matchResult = matchesName(obj, normalizedTargetName);

            if (matchResult.matches && matchResult.score > bestScore) {
                // Check if this object is in any location (or its parent is)
                const parentId = findParentInGame(objId as GameObjectId, game);
                const objectToLocate = parentId || (objId as GameObjectId);
                const locationId = findLocationContaining(objectToLocate, 'object', game);

                if (locationId) {
                    bestScore = matchResult.score;
                    bestObjectId = objId as GameObjectId;
                    bestObjectLocationId = locationId;
                }
            }
        }

        // NOTE: NPCs are NOT searched here because they are not zones/focus targets.
        // NPCs cannot be navigated to - only objects can be zone targets.
        // Players interact with NPCs through TALK command, not GO TO.

        if (bestObjectId && bestObjectLocationId) {
            // Found a match in another location
            match = {
                id: bestObjectId,
                type: 'object'
            };
            targetLocationId = bestObjectLocationId;

            if (targetLocationId !== state.currentLocationId) {
                needsLocationChange = true;
            }
        }
    }

    if (!match) {
        const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Get entity name for response - this is what the player REQUESTED
    let requestedEntityName: string;
    if (match.type === 'object') {
        const targetObject = game.gameObjects[match.id as GameObjectId];
        requestedEntityName = targetObject?.name || 'it';

        // Personal equipment (phone, badge, etc.) is always with you - can't "goto" it
        if (targetObject?.personal === true) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `${requestedEntityName} is already with you, Burt. You don't need to move to it - just use it directly.`
            }];
        }
    } else {
        // NPCs and items can't be "gone to"
        // NPCs should be interacted with via TALK command
        // Items should be examined or taken
        const message = await MessageExpander.static(game.systemMessages.cantDoThat);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Check if entity has a parent - if so, focus on parent instead
    // This handles cases like "go to SD Card" or "go to Hidden Door" where we want to focus on the container
    const { GameStateManager } = await import('@/lib/game/engine/GameStateManager');
    const parentId = GameStateManager.getParent(state, match.id);

    let targetFocusId = match.id;
    let targetFocusType: 'object' = 'object'; // Only objects can be focus targets

    if (parentId) {
        // Child entity - focus on parent instead (for engine purposes)
        // But keep the requested entity name for player messaging
        targetFocusId = parentId;
    }

    // Already at this focus?
    if (state.currentFocusId === targetFocusId) {
        const messages = [
            `You're already at ${requestedEntityName}, Burt.`,
            `You're standing right there, Burt.`,
            `You're already focused on ${requestedEntityName}.`,
            `You're at ${requestedEntityName} right now.`
        ];
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: messages[Math.floor(Math.random() * messages.length)]
        }];
    }

    // Set focus with transition message
    const effects: Effect[] = [];

    // If we need to change location, add location change effects first
    if (needsLocationChange && targetLocationId) {
        const targetLocation = game.locations[targetLocationId];
        if (targetLocation) {
            effects.push({
                type: 'MOVE_TO_LOCATION',
                toLocationId: targetLocationId
            });
            effects.push({
                type: 'END_CONVERSATION'
            });
            effects.push({
                type: 'END_INTERACTION'
            });
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: game.systemMessages.locationTransition(targetLocation.name)
            });
            // Add location scene description
            const locationEffect: Effect = {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: targetLocation.sceneDescription
            };
            if (targetLocation.sceneImage) {
                locationEffect.messageType = 'image';
                locationEffect.imageUrl = targetLocation.sceneImage.url;
                locationEffect.imageDescription = targetLocation.sceneImage.description;
                locationEffect.imageHint = targetLocation.sceneImage.hint;
            }
            effects.push(locationEffect);
        }
    }

    // Add visual indicator for "go to" action from cartridge
    if (game.systemMedia?.move) {
        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: '',
            messageType: 'image',
            imageUrl: game.systemMedia.move.url,
            imageDescription: game.systemMedia.move.description,
            imageHint: game.systemMedia.move.hint
        });
    }

    // Get transition narration - prefer the requested entity's narration if it exists
    let transitionMessage: string | undefined;
    if (parentId && match.type === 'object') {
        // Player requested a child entity - use child's transition narration if available
        const requestedObject = game.gameObjects[match.id as GameObjectId];
        if (requestedObject?.transitionNarration) {
            transitionMessage = requestedObject.transitionNarration;
        } else {
            // Fall back to parent's transition narration
            transitionMessage = FocusResolver.getTransitionNarration(targetFocusId, targetFocusType, state, game) || undefined;
        }
    } else {
        // Normal case - use the target's transition narration
        transitionMessage = FocusResolver.getTransitionNarration(targetFocusId, targetFocusType, state, game) || undefined;
    }

    effects.push({
        type: 'SET_FOCUS',
        focusId: targetFocusId,
        focusType: targetFocusType,
        transitionMessage
    });

    return effects;
}
