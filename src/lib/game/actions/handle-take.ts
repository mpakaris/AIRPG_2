

import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";
import { normalizeName } from "@/lib/utils";

export function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const location = game.locations[state.currentLocationId];
  const narratorName = "Narrator";
  const normalizedTargetName = normalizeName(targetName);
  
  let newState = JSON.parse(JSON.stringify(state));

  for (const objId of location.objects) {
    const liveObject = getLiveGameObject(objId, newState, game);
    
    if (liveObject && liveObject.state.isOpen) {
        const itemToTakeId = (liveObject.state.items || []).find(itemId => 
            normalizeName(game.items[itemId]?.name) === normalizedTargetName
        );

        if (itemToTakeId) {
            const itemToTake = game.items[itemToTakeId];

            if (!itemToTake) continue; // Should not happen, but for safety

            if (!itemToTake.capabilities.isTakable) {
                // Safely access the fail message
                const failMessage = itemToTake.handlers?.onTake?.fail?.message || `You can't take the ${itemToTake.name}.`;
                return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
            }
            
            if (newState.inventory.includes(itemToTake.id)) {
                return { newState: state, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
            }

            // Perform the transaction
            newState.inventory.push(itemToTake.id);
            
            const currentObjectItems = liveObject.state.items || [];
            const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
            newState.objectStates[objId].items = newObjectItems;

            // Safely access the success message and effects
            const successHandler = itemToTake.handlers?.onTake?.success;
            const effects = successHandler?.effects || [];
            const successMessage = successHandler?.message || `You take the ${itemToTake.name}.`;
            
            const result = processEffects(newState, effects, game);
            result.messages.unshift(createMessage('narrator', narratorName, successMessage));
            return result;
        }
    }
  }
  
  return { newState: state, messages: [createMessage('narrator', narratorName, `You don't see a "${targetName}" here to take.`)] };
}
