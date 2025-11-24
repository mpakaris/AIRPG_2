/**
 * handle-inventory - NEW ARCHITECTURE
 *
 * Handles displaying player inventory.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handleInventory(state: PlayerState, game: Game): Promise<Effect[]> {
    // CARTRIDGE-DRIVEN: All content comes from game.systemMessages
    if (state.inventory.length === 0) {
        const message = await MessageExpander.static(game.systemMessages.inventoryEmpty);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    const itemNames = state.inventory.map(id => {
        const item = game.items[id];
        if (item) return `• ${item.name}`;
        return null;
    }).filter(Boolean).join('\n');

    // Keep inventoryList static (it's a formatted list)
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: game.systemMessages.inventoryList(itemNames)
    }];
}