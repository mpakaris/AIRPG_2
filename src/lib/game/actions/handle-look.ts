
'use server';

import { type CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { createMessage } from "./process-effects";
import { getLiveGameObject } from "./helpers";

export async function handleLook(state: PlayerState, game: Game): Promise<CommandResult> {
  const narratorName = "Narrator";
  const location = game.locations[state.currentLocationId];
  const summary = location.sceneDescription;
  let fullDescription = summary.trim();

  const locationState = state.locationStates[state.currentLocationId] || { objects: location.objects };
  const visibleObjectIds = locationState.objects;
  
  if (location.zones && location.zones.length > 0) {
      fullDescription += '\n';
      location.zones.forEach(zone => {
          const objectsInZone = zone.objectIds
              .filter(id => visibleObjectIds.includes(id))
              .map(id => getLiveGameObject(id, state, game))
              .filter(Boolean);

          if (objectsInZone.length > 0) {
              const objectNames = objectsInZone.map(obj => obj!.gameLogic.name).join(', ');
              fullDescription += `\nIn the ${zone.title.toLowerCase()}, you see a ${objectNames}.`;
          }
      });
  } else if (visibleObjectIds.length > 0) {
      fullDescription += '\n\nYou see the following: ';
      const objectNames = visibleObjectIds
        .map(id => getLiveGameObject(id, state, game))
        .filter(Boolean)
        .map(obj => obj!.gameLogic.name);
      fullDescription += objectNames.join(', ');
  }

  if (location.npcs && location.npcs.length > 0) {
    fullDescription += '\n\nPeople here:';
    location.npcs.forEach(npcId => {
      const npc = game.npcs[npcId];
      if (npc) {
        fullDescription += `\n- ${npc.description}`;
      }
    });
  }

  return { newState: state, messages: [createMessage('narrator', narratorName, fullDescription.trim())] };
}
