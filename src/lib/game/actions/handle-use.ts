
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processActions } from "./process-actions";

export async function handleUse(state: PlayerState, itemName: string, objectName: string, game: Game): Promise<CommandResult> {
  const location = game.locations[state.currentLocationId];
  const narratorName = game.narratorName || "Narrator";

  const itemToUse = findItemInContext(state, game, itemName);
  if (!itemToUse) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a "${itemName}".`)] };
  }
  
  // Case 1: Using an item on a specific object
  if (objectName) {
    const targetObjectId = location.objects.find(objId => game.gameObjects[objId]?.name.toLowerCase().includes(objectName.toLowerCase()));
  
    if (!targetObjectId) {
      return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${objectName}" here.`)] };
    }
    
    const targetObject = getLiveGameObject(targetObjectId, state, game);
    const unlockHandler = targetObject?.gameLogic.handlers.onUnlock;

    if (targetObject && targetObject.state.isLocked && unlockHandler && 'unlocksWith' in unlockHandler && (unlockHandler as any).unlocksWith === itemToUse.id) {
        let newState = { ...state, objectStates: { ...state.objectStates }};
        if(!newState.objectStates[targetObject.gameLogic.id]) newState.objectStates[targetObject.gameLogic.id] = {} as any;
        newState.objectStates[targetObject.gameLogic.id].isLocked = false;
        
        const actions = unlockHandler.success?.actions || [];
        const result = processActions(newState, actions, game);
        result.messages.unshift(createMessage('narrator', narratorName, unlockHandler.success?.message || `You use the ${itemToUse.name} on the ${targetObject.gameLogic.name}. It unlocks!`));

        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `That doesn't seem to work.`)] };
  }
  
  // Case 2: Using an item by itself (like reading it, or using the data chip)
  if (itemToUse.handlers.onUse) {
    let result = processActions(state, itemToUse.handlers.onUse.success.actions || [], game);
    result.messages.unshift(createMessage('narrator', narratorName, itemToUse.handlers.onUse.success.message));
    return result;
  }

  return { newState: state, messages: [createMessage('system', 'System', 'You need to specify what to use that on.')] };
}
