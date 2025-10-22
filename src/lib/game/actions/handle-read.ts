
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext } from "./helpers";
import { createMessage, processActions } from "./process-actions";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const itemToRead = findItemInContext(state, game, itemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    let newState = { ...state, flags: [...state.flags] };
    const flag = examinedObjectFlag(itemToRead.id);
    const isAlreadyRead = newState.flags.includes(flag as any);

    if (isAlreadyRead) {
        const alternateMessage = itemToRead.alternateDescription || `You've already read the ${itemToRead.name}.`;
        return { newState, messages: [createMessage('narrator', narratorName, alternateMessage)] };
    }

    if (itemToRead.handlers.onRead) {
        let result = processActions(state, itemToRead.handlers.onRead.success.actions || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, itemToRead.handlers.onRead.success.message));
        
        // Add the 'examined' flag after processing
        if (!result.newState.flags.includes(flag as any)) {
            result.newState.flags.push(flag as any);
        }
        
        return result;
    }

    // Fallback if no specific onRead handler, but the item is readable
    if (itemToRead.capabilities.isReadable) {
        if (!isAlreadyRead) {
            newState.flags.push(flag as any);
        }
        return { newState, messages: [createMessage('narrator', narratorName, itemToRead.description)] };
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
}
