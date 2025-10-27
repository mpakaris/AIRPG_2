
/**
 * handle-read - NEW ARCHITECTURE
 *
 * Handles reading items (documents, books, etc.).
 * Supports stateMap for progressive content.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, GameStateManager } from "@/lib/game/engine";
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

    // 1. Find item in inventory
    const itemId = state.inventory.find(id =>
        normalizeName(game.items[id]?.name).includes(normalizedItemName)
    );

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

        // Build effects: show message + increment read count
        return [
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: stateMapEntry.description
            },
            {
                type: 'SET_ENTITY_STATE',
                entityId: itemId,
                patch: { readCount: currentReadCount + 1 }
            }
        ];
    }

    // 4. Check for onRead handler
    const handler = HandlerResolver.getEffectiveHandler(itemToRead, 'read', state);
    if (handler?.success) {
        const effects: Effect[] = [];

        if (handler.success.message) {
            effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: handler.success.message
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
        content: itemToRead.description
    }];
}
