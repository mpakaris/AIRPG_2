import { CommandResult, createMessage } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext } from "./helpers";
import { processActions } from "./process-actions";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<CommandResult> {
    const narratorName = game.narratorName || "Narrator";
    const itemToRead = findItemInContext(state, game, itemName);

    if (!itemToRead) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to read.`)] };
    }

    if (itemToRead.handlers.onRead) {
        let result = processActions(state, itemToRead.handlers.onRead.success.actions || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, itemToRead.handlers.onRead.success.message));
        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `There's nothing to read on the ${itemToRead.name}.`)] };
}
