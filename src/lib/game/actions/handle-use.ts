
'use server';

import type { GameObjectId, Game, PlayerState, CommandResult, Item } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleUse(state: PlayerState, itemName: string, targetName: string, game: Game): Promise<CommandResult> {
  const narratorName = "Narrator";
  const normalizedItemName = normalizeName(itemName);

  const itemInContext = findItemInContext(state, game, normalizedItemName);
  
  if (!itemInContext) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${itemName}" to use.`)] };
  }

  const { item: itemToUse, source } = itemInContext;

  if (source.type !== 'inventory') {
      return { newState: state, messages: [createMessage('system', 'System', `You can only use items that are in your inventory. Use "take ${itemToUse.name}" to pick it up first.`)] };
  }
  
  if (targetName) {
    const normalizedTargetName = normalizeName(targetName);
    const locationState = state.locationStates[state.currentLocationId] || { objects: game.locations[state.currentLocationId].objects };
    const visibleObjectIds = locationState.objects;
    
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
        }
        return { newState: state, messages: [createMessage('narrator', narratorName, `You can't use the "${itemName}" on the "${targetName}".`)] };
    }
    
    // Check if the object exists at all, even if not visible.
    const objectExistsInGame = Object.values(game.gameObjects).some(obj => normalizeName(obj.name).includes(normalizedTargetName));
    if (objectExistsInGame) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `You can't see a "${targetName}" here.`)] };
    }


    const targetItemResult = findItemInContext(state, game, normalizedTargetName);
    if(targetItemResult) {
        // Logic for combining items would go here if implemented
        return { newState: state, messages: [createMessage('narrator', narratorName, `You can't use the "${itemName}" on the "${targetName}".`)] };
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see a "${targetName}" to use the item on.`)] };
  }
  
  // This handles using an item on its own (e.g., "use phone")
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
