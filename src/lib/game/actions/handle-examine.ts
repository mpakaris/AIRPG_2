
'use server';

import type { CommandResult } from "@/lib/game/types";
import type { Game, PlayerState } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject, getLiveItem } from "@/lib/game/actions/helpers";
import { createMessage } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleExamine(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
    let newState = { ...state, flags: [...state.flags] };
    const normalizedTargetName = normalizeName(targetName);
    const narratorName = "Narrator";

    if (!normalizedTargetName) {
        return { newState: state, messages: [createMessage('system', 'System', `You need to specify what to examine.`)] };
    }
    
    const visibleObjectIds = newState.locationStates[newState.currentLocationId]?.objects || [];

    const targetObjectId = visibleObjectIds.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, newState, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }
        
        let messageContent: string;
        let imageToDisplay = liveObject.gameLogic.media?.images?.default;

        const isInteracting = state.interactingWithObject === liveObject.gameLogic.id;

        const currentStateId = liveObject.state.currentStateId;
        const stateMapEntry = currentStateId ? liveObject.gameLogic.stateMap?.[currentStateId] : undefined;

        if (stateMapEntry) {
            if (isInteracting && stateMapEntry.overrides?.onExamine) {
                messageContent = stateMapEntry.overrides.onExamine.success.message;
            } else {
                messageContent = stateMapEntry.description || liveObject.gameLogic.description;
            }
            const stateImageKey = currentStateId.replace('unlocked_', '');
            if (liveObject.gameLogic.media?.images?.[stateImageKey]) {
                imageToDisplay = liveObject.gameLogic.media.images[stateImageKey];
            }
        } 
        else {
            const onExamine = liveObject.gameLogic.handlers.onExamine;
            if (isInteracting && onExamine?.success.message) {
                 messageContent = onExamine.success.message;
            } else {
                messageContent = liveObject.gameLogic.description;
            }
        }
        
        const mainMessage = createMessage(
            'narrator',
            narratorName,
            messageContent,
            imageToDisplay ? 'image' : 'text',
            imageToDisplay ? { id: liveObject.gameLogic.id, game, state: newState, showEvenIfExamined: true } : undefined
        );
        
        const flag = examinedObjectFlag(liveObject.gameLogic.id);
        if (!newState.flags.includes(flag as any)) {
            newState.flags.push(flag as any);
        }
        
        return { newState, messages: [mainMessage] };
    }

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
