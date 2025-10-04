
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { generateNpcResponse } from '@/ai/flows/generate-npc-responses';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState } from '@/lib/game/types';

type CommandResult = {
  newState: PlayerState;
  messages: Message[];
};

function createMessage(
  sender: Message['sender'],
  senderName: string,
  content: string,
  type: Message['type'] = 'text'
): Message {
  return {
    id: crypto.randomUUID(),
    sender,
    senderName,
    content,
    type,
    timestamp: Date.now(),
  };
}

// --- Command Handlers ---

function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];

  // Check inventory
  const itemInInventory = state.inventory
    .map(itemId => chapter.items[itemId])
    .find(item => item?.name.toLowerCase() === targetName);
  if (itemInInventory) {
    return {
      newState: state,
      messages: [createMessage('system', 'System', `You examine the ${itemInInventory.name}. ${itemInInventory.description}`)],
    };
  }

  // Check objects in location
  const objectInLocation = Object.values(chapter.gameObjects)
    .find(obj => obj.name.toLowerCase() === targetName);
  if (objectInLocation && location.objects.includes(objectInLocation.id)) {
    let description = objectInLocation.description;
    // Check for items inside if object is openable but not locked
    if (objectInLocation.isOpenable && !objectInLocation.isLocked && objectInLocation.items.length > 0) {
      const itemNames = objectInLocation.items.map(id => chapter.items[id].name).join(', ');
      description += ` You see a ${itemNames} inside.`;
    }
    return {
      newState: state,
      messages: [createMessage('system', 'System', description)],
    };
  }

  return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}

function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const newState = JSON.parse(JSON.stringify(state));

  // Special case for taking the business card from the barista
  if (targetName === 'business card') {
      const businessCard = Object.values(chapter.items).find(i => i.name.toLowerCase() === 'business card');
      if (businessCard) {
          if (newState.inventory.includes(businessCard.id)) {
              return { newState, messages: [createMessage('system', 'System', `You already have the business card.`)] };
          }
          newState.inventory.push(businessCard.id);
          return { newState, messages: [createMessage('system', 'System', `The barista hands you the business card.`)] };
      }
  }


  let itemToTake: Item | undefined;
  let itemSource: { items: string[] } | undefined;

  for (const objId of location.objects) {
    const obj = chapter.gameObjects[objId];
    // Can only take from openable and unlocked objects, or non-openable "containers" like a bookshelf
     if (obj && ((obj.isOpenable && !obj.isLocked) || !obj.isOpenable)) {
       const foundItem = obj.items
         .map(itemId => chapter.items[itemId])
         .find(item => item?.name.toLowerCase() === targetName);
        if (foundItem) {
            itemToTake = foundItem;
            itemSource = obj;
            break;
        }
     }
  }

  if (itemToTake && itemSource) {
    if (newState.inventory.includes(itemToTake.id)) {
        return { newState, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
    }
    newState.inventory.push(itemToTake.id);
    itemSource.items = itemSource.items.filter(id => id !== itemToTake!.id);
    return { newState, messages: [createMessage('system', 'System', `You take the ${itemToTake.name}.`)] };
  }
  
  return { newState, messages: [createMessage('system', 'System', `You can't take that.`)] };
}

function handleGo(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const currentLocation = chapter.locations[state.currentLocationId];

    let targetLocation: Location | undefined;

    // Try to find by name first
    targetLocation = Object.values(chapter.locations).find(loc => loc.name.toLowerCase() === targetName);

    // If not found by name, try by direction
    if (!targetLocation) {
        const { x, y } = currentLocation.gridPosition;
        let nextPos = { x, y };
        switch (targetName) {
            case 'north': nextPos.y -= 1; break;
            case 'south': nextPos.y += 1; break;
            case 'east': nextPos.x += 1; break;
            case 'west': nextPos.x -= 1; break;
        }
        targetLocation = Object.values(chapter.locations).find(loc => loc.gridPosition.x === nextPos.x && loc.gridPosition.y === nextPos.y);
    }
    
    if (targetLocation) {
        const newState = { ...state, currentLocationId: targetLocation.id };
        return {
            newState,
            messages: [
                createMessage('system', 'System', `You go to the ${targetLocation.name}.`),
                createMessage('narrator', 'Narrator', targetLocation.description)
            ]
        };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You can't go there.`)] };
}


function handleUse(state: PlayerState, itemName: string, objectName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  
  const itemInInventory = state.inventory
    .map(id => chapter.items[id])
    .find(i => i?.name.toLowerCase() === itemName);
  
  const targetObject = Object.values(chapter.gameObjects)
    .find(o => o?.name.toLowerCase() === objectName);

  if (!itemInInventory && !AVAILABLE_COMMANDS.some(cmd => cmd.startsWith('use'))) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a ${itemName}.`)] };
  }

  if (!targetObject || !location.objects.includes(targetObject.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a ${objectName} here.`)] };
  }

  if (targetObject.unlocksWith === itemInInventory?.id && targetObject.isLocked) {
    const newState = JSON.parse(JSON.stringify(state));
    const gameObjInState = newState.game.chapters[state.currentChapterId].gameObjects[targetObject.id];
    if(gameObjInState) {
        gameObjInState.isLocked = false;
    }
    return { newState, messages: [createMessage('system', 'System', `You use the ${itemInInventory.name} on the ${targetObject.name}. It unlocks with a click!`)] };
  }
  
  if (targetObject.unlocksWithPhrase && targetObject.unlocksWithPhrase.toLowerCase() === itemName.toLowerCase() && targetObject.isLocked) {
     const newState = JSON.parse(JSON.stringify(state));
     const gameObjInState = chapter.gameObjects[targetObject.id];
     if (gameObjInState) {
       gameObjInState.isLocked = false;
     }

    return { newState, messages: [createMessage('system', 'System', `You say the phrase "${itemName}". The ${targetObject.name} unlocks with a click! You can now examine it to see what's inside.`)] };
  }

  return { newState: state, messages: [createMessage('system', 'System', `That doesn't seem to work.`)] };
}

