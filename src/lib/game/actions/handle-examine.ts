

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject, getLiveItem } from "./helpers";
import { createMessage } from "./process-effects";
import { normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
    const location = game.locations[state.currentLocationId];
    let newState = { ...state, flags: [...state.flags] };
    const normalizedTargetName = normalizeName(targetName);
    const narratorName = game.narratorName || "Narrator";

    if (!normalizedTargetName) {
        return { newState: state, messages: [createMessage('system', 'System', `You need to specify what to examine.`)] };
    }

    // Try to find an object in the location first
    const targetObjectId = location.objects.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
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
        
        return { newState, messages: [createMessage('agent', narratorName, `Alright, I'm looking at the ${liveObject.gameLogic.name}.`), mainMessage] };
    }

    // If not an object, try to find an item in inventory or in an open container
    const itemInContext = findItemInContext(state, game, normalizedTargetName);
    if (itemInContext) {
        const liveItem = getLiveItem(itemInContext.id, state, game);
        if (!liveItem) {
             return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }

        const flag = examinedObjectFlag(liveItem.gameLogic.id);
        const isAlreadyExamined = newState.flags.includes(flag as any);
        
        // ** FIX: 'examine' now ONLY provides the physical description from the item itself **
        const messageText = isAlreadyExamined && liveItem.gameLogic.alternateDescription
            ? liveItem.gameLogic.alternateDescription
            : liveItem.gameLogic.description;

        const message = createMessage(
            'narrator', 
            narratorName, 
            messageText,
            'image',
            { id: liveItem.gameLogic.id, game, state: newState, showEvenIfExamined: false }
        );
        
        if (!isAlreadyExamined) {
            newState.flags.push(flag as any);
        }

        return { newState, messages: [createMessage('agent', narratorName, `Okay, let's check out the ${liveItem.gameLogic.name}.`), message] };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}
