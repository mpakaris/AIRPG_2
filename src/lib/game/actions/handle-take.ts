
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

  // 1. Find item in visible entities
  const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
  const itemId = visibleEntities.items.find(id =>
    normalizeName(game.items[id as any]?.name).includes(normalizedTargetName)
  );

  if (!itemId) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" here to take.`
    }];
  }

  const item = game.items[itemId as any];
  if (!item) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You don't see a "${targetName}" here to take.`
    }];
  }

  // 2. Check if already in inventory
  if (state.inventory.includes(itemId as any)) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: `You already have the ${item.name}.`
    }];
  }

  // 3. Check if item is takable
  if (!item.capabilities?.isTakable) {
    const handler = HandlerResolver.getEffectiveHandler(item, 'take', state);
    const failMessage = handler?.fail?.message || `You can't take the ${item.name}.`;
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: failMessage
    }];
  }

  // 4. Get onTake handler if exists
  const handler = HandlerResolver.getEffectiveHandler(item, 'take', state);
  const successMessage = handler?.success?.message || `You take the ${item.name}.`;

  // 5. Build effects
  const effects: Effect[] = [
    {
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: successMessage
    },
    {
      type: 'ADD_ITEM',
      itemId: itemId
    }
  ];

  // Add handler effects if present
  if (handler?.success?.effects) {
    effects.push(...handler.success.effects);
  }

  return effects;
}
