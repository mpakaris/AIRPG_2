/**
 * Gated Content Detector
 *
 * Detects when a player is trying to access game content that exists
 * but is currently blocked/gated (not yet revealed).
 *
 * Provides contextual feedback instead of generic "I don't understand" messages.
 */

import type { Game, PlayerState, GameObjectId, ItemId } from '@/lib/game/types';
import { normalizeName } from '@/lib/utils';
import { GameStateManager } from '@/lib/game/engine';

export interface GatedContentResult {
    isGated: boolean;
    entityId?: string;
    entityType?: 'object' | 'item' | 'npc';
    contextualMessage: string;
}

/**
 * Check if the player is trying to access gated/blocked content
 */
export function checkForGatedContent(
    playerInput: string,
    state: PlayerState,
    game: Game
): GatedContentResult {
    const normalizedInput = normalizeName(playerInput);

    // Extract potential entity names from player input
    const potentialEntityNames = extractEntityNames(normalizedInput);

    // Check each potential entity
    for (const entityName of potentialEntityNames) {
        // Check game objects
        for (const [objectId, gameObject] of Object.entries(game.gameObjects)) {
            // Check primary name
            const primaryNameMatch = normalizeName(gameObject.name) === entityName;

            // Check alternate names
            const alternateNamesMatch = gameObject.alternateNames?.some(
                altName => normalizeName(altName) === entityName
            );

            if (primaryNameMatch || alternateNamesMatch) {
                // Object exists in game - check if revealed
                const entityState = GameStateManager.getEntityState(state, objectId);

                // Entity is gated if revealedBy is undefined (not revealed yet)
                if (!entityState.revealedBy) {
                    // Found gated content!
                    return {
                        isGated: true,
                        entityId: objectId,
                        entityType: 'object',
                        contextualMessage: getContextualMessage(objectId, 'object', state, game)
                    };
                }
            }
        }

        // Check items
        for (const [itemId, item] of Object.entries(game.items)) {
            // Check primary name
            const primaryNameMatch = normalizeName(item.name) === entityName;

            // Check alternate names
            const alternateNamesMatch = item.alternateNames?.some(
                altName => normalizeName(altName) === entityName
            );

            if (primaryNameMatch || alternateNamesMatch) {
                const entityState = GameStateManager.getEntityState(state, itemId);

                // Entity is gated if revealedBy is undefined (not revealed yet)
                if (!entityState.revealedBy) {
                    return {
                        isGated: true,
                        entityId: itemId,
                        entityType: 'item',
                        contextualMessage: getContextualMessage(itemId, 'item', state, game)
                    };
                }
            }
        }
    }

    // Not gated - truly doesn't exist or is invalid
    return {
        isGated: false,
        contextualMessage: '' // Will use generic message
    };
}

/**
 * Extract potential entity names from player input
 * Examples:
 * - "check the drawer" → ["drawer"]
 * - "examine drawers" → ["drawers", "drawer"]
 * - "search the metal box" → ["metal box", "box"]
 */
function extractEntityNames(normalizedInput: string): string[] {
    const names: string[] = [];

    // Remove command verbs
    const withoutVerbs = normalizedInput
        .replace(/^(check|examine|look at|search|open|take|grab|use|read|move)\s+/, '')
        .replace(/^(the|a|an)\s+/, '');

    // Add the full remaining text
    if (withoutVerbs) {
        names.push(withoutVerbs);
    }

    // Also try singular/plural variations
    if (withoutVerbs.endsWith('s')) {
        names.push(withoutVerbs.slice(0, -1)); // "drawers" → "drawer"
    } else {
        names.push(withoutVerbs + 's'); // "drawer" → "drawers"
    }

    // Try extracting just the last word (for multi-word objects)
    const words = withoutVerbs.split(' ');
    if (words.length > 1) {
        names.push(words[words.length - 1]);
    }

    return names;
}

/**
 * Generate contextual message based on game state
 */
function getContextualMessage(
    entityId: string,
    entityType: 'object' | 'item',
    state: PlayerState,
    game: Game
): string {
    // Get entity details
    const entity = entityType === 'object'
        ? game.gameObjects[entityId as GameObjectId]
        : game.items[entityId as ItemId];

    if (!entity) return "You can't access that right now.";

    // Special case: Drawer in cafe
    if (entityId === 'obj_drawer' && state.currentLocationId === 'loc_cafe_interior') {
        // Check if manager or barista are present
        const location = game.locations[state.currentLocationId];
        const managerId = 'npc_cafe_manager' as any; // NPC ID
        const baristaId = 'npc_barista' as any; // NPC ID

        // Check if NPCs are in this location (visible)
        const managerVisible = location.npcs?.includes(managerId);
        const baristaVisible = location.npcs?.includes(baristaId);

        if (managerVisible || baristaVisible) {
            return "The manager is standing right at the counter. Searching the drawers would draw unwanted attention. Maybe if you come back later when they're not around, you'll have a chance to search thoroughly.";
        } else {
            return "You'll need to find a way to access the drawers first. Come back when the opportunity presents itself.";
        }
    }

    // Generic gated content message
    return `You can't access ${entity.name} right now. You might need to do something else first, or wait for the right moment.`;
}
