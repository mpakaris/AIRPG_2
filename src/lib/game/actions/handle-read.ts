
/**
 * handle-read - NEW ARCHITECTURE
 *
 * Handles reading items (documents, books, etc.).
 * Supports stateMap for progressive content.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, GameStateManager, VisibilityResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<Effect[]> {
    const agentName = game.narratorName || "Agent Sharma";
    const normalizedItemName = normalizeName(itemName);

    if (!normalizedItemName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'You need to specify what to read.'
        }];
    }

    // Helper function to check if name matches (including alternateNames and ID)
    const matchesName = (item: any, searchName: string): boolean => {
        // Try matching against the item name
        if (normalizeName(item.name).includes(searchName)) return true;

        // Try matching against alternate names
        if (item.alternateNames) {
            const matchesAlt = item.alternateNames.some((altName: string) =>
                normalizeName(altName).includes(searchName)
            );
            if (matchesAlt) return true;
        }

        // FALLBACK: Try matching against the item ID (for AI mistakes)
        // Check if searchName matches the item ID exactly or partially
        const itemIdNormalized = normalizeName(item.id);
        if (itemIdNormalized === searchName || itemIdNormalized.includes(searchName) || searchName.includes(itemIdNormalized)) {
            return true;
        }

        // Also try without the prefix and underscores
        const idWithoutPrefix = item.id.replace(/^item_/, '').replace(/_/g, '').toLowerCase();
        const searchWithoutPrefix = searchName.replace(/^item_/, '').replace(/_/g, '');
        if (idWithoutPrefix === searchWithoutPrefix || idWithoutPrefix.includes(searchWithoutPrefix) || searchWithoutPrefix.includes(idWithoutPrefix)) {
            return true;
        }

        return false;
    };

    // 1. Find item in inventory OR visible entities
    let itemId = state.inventory.find(id =>
        matchesName(game.items[id], normalizedItemName)
    );

    // If not in inventory, check visible entities
    if (!itemId) {
        const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
        itemId = visibleEntities.items.find(id =>
            matchesName(game.items[id as any], normalizedItemName)
        );
    }

    if (!itemId) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${itemName}" to read here.`
        }];
    }

    const itemToRead = game.items[itemId];
    if (!itemToRead) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${itemName}" to read here.`
        }];
    }

    // 2. Check if readable
    if (!itemToRead.capabilities?.isReadable) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `There's nothing to read on the ${itemToRead.name}.`
        }];
    }

    // 3. Check for stateMap (progressive content)
    if (itemToRead.stateMap && Object.keys(itemToRead.stateMap).length > 0) {
        const entityState = GameStateManager.getEntityState(state, itemId);
        const currentReadCount = entityState.readCount || 0;
        const stateMapKeys = Object.keys(itemToRead.stateMap);

        // Check if all content has been read
        if (currentReadCount >= stateMapKeys.length) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'agent',
                content: `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`
            }];
        }

        // Get current state entry
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = itemToRead.stateMap[currentStateKey];

        if (!stateMapEntry || !stateMapEntry.description) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: "You try to read it, but the text is illegible."
            }];
        }

        // Build effects: UPDATE STATE FIRST, then show message (so image shows "opened" state)
        return [
            {
                type: 'SET_ENTITY_STATE',
                entityId: itemId,
                patch: { readCount: currentReadCount + 1, currentStateId: 'opened' }
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: stateMapEntry.description,
                messageType: 'image',
                imageId: itemId  // Will show "opened" image after state update
            }
        ];
    }

    // 4. Check for onRead handler
    const handler = HandlerResolver.getEffectiveHandler(itemToRead, 'read', state);
    if (handler?.success) {
        const effects: Effect[] = [];

        // Set state to 'opened' BEFORE showing message (for book/document images)
        if (itemToRead.archetype === 'Book' || itemToRead.archetype === 'Document') {
            effects.push({
                type: 'SET_ENTITY_STATE',
                entityId: itemId,
                patch: { currentStateId: 'opened' }
            });
        }

        if (handler.success.message) {
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: handler.success.message,
                messageType: 'image',
                imageId: itemId  // Will show "opened" image for books/documents
            });
        }

        if (handler.success.effects) {
            effects.push(...handler.success.effects);
        }

        return effects;
    }

    // 5. Fallback: just show description
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: itemToRead.description,
        messageType: 'image',
        imageId: itemId
    }];
}
