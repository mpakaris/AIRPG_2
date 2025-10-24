

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { findItemInContext, getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const narratorName = "Narrator";
  const normalizedTargetName = normalizeName(targetName);
  
  let newState = JSON.parse(JSON.stringify(state));

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

  // Find which container the item is in and remove it
  let itemFoundAndRemoved = false;
  const visibleObjectIds = newState.locationStates[newState.currentLocationId]?.objects || [];
  for (const objId of visibleObjectIds) {
    const liveObject = getLiveGameObject(objId, newState, game);
    if (liveObject && liveObject.state.isOpen) {
      const currentObjectItems = liveObject.state.items || [];
      if (currentObjectItems.includes(itemToTake.id)) {
        const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
        newState.objectStates[objId].items = newObjectItems;
        itemFoundAndRemoved = true;
        break; 
      }
    }
  }

  if (!itemFoundAndRemoved) {
      // This case should ideally not be reached if findItemInContext works correctly,
      // but it's a good safeguard.
      return { newState: state, messages: [createMessage('narrator', narratorName, `You see the ${itemToTake.name}, but can't seem to pick it up.`)] };
  }

  // Add item to player's inventory
  newState.inventory.push(itemToTake.id);

  // Process success effects
  const successHandler = itemToTake.handlers?.onTake?.success;
  const effects = successHandler?.effects || [];
  const successMessage = successHandler?.message || `You take the ${itemToTake.name}.`;
  
  const result = processEffects(newState, effects, game);
  result.messages.unshift(createMessage('narrator', narratorName, successMessage));
  return result;
}

