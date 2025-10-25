
'use server';

import type { GameObjectId, Game, PlayerState, CommandResult, ItemId } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
  const narratorName = "Narrator";
  const normalizedTargetName = normalizeName(targetName);
  
  let newState = JSON.parse(JSON.stringify(state));

  // Special case for iron pipe
  if (normalizedTargetName.includes('pipe')) {
    const hasMovedChalkboard = newState.flags.includes('has_moved_chalkboard');
    const hasPipe = newState.inventory.includes('item_iron_pipe' as ItemId);
    if(hasPipe) {
        return { newState: state, messages: [createMessage('system', 'System', `You already have the iron pipe.`)] };
    }
    if (!hasMovedChalkboard) {
        return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see an iron pipe here.`)] };
    }
    // If chalkboard is moved and player doesn't have pipe, they can take it.
    newState.inventory.push('item_iron_pipe' as ItemId);
    const itemToTake = game.items['item_iron_pipe' as ItemId];
    return { newState, messages: [createMessage('narrator', narratorName, `You take the ${itemToTake.name}.`)] };
  }

  const itemToTake = findItemInContext(newState, game, normalizedTargetName);

  if (!itemToTake) {
    return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see a "${targetName}" here to take.`)] };
  }
  
  if (newState.inventory.includes(itemToTake.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
  }

  if (!itemToTake.capabilities.isTakable) {
    const failMessage = itemToTake.handlers?.onTake?.fail?.message || `You can't take the ${itemToTake.name}.`;
    return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
  }

  let itemFoundAndRemoved = false;
  let containerId: GameObjectId | null = null;
  const visibleObjectIds = newState.locationStates[newState.currentLocationId]?.objects || [];
  for (const objId of visibleObjectIds) {
    const liveObject = getLiveGameObject(objId, newState, game);
    if (liveObject && liveObject.state.isOpen) {
      const currentObjectItems = liveObject.state.items || [];
      if (currentObjectItems.includes(itemToTake.id)) {
        containerId = objId;
        const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
        newState.objectStates[objId].items = newObjectItems;
        itemFoundAndRemoved = true;
        break; 
      }
    }
  }

  if (!itemFoundAndRemoved) {
      return { newState: state, messages: [createMessage('narrator', narratorName, `You see the ${itemToTake.name}, but can't seem to pick it up.`)] };
  }

  newState.inventory.push(itemToTake.id);

  if (containerId === 'obj_wall_safe') {
      const safeState = newState.objectStates[containerId];
      if (safeState && safeState.items && safeState.items.length === 0) {
          safeState.currentStateId = 'unlocked_empty';
      }
  }

  const successHandler = itemToTake.handlers?.onTake?.success;
  const effects = successHandler?.effects || [];
  const successMessage = successHandler?.message || `You take the ${itemToTake.name}.`;
  
  const result = await processEffects(newState, effects, game);
  result.messages.unshift(createMessage('narrator', narratorName, successMessage));
  return result;
}

    