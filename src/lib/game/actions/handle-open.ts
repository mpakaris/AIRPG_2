

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { createMessage, processActions } from "./process-actions";

export function handleOpen(state: PlayerState, targetName: string, game: Game): CommandResult {
    const location = game.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();

    const targetObjectId = location.objects.find(id =>
        game.gameObjects[id]?.name.toLowerCase().includes(normalizedTargetName)
    );

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to open.`)] };
    }

    const liveObject = getLiveGameObject(targetObjectId, state, game);
    if (!liveObject) {
         return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to open.`)] };
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

    if (!onOpen) {
        const genericOpenMessage = `You open the ${liveObject.gameLogic.name}.`;
        const newState = { ...state, objectStates: { ...state.objectStates, [liveObject.gameLogic.id]: { ...liveObject.state, isOpen: true } } };
        return { newState, messages: [createMessage('narrator', narratorName, genericOpenMessage)] };
    }
    
    // The `onOpen` handler is now responsible for setting the state via actions
    const result = processActions(state, onOpen.success.actions || [], game);
    
    // Prepend a default message if the handler doesn't provide one.
    const hasMessageAction = onOpen.success.actions?.some(a => a.type === 'SHOW_MESSAGE');
    if (!hasMessageAction) {
        result.messages.unshift(createMessage('narrator', narratorName, onOpen.success.message));
    }
    
    return result;
}
