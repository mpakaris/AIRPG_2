
'use server';

import { type CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { createMessage } from "./process-effects";
import { getLiveGameObject } from "./helpers";
import { normalizeName } from "./helpers";

export async function handleLook(state: PlayerState, game: Game, summary: string): Promise<CommandResult> {
  const narratorName = "Narrator";
  const location = game.locations[state.currentLocationId];
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
              fullDescription += `\n${zone.title}:`;
              objectsInZone.forEach(obj => {
                   if (obj) { // Extra safety check
                      const objState = obj.state.currentStateId ? game.gameObjects[obj.gameLogic.id]?.stateMap?.[obj.state.currentStateId] : null;
                      const description = objState?.description || obj.gameLogic.description;
                      fullDescription += `\n- ${description}`;
                  }
              });
          }
      });
  } else if (visibleObjectIds.length > 0) {
      fullDescription += '\n\nYou see the following:';
      visibleObjectIds.forEach(id => {
          const obj = getLiveGameObject(id, state, game);
          if (obj) {
               const objState = obj.state.currentStateId ? game.gameObjects[obj.gameLogic.id]?.stateMap?.[obj.state.currentStateId] : null;
               const description = objState?.description || obj.gameLogic.description;
              fullDescription += `\n- ${description}`;
          }
      });
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
