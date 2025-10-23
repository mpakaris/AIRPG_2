
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
    // This block safely navigates the handler structure to prevent crashes.
    if (handler && handler.success) {
        const successBlock = handler.success;
        
        // Safely check for an effects array. Default to an empty array if it's missing.
        const effectsToProcess = (Array.isArray(successBlock.effects)) ? successBlock.effects : [];
        
        // Process any effects that do exist.
        const result = processEffects(state, effectsToProcess, game);
        
        // Check if one of the effects was a SHOW_MESSAGE.
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        // If no SHOW_MESSAGE effect was processed, and a message string exists in the handler, show it.
        // This is the primary path for simple read actions.
        if (!hasMessageEffect && successBlock.message) {
            const message = createMessage('narrator', narratorName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }
    // --- END SAFETY CHECK ---

    // Fallback for items that are readable but have no specific onRead handler or a malformed one.
    // This ensures the game never crashes and provides a default behavior.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
