
import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<CommandResult> {
  const location = game.locations[state.currentLocationId];
  const narratorName = "Narrator";
  const normalizedItemName = normalizeName(itemName);
  const normalizedTargetName = normalizeName(targetName);

  const itemToUse = findItemInContext(state, game, normalizedItemName);
  if (!itemToUse) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a "${itemName}".`)] };
  }
  
  // Case 1: Using an item on a specific object ("use item on object")
  if (normalizedTargetName) {
    // Try to find a GameObject in the location
    const targetObjectId = Object.keys(game.gameObjects).find(objId => normalizeName(game.gameObjects[objId as keyof typeof game.gameObjects]?.name).includes(normalizedTargetName));
    const isTargetInLocation = targetObjectId && location.objects.includes(targetObjectId as any);

    if (isTargetInLocation) {
        const targetObject = getLiveGameObject(targetObjectId as any, state, game);
        if (targetObject) {
            const useHandlers = targetObject.gameLogic.handlers.onUse;
            if (Array.isArray(useHandlers)) {
                const specificHandler = useHandlers.find(h => h.itemId === itemToUse.id);
                if (specificHandler) {
                    const { success, fail, conditions } = specificHandler;
                    const conditionsMet = (conditions || []).every(cond => {
                        if (cond.type === 'HAS_FLAG') return state.flags.includes(cond.targetId as any);
                        if (cond.type === 'NO_FLAG') return !state.flags.includes(cond.targetId as any);
                        return true;
                    });
                    
                    if (conditionsMet) {
                        const result = processEffects(state, success.effects || [], game);
                        result.messages.unshift(createMessage('narrator', narratorName, success.message));
                        return result;
                    } else {
                         return { newState: state, messages: [createMessage('narrator', narratorName, fail.message || `That doesn't seem to work.`)] };
                    }
                }
            }

            const unlockHandler = targetObject.gameLogic.handlers.onUnlock;
            if (targetObject.state.isLocked && unlockHandler && 'unlocksWith' in unlockHandler && (unlockHandler as any).unlocksWith === itemToUse.id) {
                let newState = { ...state, objectStates: { ...state.objectStates }};
                if(!newState.objectStates[targetObject.gameLogic.id]) newState.objectStates[targetObject.gameLogic.id] = {} as any;
                newState.objectStates[targetObject.gameLogic.id].isLocked = false;
                
                const effects = unlockHandler.success?.effects || [];
                const result = processEffects(newState, effects, game);
                result.messages.unshift(createMessage('narrator', narratorName, unlockHandler.success?.message || `You use the ${itemToUse.name} on the ${targetObject.gameLogic.name}. It unlocks!`));

                return result;
            }
        }
    }

    // If no GameObject found, try to find another Item in context (inventory)
    const targetItem = findItemInContext(state, game, normalizedTargetName);
    if(targetItem) {
        // This is an item-on-item use case. We check the TARGET item's handlers to see how it reacts.
        const useHandlers = targetItem.handlers?.onUse;
        if(Array.isArray(useHandlers)) {
            const specificHandler = useHandlers.find(h => 'itemId' in h && h.itemId === itemToUse.id);
            if(specificHandler) {
                const { success, fail, conditions } = specificHandler;
                const conditionsMet = (conditions || []).every(cond => {
                    if (cond.type === 'HAS_FLAG') return state.flags.includes(cond.targetId as any);
                    if (cond.type === 'NO_FLAG') return !state.flags.includes(cond.targetId as any);
                    return true;
                });
                
                if(conditionsMet) {
                    const result = processEffects(state, success.effects || [], game);
                    result.messages.unshift(createMessage('narrator', narratorName, success.message));
                    return result;
                } else {
                     return { newState: state, messages: [createMessage('narrator', narratorName, fail.message || `That doesn't seem to work.`)] };
                }
            }
        }
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `You can't use the "${itemName}" on the "${targetName}".`)] };
  }
  
  // Case 2: Using an item by itself (like "use SD Card" or "use phone")
  const onUseHandler = itemToUse.handlers.onUse;
  if (onUseHandler && !Array.isArray(onUseHandler)) {
    const { conditions, success, fail } = onUseHandler;
    const conditionsMet = (conditions || []).every(cond => {
        if (cond.type === 'HAS_FLAG') return state.flags.includes(cond.targetId as any);
        if (cond.type === 'NO_FLAG') return !state.flags.includes(cond.targetId as any);
        return true;
    });

    if (conditionsMet) {
        let result = processEffects(state, success.effects || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, success.message));
        return result;
    } else {
        return { newState: state, messages: [createMessage('narrator', narratorName, fail.message || `You can't use the ${itemToUse.name} right now.`)]};
    }
  }

  const defaultFail = itemToUse.handlers?.defaultFailMessage || 'You need to specify what to use that on, or it can\'t be used by itself.';
  return { newState: state, messages: [createMessage('narrator', narratorName, defaultFail)] };
}
