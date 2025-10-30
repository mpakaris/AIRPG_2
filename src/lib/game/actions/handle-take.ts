
/**
 * handle-take - NEW ARCHITECTURE
 *
 * Handles taking (picking up) items.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { Validator, HandlerResolver, VisibilityResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleTake(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const normalizedTargetName = normalizeName(targetName);

  if (!normalizedTargetName) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: 'You need to specify what to take.'
    }];
  }
  
  const itemInContext = findItemInContext(state, game, normalizedTargetName);

  // 1. Find item in visible entities
  const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
  const itemId = visibleEntities.items.find(id =>
    matchesName(game.items[id as any], normalizedTargetName)
  );

  if (!itemId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" here to take.`
    }];
  }

  const { item, source } = itemInContext;
  
  if (state.inventory.includes(item.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You already have the ${item.name}.`)] };
  }

  // 2. Check if already in inventory
  if (state.inventory.includes(itemId as any)) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You already have the ${item.name}.`
    }];
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
