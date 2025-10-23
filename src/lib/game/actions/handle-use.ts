

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";

export async function handleUse(state: PlayerState, itemName: string, objectName: string, game: Game): Promise<CommandResult> {
  const location = game.locations[state.currentLocationId];
  const narratorName = game.narratorName || "Narrator";

  const itemToUse = findItemInContext(state, game, itemName);
  if (!itemToUse) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a "${itemName}".`)] };
  }
  
  // Case 1: Using an item on a specific object ("use item on object")
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
        
        const effects = unlockHandler.success?.effects || [];
        const result = processEffects(newState, effects, game);
        result.messages.unshift(createMessage('narrator', narratorName, unlockHandler.success?.message || `You use the ${itemToUse.name} on the ${targetObject.gameLogic.name}. It unlocks!`));

        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `That doesn't seem to work.`)] };
  }
  
  // Case 2: Using an item by itself (like "use SD Card" or "use phone")
  if (itemToUse.handlers.onUse) {
    // Check conditions for the onUse handler
    const handler = itemToUse.handlers.onUse;
    const conditionsMet = (handler.conditions || []).every(cond => {
        if (cond.type === 'HAS_FLAG') return state.flags.includes(cond.targetId as any);
        // Add more condition checks here if needed
        return true;
    });

    if (conditionsMet) {
        let result = processEffects(state, handler.success.effects || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, handler.success.message));
        return result;
    } else {
        return { newState: state, messages: [createMessage('narrator', narratorName, handler.fail.message || `You can't use the ${itemToUse.name} right now.`)]};
    }
  }

  // Fallback if the item exists but has no onUse handler or conditions aren't met
  return { newState: state, messages: [createMessage('system', 'System', 'You need to specify what to use that on, or it can\'t be used by itself.')] };
}

    
