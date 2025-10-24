

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject, getLiveItem } from "./helpers";
import { createMessage } from "./process-effects";
import { normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
    let newState = { ...state, flags: [...state.flags] };
    const normalizedTargetName = normalizeName(targetName);
    const narratorName = "Narrator";

    if (!normalizedTargetName) {
        return { newState: state, messages: [createMessage('system', 'System', `You need to specify what to examine.`)] };
    }
    
    // --- CORRECTED LOGIC ---
    // Get the dynamic list of visible objects from the player's state, not the static game data.
    const visibleObjectIds = newState.locationStates[newState.currentLocationId]?.objects || [];

    // Try to find an object in the location first
    const targetObjectId = visibleObjectIds.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, newState, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }
        
        let messageContent: string;
        
        // --- State-based description from stateMap ---
        if (liveObject.gameLogic.stateMap && liveObject.state.currentStateId && liveObject.gameLogic.stateMap[liveObject.state.currentStateId]) {
            messageContent = liveObject.gameLogic.stateMap[liveObject.state.currentStateId].description || liveObject.gameLogic.description;
        } else {
            // --- Legacy description logic ---
            const flag = examinedObjectFlag(liveObject.gameLogic.id);
            const isAlreadyExamined = newState.flags.includes(flag as any);
            const onExamine = liveObject.gameLogic.handlers.onExamine;

            if (isAlreadyExamined && onExamine?.alternateMessage) {
                messageContent = onExamine.alternateMessage;
            } else if (onExamine?.success.message) {
                messageContent = onExamine.success.message;
            } else {
                messageContent = liveObject.gameLogic.description;
            }
        }
        
        const mainMessage = createMessage(
            'narrator',
            narratorName,
            messageContent,
            'image',
            { id: liveObject.gameLogic.id, game, state: newState, showEvenIfExamined: false }
        );
        
        // Set the 'examined' flag if it's the first time
        const flag = examinedObjectFlag(liveObject.gameLogic.id);
        if (!newState.flags.includes(flag as any)) {
            newState.flags.push(flag as any);
        }
        
        return { newState, messages: [mainMessage] };
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

        return { newState, messages: [message] };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}
