
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const normalizedItemName = normalizeName(itemName);
    const itemToRead = findItemInContext(state, game, normalizedItemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    const handler = itemToRead.handlers?.onRead;

    // --- BULLETPROOF SAFETY CHECK ---
    // This logic safely handles the handler, its success block, and its effects.
    if (handler && handler.success) {
        const successBlock = handler.success;
        
        // Safely get the effects array, defaulting to an empty array if it doesn't exist.
        // This permanently prevents the ".some()" crash.
        const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
        
        // Process any effects that do exist.
        const result = processEffects(state, effectsToProcess, game);
        
        // Check if any of the processed effects were of type SHOW_MESSAGE.
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        // If no SHOW_MESSAGE effect was processed, and a message string exists, show it.
        if (!hasMessageEffect && successBlock.message) {
            const message = createMessage('narrator', narratorName, successBlock.message);
            result.messages.unshift(message);
        }
        
        return result;
    }
    // --- END SAFETY CHECK ---

    // Fallback for items that are readable but have no specific onRead handler.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
