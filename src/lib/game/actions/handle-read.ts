
import { CommandResult } from "@/app/actions";
import type { Game, Item, PlayerState } from "../types";
import { findItemInContext, getLiveItem } from "./helpers";
import { createMessage, processEffects } from "./process-effects";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const itemToRead = findItemInContext(state, game, itemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (!itemToRead.capabilities.isReadable) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
    }

    // --- State-driven Handler Logic ---
    const liveItem = getLiveItem(itemToRead.id, state, game);
    const currentStateId = liveItem.state.currentStateId || 'default';
    
    const handlerOverride = itemToRead.stateMap?.[currentStateId]?.overrides?.onRead;
    const baseHandler = itemToRead.handlers.onRead;

    const effectiveHandler = handlerOverride || baseHandler;

    if (effectiveHandler?.success) { // Safely check for handler and success block
        const effectsToProcess = effectiveHandler.success.effects || [];
        let result = processEffects(state, effectsToProcess, game);
        
        let message;
        const hasMessageEffect = effectsToProcess.some(e => e.type === 'SHOW_MESSAGE');
        
        if (!hasMessageEffect && effectiveHandler.success.message) {
            // Safely determine the sender, defaulting to 'narrator'
            const sender = (effectiveHandler.success as any).sender === 'agent' ? 'agent' : 'narrator';
            const senderName = sender === 'agent' ? (game.narratorName || 'Agent') : narratorName;
            
            message = createMessage(
                sender,
                senderName,
                effectiveHandler.success.message,
                'text'
            );
            result.messages.unshift(message);
        }
        
        return result;
    }
    
    // Fallback for readable items without complex handlers
    return { newState: state, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
}
