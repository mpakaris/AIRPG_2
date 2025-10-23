
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";
import { handleRead } from "./handle-read";

export async function handleOpen(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
    const location = game.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    const normalizedTargetName = normalizeName(targetName);

    // First, try to find a GameObject with that name
    const targetObjectId = location.objects.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, state, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${normalizedTargetName}" to open.`)] };
        }
        
        if (liveObject.state.isLocked) {
            let lockMessage = liveObject.gameLogic.fallbackMessages?.locked || "It's locked.";
            if (liveObject.gameLogic.input?.hint) {
                lockMessage += `\n\n${liveObject.gameLogic.input.hint}`;
            }
            return { newState: state, messages: [createMessage('narrator', narratorName, lockMessage)] };
        }

        if (liveObject.state.isOpen) {
            const alreadyOpenMessage = liveObject.gameLogic.handlers.onExamine?.alternateMessage || "It's already open.";
            return { newState: state, messages: [createMessage('narrator', narratorName, alreadyOpenMessage)] };
        }
        
        if (!liveObject.gameLogic.capabilities.openable) {
            return { newState: state, messages: [createMessage('narrator', narratorName, `You can't open the ${liveObject.gameLogic.name}.`)] };
        }

        const onOpen = liveObject.gameLogic.handlers.onOpen;

        if (!onOpen || !onOpen.success || !onOpen.success.effects) {
            const genericOpenMessage = `You open the ${liveObject.gameLogic.name}.`;
            const newState = { ...state, objectStates: { ...state.objectStates, [liveObject.gameLogic.id]: { ...liveObject.state, isOpen: true } } };
            return { newState, messages: [createMessage('narrator', narratorName, genericOpenMessage)] };
        }
        
        const result = processEffects(state, onOpen.success.effects || [], game);
        
        const hasMessageEffect = onOpen.success.effects.some(a => a.type === 'SHOW_MESSAGE');
        if (!hasMessageEffect) {
            result.messages.unshift(createMessage('narrator', narratorName, onOpen.success.message));
        }
        
        return result;
    }

    // If no GameObject was found, try to find an Item (like a book)
    const itemToOpen = findItemInContext(state, game, normalizedTargetName);
    if (itemToOpen) {
        // Safely check if the item is readable before calling handleRead
        if (itemToOpen.capabilities && itemToOpen.capabilities.isReadable) {
            return handleRead(state, targetName, game);
        } else {
            return { newState: state, messages: [createMessage('narrator', narratorName, `You can't "open" the ${itemToOpen.name} in that way.`)] };
        }
    }

    // If neither an object nor an item was found
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${normalizedTargetName}" to open.`)] };
}