async function handleTalk(state: PlayerState, npcName: string, fullCommand: string, game: Game): Promise<CommandResult> {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];

    const npc = Object.values(chapter.npcs)
        .find(n => n?.name.toLowerCase().includes(npcName));

    if (npc && location.npcs.includes(npc.id)) {
        const gameStateSummary = `Player is in ${location.name}. Inventory: ${state.inventory.map(id => chapter.items[id]?.name).join(', ') || 'empty'}.`;
        const aiResponse = await generateNpcResponse({
            playerInput: fullCommand,
            npcName: npc.name,
            npcDescription: npc.description + " Their main message is: " + npc.mainMessage,
            locationDescription: location.description,
            gameState: gameStateSummary,
        });

        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${aiResponse.npcResponse}"`)] };
    }
    
    return { newState: state, messages: [createMessage('system', 'System', `There is no one called "${npcName}" here.`)] };
}

function handleLook(state: PlayerState, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    return { newState: state, messages: [createMessage('narrator', 'Narrator', location.description)] };
}

function handleInventory(state: PlayerState, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    if (state.inventory.length === 0) {
        return { newState: state, messages: [createMessage('system', 'System', 'Your inventory is empty.')] };
    }
    const itemNames = state.inventory.map(id => chapter.items[id]?.name).join(', ');
    return { newState: state, messages: [createMessage('system', 'System', `You are carrying: ${itemNames}.`)] };
}

// --- Main Action ---

export async function processCommand(
  currentState: PlayerState,
  playerInput: string
): Promise<CommandResult> {
  const chapter = gameCartridge.chapters[currentState.currentChapterId];
  const location = chapter.locations[currentState.currentLocationId];

  const gameStateSummary = `
    Player is in: ${location.name} (${location.description}).
    Inventory: ${currentState.inventory.map(id => chapter.items[id]?.name).join(', ') || 'empty'}.
    Game Objects here: ${location.objects.map(id => chapter.gameObjects[id]?.name).join(', ')}.
    NPCs here: ${location.npcs.map(id => chapter.npcs[id]?.name).join(', ')}.
    Game Goal: ${chapter.goal}.
  `;

  try {
    const aiResponse = await guidePlayerWithNarrator({
      gameSpecifications: gameCartridge.description,
      gameState: gameStateSummary,
      playerCommand: playerInput,
      availableCommands: AVAILABLE_COMMANDS.join(', '),
    });

    const agentMessage = createMessage('agent', 'Agent Sharma', aiResponse.agentResponse);
    const commandToExecute = aiResponse.commandToExecute.toLowerCase();
    const [verb, ...args] = commandToExecute.split(' ');
    const restOfCommand = args.join(' ');

    let result: CommandResult = { newState: currentState, messages: [] };

    switch (verb) {
        case 'examine':
            result = handleExamine(currentState, restOfCommand, gameCartridge);
            break;
        case 'take':
            result = handleTake(currentState, restOfCommand, gameCartridge);
            break;
        case 'go':
            result = handleGo(currentState, restOfCommand.replace('to ', ''), gameCartridge);
            break;
        case 'use':
            const onMatch = restOfCommand.match(/(.*) on (.*)/);
            if (onMatch) {
                result = handleUse(currentState, onMatch[1], onMatch[2], gameCartridge);
            } else {
                result = { newState: currentState, messages: [createMessage('system', 'System', 'Please specify what to use and what to use it on, e.g., "use key on desk".')] };
            }
            break;
        case 'talk':
             result = await handleTalk(currentState, restOfCommand.replace('to ', ''), playerInput, gameCartridge);
             break;
        case 'look':
             result = handleLook(currentState, gameCartridge);
             break;
        case 'inventory':
            result = handleInventory(currentState, gameCartridge);
            break;
      default:
        result = { newState: currentState, messages: [createMessage('system', 'System', "I don't understand that command.")] };
    }
    
    return {
      newState: result.newState,
      messages: [...result.messages, agentMessage],
    };

  } catch (error) {
    console.error('Error processing command with GenKit:', error);
    return {
      newState: currentState,
      messages: [createMessage('system', 'System', 'Sorry, my thoughts are a bit scrambled right now. Try again.')],
    };
  }
}
