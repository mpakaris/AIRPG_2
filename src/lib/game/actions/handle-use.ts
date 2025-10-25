'use server';

import type { GameObjectId, Game, PlayerState, CommandResult } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<CommandResult> {
  const narratorName = "Narrator";
  const normalizedItemName = normalizeName(itemName);
  const normalizedTargetName = normalizeName(targetName);

  const itemToUse = findItemInContext(state, game, normalizedItemName);
  if (!itemToUse) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a "${itemName}".`)] };
  }
  
  if (normalizedTargetName) {
    const visibleObjectIds = state.locationStates[state.currentLocationId]?.objects || [];
    
    const targetObjectId = visibleObjectIds.find(id =>
        normalizeName(game.gameObjects[id]?.name).includes(normalizedTargetName)
    );

    if (targetObjectId) {
        const targetObject = getLiveGameObject(targetObjectId as GameObjectId, state, game);
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
                        const result = await processEffects(state, success.effects || [], game);
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
                const result = await processEffects(newState, effects, game);
                result.messages.unshift(createMessage('narrator', narratorName, unlockHandler.success?.message || `You use the ${itemToUse.name} on the ${targetObject.gameLogic.name}. It unlocks!`));

                return result;
            }
        }
    }

    const targetItem = findItemInContext(state, game, normalizedTargetName);
    if(targetItem) {
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
                    const result = await processEffects(state, success.effects || [], game);
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
  
  const onUseHandler = itemToUse.handlers.onUse;
  if (onUseHandler && !Array.isArray(onUseHandler)) {
    const { conditions, success, fail } = onUseHandler;
    const conditionsMet = (conditions || []).every(cond => {
        if (cond.type === 'HAS_FLAG') return state.flags.includes(cond.targetId as any);
        if (cond.type === 'NO_FLAG') return !state.flags.includes(cond.targetId as any);
        return true;
    });

    if (conditionsMet) {
        let result = await processEffects(state, success.effects || [], game);
        result.messages.unshift(createMessage('narrator', narratorName, success.message));
        return result;
    } else {
        return { newState: state, messages: [createMessage('narrator', narratorName, fail.message || `You can't use the ${itemToUse.name} right now.`)]};
    }
  }

  const defaultFail = itemToUse.handlers?.defaultFailMessage || 'You need to specify what to use that on, or it can\'t be used by itself.';
  return { newState: state, messages: [createMessage('narrator', narratorName, defaultFail)] };
}