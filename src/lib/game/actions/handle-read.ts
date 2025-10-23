
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
import { createMessage, processEffects } from "./process-effects";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const itemToRead = findItemInContext(state, game, itemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    const liveItem = getLiveItem(itemToRead.id, state, game);
    if (!liveItem) {
        // Should not happen if findItemInContext works
        return { newState: state, messages: [createMessage('system', 'System', 'Error finding item state.')] };
    }

    const currentStateId = liveItem.state.currentStateId || 'default';
    const handlerOverride = itemToRead.stateMap?.[currentStateId]?.overrides?.onRead;
    const baseHandler = itemToRead.handlers?.onRead;
    const effectiveHandler = handlerOverride || baseHandler;

    if (effectiveHandler?.success) { 
        const successBlock = effectiveHandler.success;
        const effectsToProcess = successBlock.effects || [];
        
        let result = processEffects(state, effectsToProcess, game);
        
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        if (!hasMessageEffect && successBlock.message) {
            const sender = (successBlock as any).sender === 'agent' ? 'agent' : 'narrator';
            const senderName = sender === 'agent' ? (game.narratorName || 'Agent') : narratorName;
            
            const message = createMessage(
                sender,
                senderName,
                successBlock.message,
                'text'
            );
            result.messages.unshift(message);
        }
        
        return result;
    }
    
    // Fallback for readable items without complex handlers, now uses description as content.
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
