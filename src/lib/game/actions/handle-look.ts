/**
 * handle-look - NEW ARCHITECTURE
 *
 * Handles looking around the current location.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { VisibilityResolver } from "@/lib/game/engine";

export async function handleLook(state: PlayerState, game: Game): Promise<Effect[]> {
  const location = game.locations[state.currentLocationId];
  let fullDescription = location.sceneDescription.trim();

  // Use VisibilityResolver to get visible entities
  const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

  if (visibleEntities.objects.length > 0) {
      fullDescription += '\n\nYou see the following objects:';
      const objectNames = visibleEntities.objects
        .map(id => game.gameObjects[id as any])
        .filter(Boolean)
        .map(obj => `\n- ${obj!.name}`);
      fullDescription += objectNames.join('');
  }

  if (visibleEntities.npcs.length > 0) {
    fullDescription += '\n\nYou can also see the following people:';
    visibleEntities.npcs.forEach(npcId => {
      const npc = game.npcs[npcId as any];
      if (npc) {
        fullDescription += `\n- ${npc.name}`;
      }
    });
  }

  return [{
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: fullDescription.trim()
  }];
}
