
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
    
    // Find the state-specific override handler, if it exists
    const handlerOverride = itemToRead.stateMap?.[currentStateId]?.overrides?.onRead;
    // Fallback to the base handler
    const baseHandler = itemToRead.handlers.onRead;

    // The effective handler is the override, or the base if no override exists for the current state.
    const effectiveHandler = handlerOverride || baseHandler;

    if (effectiveHandler) {
        // We always use the success block for 'onRead' in this model. Conditions can be added later.
        let result = processEffects(state, effectiveHandler.success.effects || [], game);
        
        let message;
        // Check if the handler provided a SHOW_MESSAGE effect
        const hasMessageEffect = Array.isArray(effectiveHandler.success.effects) && effectiveHandler.success.effects.some(e => e.type === 'SHOW_MESSAGE');
        if (!hasMessageEffect) {
            // If not, create one from the handler's message property
            const sender = (effectiveHandler.success as any).sender === 'agent' ? 'agent' : 'narrator';
            const senderName = sender === 'agent' ? game.narratorName || 'Agent' : 'Narrator';
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
