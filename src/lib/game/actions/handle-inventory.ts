
'use server';

import type { CommandResult } from "@/lib/game/types";
import type { Game, PlayerState } from "@/lib/game/types";
import { createMessage } from "@/lib/game/actions/process-effects";

export async function handleInventory(state: PlayerState, game: Game): Promise<CommandResult> {
    if (state.inventory.length === 0) {
        return { newState: state, messages: [createMessage('system', 'System', 'Your inventory is empty.')] };
    }
    const itemNames = state.inventory.map(id => {
        const item = game.items[id];
        if (item) return `• ${item.name}`;
        return null;
    }).filter(Boolean).join('\n');
    return { newState: state, messages: [createMessage('system', 'System', `You are carrying:\n${itemNames}`)] };
}
