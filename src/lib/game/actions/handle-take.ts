import { CommandResult } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { createMessage, processActions } from "./process-actions";

export function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const narratorName = game.narratorName || "Narrator";
  const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();
  
  let newState = JSON.parse(JSON.stringify(state));

  for (const objId of location.objects) {
    const liveObject = getLiveGameObject(objId, newState, game);
    
    if (liveObject && liveObject.state.isOpen) {
        const itemToTakeId = (liveObject.state.items || []).find(itemId => 
            chapter.items[itemId]?.name.toLowerCase() === normalizedTargetName
        );

        if (itemToTakeId) {
            const itemToTake = chapter.items[itemToTakeId];

            if (!itemToTake.capabilities.isTakable) {
                return { newState: state, messages: [createMessage('narrator', narratorName, itemToTake.handlers.onTake?.fail.message || `You can't take the ${itemToTake.name}.`)] };
            }
            
            if (newState.inventory.includes(itemToTake.id)) {
                return { newState: state, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
            }

            // Perform the transaction
            newState.inventory.push(itemToTake.id);
            
            const currentObjectItems = liveObject.state.items || [];
            const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
            newState.objectStates[objId].items = newObjectItems;

            const actions = itemToTake.handlers.onTake?.success.actions || [];
            const result = processActions(newState, actions, game);
            result.messages.unshift(createMessage('narrator', narratorName, itemToTake.handlers.onTake?.success.message || `You take the ${itemToTake.name}.`));
            return result;
        }
    }
  }
  
  return { newState: state, messages: [createMessage('system', 'System', `You can't take that.`)] };
}
