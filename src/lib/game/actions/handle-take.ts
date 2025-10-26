
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
  
  const itemInContext = findItemInContext(state, game, normalizedTargetName);

  if (!itemInContext) {
    return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see a "${targetName}" here to take.`)] };
  }

  const { item, source } = itemInContext;
  
  if (state.inventory.includes(item.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You already have the ${item.name}.`)] };
  }

  if (!item.capabilities.isTakable) {
    const failMessage = item.handlers?.onTake?.fail?.message || `You can't take the ${item.name}.`;
    return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
  }

  // Define effects based on the take action
  const takeEffects = [
    { type: 'ADD_ITEM' as const, itemId: item.id },
    ...(item.handlers?.onTake?.success?.effects || [])
  ];

  // If item was found in a container, add an effect to remove it from there
  if (source && source.type === 'object') {
    takeEffects.push({ type: 'REMOVE_ITEM_FROM_CONTAINER' as const, itemId: item.id, containerId: source.id });
  }

  const result = await processEffects(state, takeEffects, game);

  const successMessage = item.handlers?.onTake?.success?.message || `You take the ${item.name}.`;
  result.messages.unshift(createMessage('narrator', narratorName, successMessage));
  
  return result;
}
