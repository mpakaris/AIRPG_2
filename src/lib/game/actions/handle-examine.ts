
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage } from "./process-actions";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
    const location = game.locations[state.currentLocationId];
    let newState = { ...state, flags: [...state.flags] };
    const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();
    const narratorName = game.narratorName || "Narrator";

    // Try to find an object in the location first
    const targetObjectId = location.objects.find(id =>
        game.gameObjects[id]?.name.toLowerCase().includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, newState, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }
        const flag = examinedObjectFlag(liveObject.gameLogic.id);
        const isAlreadyExamined = newState.flags.includes(flag as any);
        
        let messageContent: string;
        const onExamine = liveObject.gameLogic.handlers.onExamine;

        if (isAlreadyExamined && onExamine?.alternateMessage) {
            messageContent = onExamine.alternateMessage;
        } else if (onExamine?.success.message) {
            messageContent = onExamine.success.message;
        } else {
            messageContent = `You examine the ${liveObject.gameLogic.name}.`;
        }
        
        const mainMessage = createMessage(
            'narrator',
            narratorName,
            messageContent,
            'image',
            { id: liveObject.gameLogic.id, game, state: newState, showEvenIfExamined: false }
        );
        
        if (!isAlreadyExamined) {
            newState.flags.push(flag as any);
        }
        
        return { newState, messages: [mainMessage] };
    }

    // If not an object, try to find an item in inventory or in an open container
    const itemInContext = findItemInContext(newState, game, targetName);
    if (itemInContext) {
        const flag = examinedObjectFlag(itemInContext.id);
        const isAlreadyExamined = newState.flags.includes(flag as any);
        
        const messageText = isAlreadyExamined && itemInContext.alternateDescription
            ? itemInContext.alternateDescription
            : itemInContext.description;

        const message = createMessage(
            'narrator', 
            narratorName, 
            messageText,
            'image',
            { id: itemInContext.id, game, state: newState, showEvenIfExamined: false }
        );
        
        if (!isAlreadyExamined) {
            newState.flags.push(flag as any);
        }

        return { newState, messages: [message] };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}
