
'use server';

import { type CommandResult } from "@/lib/game/types";
import type { Game, PlayerState } from "../types";
import { createMessage } from "./process-effects";
import { getLiveGameObject } from "./helpers";

export async function handleLook(state: PlayerState, game: Game, summary: string): Promise<CommandResult> {
  const narratorName = "Narrator";
  const location = game.locations[state.currentLocationId];
  let fullDescription = summary.trim();

  const locationState = state.locationStates[state.currentLocationId] || { objects: location.objects };
  const visibleObjectIds = locationState.objects;
  
  if (visibleObjectIds.length > 0) {
      fullDescription += '\n\nYou see the following objects:';
      const objectNames = visibleObjectIds
        .map(id => getLiveGameObject(id, state, game))
        .filter(Boolean)
        .map(obj => `\n- ${obj!.gameLogic.name}`);
      fullDescription += objectNames.join('');
  }

  if (location.npcs && location.npcs.length > 0) {
    fullDescription += '\n\nYou can also see the following people:';
    location.npcs.forEach(npcId => {
      const npc = game.npcs[npcId];
      if (npc) {
        fullDescription += `\n- ${npc.name}`;
      }
    });
  }

  return { newState: state, messages: [createMessage('narrator', narratorName, fullDescription.trim(), 'text')] };
}

    