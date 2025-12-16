/**
 * handle-climb - Physical Action Handler
 *
 * Handles climbing into/onto objects (e.g., dumpster, ladder, box).
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { HandlerResolver, GameStateManager } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handleClimb(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    let normalizedTarget = normalizeName(targetName);

    // FALLBACK: If no target provided but player has focus, climb the focused object
    if (!normalizedTarget && state.focus?.focusId) {
        const focusedEntity = game.gameObjects[state.focus.focusId as any];
        if (focusedEntity) {
            normalizedTarget = normalizeName(focusedEntity.name);
        }
    }

    if (!normalizedTarget) {
        const message = await MessageExpander.static('What do you want to climb?');
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Parse "climb in/into/onto X" patterns
    const cleanTarget = normalizedTarget
        .replace(/^(in|into|onto|on|up)\s+/, '')
        .replace(/\s+(in|into|onto|on|up)$/, '');

    // LOCATION-AWARE SEARCH: Find best match
    const bestMatch = findBestMatch(cleanTarget, state, game, {
        searchInventory: false,  // Can't climb inventory items
        searchVisibleItems: false,
        searchObjects: true,
        requireFocus: false
    });

    // SPRAWLING MODE: Check spatial distance for objects
    if (bestMatch?.category === 'object') {
        const objectId = bestMatch.id as GameObjectId;
        const obj = game.gameObjects[objectId];

        if (!obj?.personal) {
            // SPECIAL CASE: If player is inside dumpster, they can climb children of dumpster
            const isInsideDumpster = GameStateManager.hasFlag(state, 'dumpster_climbed' as any);
            const isChildOfDumpster = obj?.parentId === 'obj_dumpster';

            const currentLocation = game.locations[state.currentLocationId];
            const spatialMode = currentLocation?.spatialMode || 'compact';

            // UNLESS the player is inside the dumpster and climbing a child of the dumpster
            if (spatialMode === 'sprawling' && state.currentFocusId !== objectId && !(isInsideDumpster && isChildOfDumpster)) {
                const message = await MessageExpander.static(
                    `The ${obj?.name || 'object'} is too far away. You'll need to get closer first.`
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

        // Try custom onClimb handler
        const handler = HandlerResolver.getEffectiveHandler(object, 'climb', state, game);

        if (handler) {
            return buildEffectsFromOutcome(handler.success, state, game);
        }

        // No climb handler - not climbable
        const message = await MessageExpander.static(
            `You can't climb ${normalizedTarget.includes('in') ? 'into' : 'onto'} the ${object.name}.`
        );
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
