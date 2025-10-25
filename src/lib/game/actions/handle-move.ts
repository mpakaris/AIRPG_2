
'use server';

import type { CommandResult, Game, PlayerState } from "@/lib/game/types";
import { getLiveGameObject } from "@/lib/game/actions/helpers";
import { createMessage, processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleMove(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
    const location = game.locations[state.currentLocationId];
    const narratorName = "Narrator";
    const normalizedTargetName = normalizeName(targetName);

    const targetObjectId = location.objects.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
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
        if (cond.type === 'NO_FLAG') {
            return !state.flags.includes(cond.targetId as any);
        }
        // Add other condition types as needed
        return true;
    });

    if (conditionsMet) {
        // Safety check for incomplete game data
        if (!onMoveHandler.success) {
            console.error(`ERROR: onMove handler for ${liveObject.gameLogic.id} is missing a 'success' block.`);
            return { newState: state, messages: [createMessage('narrator', narratorName, `You move the ${liveObject.gameLogic.name} around, but find nothing of interest.`)]};
        }
        const result = processEffects(state, onMoveHandler.success.effects || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, onMoveHandler.success.message));
        return result;
    } else {
        // Safety check for incomplete game data
        if (!onMoveHandler.fail) {
            console.error(`ERROR: onMove handler for ${liveObject.gameLogic.id} is missing a 'fail' block.`);
            return { newState: state, messages: [createMessage('system', 'System', 'Action failed due to incomplete game data.')]};
        }
        return { newState: state, messages: [createMessage('narrator', narratorName, onMoveHandler.fail.message)] };
    }
}
