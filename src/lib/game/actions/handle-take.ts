
'use server';

import type { GameObjectId, Game, PlayerState, CommandResult, ItemId } from "@/lib/game/types";
import { findItemInContext, getLiveGameObject } from "@/lib/game/utils/helpers";
import { createMessage } from "@/lib/utils";
import { processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<CommandResult> {
  const narratorName = "Narrator";
  const normalizedTargetName = normalizeName(targetName);
  
  if (!normalizedTargetName) {
      return { newState: state, messages: [createMessage('system', 'System', 'You need to specify what to take.')] };
  }
  
  let newState = JSON.parse(JSON.stringify(state));

  const itemInContext = findItemInContext(newState, game, normalizedTargetName);

  if (!itemInContext) {
    return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see a "${targetName}" here to take.`)] };
  }

  const { item, source } = itemInContext;
  
  if (newState.inventory.includes(item.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You already have the ${item.name}.`)] };
  }

  if (!item.capabilities.isTakable) {
    const failMessage = item.handlers?.onTake?.fail?.message || `You can't take the ${item.name}.`;
    return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
  }

  // If item was found in a container, remove it from there
  if (source && source.type === 'object') {
    const containerId = source.id;
    const containerState = newState.objectStates[containerId];
    if (containerState && containerState.items) {
      containerState.items = containerState.items.filter((id: ItemId) => id !== item.id);
    }
  } else if (source && source.type === 'location') {
    // If we support items being directly in locations, logic to remove it would go here.
    // For now, our model has items inside objects.
  } else {
    // This case handles items that are 'spawned' but not yet in a container.
    // The findItemInContext function logic needs to support this.
    // For now, we assume all takeable items are in containers.
    // If the source is null but the item was found, it means it was in the world but not in a container.
    // This shouldn't happen with our current logic, but we handle it gracefully.
  }

  // Add item to player inventory
  newState.inventory.push(item.id);

  const successHandler = item.handlers?.onTake?.success;
  const effects = successHandler?.effects || [];
  const successMessage = successHandler?.message || `You take the ${item.name}.`;
  
  const result = await processEffects(newState, effects, game);
  result.messages.unshift(createMessage('narrator', narratorName, successMessage));
  return result;
}
