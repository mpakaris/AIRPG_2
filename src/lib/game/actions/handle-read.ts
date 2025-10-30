
/**
 * handle-read - NEW ARCHITECTURE
 *
 * Handles reading items (documents, books, etc.).
 * Supports stateMap for progressive content.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, GameStateManager, VisibilityResolver, Validator, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<Effect[]> {
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

    // 1. Find item in inventory OR visible entities (ITEMS first, then OBJECTS)
    let itemId = state.inventory.find(id =>
        matchesName(game.items[id], normalizedItemName)
    );

    let entityToRead: any = null;
    let entityId: string | undefined = itemId;
    let entityType: 'item' | 'object' = 'item';

    // If not in inventory, check visible entities (items)
    if (!itemId) {
        const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
        itemId = visibleEntities.items.find(id =>
            matchesName(game.items[id as any], normalizedItemName)
        );
        if (itemId) {
            entityId = itemId;
            entityToRead = game.items[itemId];
            entityType = 'item';
        }
    } else {
        entityToRead = game.items[itemId];
        entityType = 'item';
    }
    
    if (itemToRead.stateMap && Object.keys(itemToRead.stateMap).length > 0) {
        const itemState = state.itemStates[itemToRead.id] || { readCount: 0 };
        const currentReadCount = itemState.readCount || 0;
        const stateMapKeys = Object.keys(itemToRead.stateMap);

    // 2. Check if readable
    if (!entityToRead.capabilities?.readable && !entityToRead.capabilities?.isReadable) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `There's nothing to read on the ${entityToRead.name}.`
        }];
    }

    // 3. Check for stateMap (progressive content)
    if (entityToRead.stateMap && Object.keys(entityToRead.stateMap).length > 0) {
        const entityState = GameStateManager.getEntityState(state, entityId);
        const currentReadCount = entityState.readCount || 0;
        const stateMapKeys = Object.keys(entityToRead.stateMap);

        // Check if all content has been read
        if (currentReadCount >= stateMapKeys.length) {
            const deflectionMessage = `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`;
            return { newState: state, messages: [createMessage('agent', agentName, deflectionMessage)] };
        }

        // Get current state entry
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = entityToRead.stateMap[currentStateKey];

        if (!stateMapEntry || typeof stateMapEntry.description !== 'string') {
            return { newState: state, messages: [createMessage('narrator', narratorName, "You try to read it, but the text is illegible.")] };
        }
        
        const description = stateMapEntry.description;
        const message = createMessage('narrator', narratorName, description);

        const { newState } = await processEffects(state, [{ type: 'INCREMENT_ITEM_READ_COUNT', itemId: itemToRead.id }], game);
        
        return { newState, messages: [message] };
    }

    const handler = itemToRead.handlers?.onRead;
    if (handler && handler.success) {
        const effectsToProcess = Array.isArray(handler.success.effects) ? handler.success.effects : [];
        let result = await processEffects(state, effectsToProcess, game);
        
        if (handler.success.message) {
            const message = createMessage('narrator', narratorName, handler.success.message, 'text');
            result.messages.unshift(message);
        }
    }

    // 5. Fallback: just show description
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: entityToRead.description,
        messageType: 'image',
        imageId: entityId
    }];
}
