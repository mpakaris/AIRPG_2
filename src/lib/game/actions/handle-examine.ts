'use server';

import type { Game, PlayerState, CommandResult, GameObject, GameObjectState, Item, ItemId } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject, getLiveItem } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { normalizeName } from "@/lib/utils";


const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleExamine(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
    let newState = { ...state, flags: [...state.flags] };
    const normalizedTarget = normalizeName(targetName);
    const narratorName = "Narrator";

    if (!normalizedTarget) {
        return { newState: state, messages: [createMessage('system', 'System', `You need to specify what to examine.`)] };
    }
    
    // Check for item (in inventory or in an open container)
    const itemInContext = findItemInContext(state, game, normalizedTarget);
    if (itemInContext) {
        const liveItem = getLiveItem(itemInContext.id, state, game);
        if (!liveItem) {
             return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }

        const flag = examinedObjectFlag(liveItem.gameLogic.id);
        const isAlreadyExamined = newState.flags.includes(flag as any);
        
        let messageText = liveItem.gameLogic.description;
        const onExamineHandler = liveItem.gameLogic.handlers?.onExamine;

        if (onExamineHandler) {
            if (isAlreadyExamined && onExamineHandler.alternateMessage) {
                messageText = onExamineHandler.alternateMessage;
            } else if (onExamineHandler.success) {
                messageText = onExamineHandler.success.message;
            }
        } else if (isAlreadyExamined && liveItem.gameLogic.alternateDescription) {
            messageText = liveItem.gameLogic.alternateDescription;
        }

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
    
    // If not an item, check for a game object in the location
    const location = game.locations[state.currentLocationId];
    if (!location) return { newState: state, messages: [createMessage('system', 'System', `Error: Current location not found.`)] };
    
    const visibleObjectIds = state.locationStates[state.currentLocationId]?.objects || location.objects;
    const targetObjectId = visibleObjectIds.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTarget)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, newState, game);
        if (!liveObject) {
            return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
        }
        
        let messageContent: string;
        
        const isInteracting = state.interactingWithObject === liveObject.gameLogic.id;
        const flag = examinedObjectFlag(liveObject.gameLogic.id);
        const hasBeenExamined = newState.flags.includes(flag as any);
        const onExamineHandler = liveObject.gameLogic.handlers.onExamine;
        
        if (onExamineHandler) {
            if (hasBeenExamined && onExamineHandler.alternateMessage) {
                messageContent = onExamineHandler.alternateMessage;
            } else {
                messageContent = onExamineHandler.success.message;
            }
        } else {
            const currentStateId = liveObject.state.currentStateId;
            const stateMapEntry = currentStateId ? liveObject.gameLogic.stateMap?.[currentStateId] : undefined;

            if (stateMapEntry) {
                if (isInteracting && stateMapEntry.overrides?.onExamine) {
                    messageContent = stateMapEntry.overrides.onExamine.success.message;
                } else {
                    messageContent = stateMapEntry.description || liveObject.gameLogic.description;
                }
            } else {
                messageContent = liveObject.gameLogic.description;
            }
        }
        
        const mainMessage = createMessage(
            'narrator',
            narratorName,
            messageContent,
            'image',
            { id: liveObject.gameLogic.id, game, state: newState, showEvenIfExamined: true }
        );
        
        if (!hasBeenExamined) {
            newState.flags.push(flag as any);
        }
        
        return { newState, messages: [mainMessage] };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}
