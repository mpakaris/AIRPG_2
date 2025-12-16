/**
 * handle-smell - Sensory Action Handler
 *
 * Handles smelling objects and examining them via scent.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { HandlerResolver, GameStateManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handleSmell(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    let normalizedTarget = normalizeName(targetName);

    // FALLBACK: If no target provided but player has focus, smell the focused object
    if (!normalizedTarget && state.focus?.focusId) {
        const focusedEntity = game.gameObjects[state.focus.focusId as any];
        if (focusedEntity) {
            normalizedTarget = normalizeName(focusedEntity.name);
        }
    }

    if (!normalizedTarget) {
        const message = await MessageExpander.static('What do you want to smell?');
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // LOCATION-AWARE SEARCH: Find best match (prioritizes current location)
    const bestMatch = findBestMatch(normalizedTarget, state, game, {
        searchInventory: true,
        searchVisibleItems: true,
        searchObjects: true,
        requireFocus: false
    });

    // SPRAWLING MODE: Check spatial distance for objects
    if (bestMatch?.category === 'object') {
        const objectId = bestMatch.id as GameObjectId;
        const obj = game.gameObjects[objectId];

        // Skip sprawling check for personal equipment
        if (!obj?.personal) {
            // SPECIAL CASE: If player is inside dumpster, they can smell children of dumpster
            const isInsideDumpster = GameStateManager.hasFlag(state, 'dumpster_climbed' as any);
            const isChildOfDumpster = obj?.parentId === 'obj_dumpster';

            const currentLocation = game.locations[state.currentLocationId];
            const spatialMode = currentLocation?.spatialMode || 'compact';

            // UNLESS the player is inside the dumpster and smelling a child of the dumpster
            if (spatialMode === 'sprawling' && state.currentFocusId !== objectId && !(isInsideDumpster && isChildOfDumpster)) {
                const message = await MessageExpander.static(
                    `The ${obj?.name || 'object'} is too far away to smell from here. You'll need to get closer.`
                );
                return [{
                    type: 'SHOW_MESSAGE',
                    speaker: 'narrator',
                    content: message
                }];
            }
        }
    }

    // Process the best match found
    if (bestMatch?.category === 'object') {
        const objectId = bestMatch.id as GameObjectId;
        const object = game.gameObjects[objectId];

        if (!object) {
            const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: message
            }];
        }

        // Try custom onSmell handler first
        const handler = HandlerResolver.getEffectiveHandler(object, 'smell', state, game);

        if (handler) {
            return buildEffectsFromOutcome(handler.success, state, game);
        }

        // Fallback: generic smell message or description
        const fallbackMessage = object.smellDescription || `You smell ${object.name}. Nothing unusual.`;
        const message = await MessageExpander.static(fallbackMessage);

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    // Not found
    const message = await MessageExpander.notVisible(game.systemMessages.notVisible, targetName);
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: message
    }];
}
