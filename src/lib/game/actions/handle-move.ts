
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { createMessage, processActions } from "./process-actions";

export function handleMove(state: PlayerState, targetName: string, game: Game): CommandResult {
    const location = game.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();

    const targetObjectId = location.objects.find(id =>
        game.gameObjects[id]?.name.toLowerCase().includes(normalizedTargetName)
    );

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to move.`)] };
    }

    const liveObject = getLiveGameObject(targetObjectId, state, game);
    if (!liveObject) {
         return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to move.`)] };
    }
    
    if (!liveObject.gameLogic.capabilities.movable) {
        const cantMoveMessage = liveObject.gameLogic.fallbackMessages?.notMovable || `You can't move the ${liveObject.gameLogic.name}.`;
        return { newState: state, messages: [createMessage('narrator', narratorName, cantMoveMessage)] };
    }

    const onMoveHandler = liveObject.gameLogic.handlers.onMove;

    if (!onMoveHandler) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `You move the ${liveObject.gameLogic.name} around, but find nothing of interest.`)] };
    }

    // Check conditions
    const conditionsMet = (onMoveHandler.conditions || []).every(cond => {
        if (cond.type === 'HAS_FLAG') {
            return state.flags.includes(cond.targetId as any);
        }
        // Add other condition types as needed
        return true;
    });

    if (conditionsMet) {
        const result = processActions(state, onMoveHandler.success.actions || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, onMoveHandler.success.message));
        return result;
    } else {
        return { newState: state, messages: [createMessage('narrator', narratorName, onMoveHandler.fail.message)] };
    }
}
