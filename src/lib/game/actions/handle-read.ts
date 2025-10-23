
'use server';

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
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

    // --- BULLETPROOF SAFETY CHECKS ---
    // This block safely navigates the handler structure to prevent crashes.
    if (handler && handler.success) {
        const successBlock = handler.success;
        
        // Safely check for an effects array before processing. Default to an empty array if missing.
        const effectsToProcess = Array.isArray(successBlock.effects) ? successBlock.effects : [];
        let result = processEffects(state, effectsToProcess, game);
        
        // Check if there was an explicit SHOW_MESSAGE effect.
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        // Only add a message if one wasn't already added by an effect and a message string exists.
        if (!hasMessageEffect && successBlock.message) {
            const message = createMessage('narrator', narratorName, successBlock.message, 'text');
            result.messages.unshift(message);
        }
        
        return result;
    }
    // --- END SAFETY CHECKS ---

    // Fallback for items that are readable but have no specific onRead handler or a malformed one.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
