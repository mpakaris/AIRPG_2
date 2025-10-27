/**
 * handle-inventory - NEW ARCHITECTURE
 *
 * Handles displaying player inventory.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";

export async function handleInventory(state: PlayerState, game: Game): Promise<Effect[]> {
    if (state.inventory.length === 0) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'Your inventory is empty.'
        }];
    }

    const itemNames = state.inventory.map(id => {
        const item = game.items[id];
        if (item) return `• ${item.name}`;
        return null;
    }).filter(Boolean).join('\n');

    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `You are carrying:\n${itemNames}`
    }];
}