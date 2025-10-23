
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { createMessage } from "./process-effects";

export function handleInventory(state: PlayerState, game: Game): CommandResult {
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
