
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { generateNpcResponse } from '@/ai/flows/generate-npc-responses';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectContent, ItemId, GameObjectId } from '@/lib/game/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type CommandResult = {
  newState: PlayerState;
  messages: Message[];
};

function createMessage(
  sender: Message['sender'],
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  image_id?: string
): Message {
  const image = image_id ? PlaceHolderImages.find(p => p.id === image_id) : undefined;
  return {
    id: crypto.randomUUID(),
    sender,
    senderName,
    content,
    type,
    image,
    timestamp: Date.now(),
  };
}

// --- Conversation Helpers ---

const CONVERSATION_END_KEYWORDS = ['goodbye', 'bye', 'leave', 'stop', 'end', 'exit', 'thank you and goodbye'];
const BUSINESS_CARD_KEYWORDS = ['business card', 'card', 'his card'];

function isEndingConversation(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return CONVERSATION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}

function mentionsBusinessCard(input: string): boolean {
    return BUSINESS_CARD_KEYWORDS.some(keyword => input.toLowerCase().includes(keyword));
}

async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const chapter = game.chapters[state.currentChapterId];
    const npc = chapter.npcs[state.activeConversationWith];
    const location = chapter.locations[state.currentLocationId];
    let messages: Message[] = [];
    let newState = { ...state, inventory: [...state.inventory] };

    if (isEndingConversation(playerInput)) {
        newState.activeConversationWith = null;
        messages.push(createMessage('system', 'System', `You ended the conversation with ${npc.name}.`));
        if (npc.goodbyeMessage) {
            messages.push(createMessage(npc.id as NpcId, npc.name, `"${npc.goodbyeMessage}"`));
        }
        return { newState, messages };
    } 

    const gameStateSummary = `Player is in ${location.name}. Inventory: ${state.inventory.map(id => chapter.items[id]?.name).join(', ') || 'empty'}.`;
    
    const fullNpcDescription = `${npc.description} Their main clue is: ${npc.mainMessage} Their final message, to be used when they have nothing more to say, is: ${npc.finalMessage}`;

    const aiResponse = await generateNpcResponse({
        playerInput: playerInput,
        npcName: npc.name,
        npcDescription: fullNpcDescription,
        locationDescription: location.description,
        gameState: gameStateSummary,
    });
    
    const npcMessageContent = `"${aiResponse.npcResponse}"`;
    messages.push(createMessage(npc.id as NpcId, npc.name, npcMessageContent));

    const businessCardItem = Object.values(chapter.items).find(i => i.id === 'item_business_card');
    if (businessCardItem && !newState.inventory.includes(businessCardItem.id) && mentionsBusinessCard(aiResponse.npcResponse)) {
        newState.inventory.push(businessCardItem.id);
        
        const cardMessage = `The barista hands you a business card. It's been added to your inventory.`;
        messages.push(createMessage('narrator', 'Narrator', cardMessage, 'image', businessCardItem.image));
        
        const agentMessage = "Oh Burt you genious! Your instincts won, one more time! Maybe that is the key to open that Notebook!";
        messages.push(createMessage('agent', 'Agent Sharma', agentMessage));

        const npcInCartridge = gameCartridge.chapters[newState.currentChapterId].npcs[npc.id];
        if (npcInCartridge) {
            npcInCartridge.mainMessage = "I already gave you the business card. I don't have anything else for you.";
            npcInCartridge.finalMessage = "I told you all I know.";
        }
    }


    return { newState, messages };
}


// --- Command Handlers ---

function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  targetName = targetName.toLowerCase();

  const allSearchableObjects: (GameObject | Item)[] = [
    ...location.objects.map(objId => game.chapters[chapter.id].gameObjects[objId]),
    ...state.inventory.map(invId => chapter.items[invId])
  ].filter(Boolean) as (GameObject | Item)[];

  const target = allSearchableObjects.find(i => i?.name.toLowerCase() === targetName);

  if (target) {
    if ('isLocked' in target && !target.isLocked) { // It's an unlocked GameObject
        const gameObject = game.chapters[state.currentChapterId].gameObjects[target.id as GameObjectId];
        let description = gameObject.unlockedDescription || gameObject.description;
        return { newState: state, messages: [createMessage('narrator', 'Narrator', description)] };
    }
    // It's any other item or a locked GameObject
    return {
        newState: state,
        messages: [createMessage('narrator', 'Narrator', `You examine the ${target.name}. ${target.description}`)],
    };
  }

  return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}

function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const newState = JSON.parse(JSON.stringify(state));

  let itemToTake: Item | undefined;
  let itemSource: { items: ItemId[] } | undefined;

  // The business card can't be "taken", it is given.
  if (targetName.toLowerCase() === 'business card') {
      return { newState, messages: [createMessage('system', 'System', `You can't just take that. You should talk to the barista.`)] };
  }
  
  // Look in game objects in the current location
  for (const objId of location.objects) {
    const obj = chapter.gameObjects[objId];
    if (obj && ((obj.isOpenable && !obj.isLocked) || !obj.isOpenable)) {
       const foundItem = obj.items
         .map(itemId => chapter.items[itemId])
         .find(item => item?.name.toLowerCase() === targetName);
        if (foundItem) {
            itemToTake = foundItem;
            // This is messy - we need to modify the cartridge directly
            itemSource = gameCartridge.chapters[chapter.id].gameObjects[objId];
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
    
    return { newState, messages: [createMessage('narrator', 'Narrator', `You take the ${itemToTake.name}.`)] };
  }
  
  return { newState, messages: [createMessage('system', 'System', `You can't take that.`)] };
}

function handleGo(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const currentLocation = chapter.locations[state.currentLocationId];

    let targetLocation: Location | undefined;
    targetLocation = Object.values(chapter.locations).find(loc => loc.name.toLowerCase() === targetName);

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
        const newState = { ...state, currentLocationId: targetLocation.id, activeConversationWith: null };
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

  if (!itemInInventory) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a ${itemName}.`)] };
  }

  if (!targetObject || !location.objects.includes(targetObject.id)) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a ${objectName} here.`)] };
  }

  if (targetObject.unlocksWith === itemInInventory?.id && targetObject.isLocked) {
    const newState = JSON.parse(JSON.stringify(state));
    const gameObjInCartridge = gameCartridge.chapters[state.currentChapterId].gameObjects[targetObject.id];
    if (gameObjInCartridge) {
        gameObjInCartridge.isLocked = false;
    }

    return { newState, messages: [createMessage('narrator', 'Narrator', `You use the ${itemInInventory.name} on the ${targetObject.name}. It unlocks with a click!`)] };
  }

  return { newState: state, messages: [createMessage('system', 'System', `That doesn't seem to work.`)] };
}

async function handleTalk(state: PlayerState, npcName: string, game: Game): Promise<CommandResult> {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];

    const npc = Object.values(chapter.npcs)
        .find(n => n?.name.toLowerCase().includes(npcName));

    if (npc && location.npcs.includes(npc.id)) {
        let newState = { ...state, activeConversationWith: npc.id };
        let messages: Message[] = [];
        
        if (!state.hasStartedFirstConversation) {
            newState.hasStartedFirstConversation = true;
            messages.push(createMessage('system', 'System', `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`));
        }
        
        const welcomeMessage = (npc as NPC).welcomeMessage || npc.mainMessage;
        messages.push(createMessage(npc.id as NpcId, npc.name, `"${welcomeMessage}"`, 'image', npc.image));

        return { newState, messages };
    }
    
    return { newState: state, messages: [createMessage('system', 'System', `There is no one called "${npcName}" here.`)] };
}

function handleLook(state: PlayerState, game: Game, summary: string): CommandResult {
  return { newState: state, messages: [createMessage('narrator', 'Narrator', summary.trim())] };
}


function handleInventory(state: PlayerState, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    if (state.inventory.length === 0) {
        return { newState: state, messages: [createMessage('system', 'System', 'Your inventory is empty.')] };
    }
    const itemNames = state.inventory.map(id => {
        const item = chapter.items[id];
        if (item) return item.name;
        return null;
    }).filter(Boolean).join(', ');
    return { newState: state, messages: [createMessage('system', 'System', `You are carrying: ${itemNames}.`)] };
}

function handlePassword(state: PlayerState, command: string, game: Game): CommandResult {
    const passwordMatch = command.match(/password for (.*?) "(.*)"/i);
    if (!passwordMatch) {
        return { newState: state, messages: [createMessage('system', 'System', 'Invalid password format. Please use: password for <object> "<phrase>"')] };
    }

    const [, objectName, phrase] = passwordMatch;
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const newState = JSON.parse(JSON.stringify(state));

    const targetObject = Object.values(chapter.gameObjects)
        .find(o => o.name.toLowerCase() === objectName.trim().toLowerCase() && location.objects.includes(o.id));

    if (!targetObject) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${objectName}" here.`)] };
    }

    if (!targetObject.isLocked) {
        return { newState: state, messages: [createMessage('system', 'System', `The ${targetObject.name} is already unlocked.`)] };
    }

    if (targetObject.unlocksWithPhrase?.toLowerCase() === phrase.toLowerCase()) {
        const gameObjInCartridge = gameCartridge.chapters[state.currentChapterId].gameObjects[targetObject.id];
        if (gameObjInCartridge) {
            gameObjInCartridge.isLocked = false;
        }
        
        return { newState, messages: [createMessage('narrator', 'Narrator', `You speak the words, and the ${targetObject.name} unlocks with a soft click. It can now be examined.`)] };
    }

    return { newState: state, messages: [createMessage('system', 'System', 'That password doesn\'t work.')] };
}


function handleContentInteraction(state: PlayerState, contentType: 'read' | 'watch', contentName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];

    const allSearchableObjects = [
        ...location.objects.map(objId => gameCartridge.chapters[chapter.id].gameObjects[objId]),
        ...state.inventory.map(invId => chapter.items[invId as any]).map(item => chapter.gameObjects[item?.id as any])
    ].filter(Boolean);

    // Find an unlocked object in the current location that contains the content.
    const sourceObject = allSearchableObjects
        .find(obj => obj && !obj.isLocked && obj.content?.some(c => c.name.toLowerCase() === contentName));

    if (!sourceObject || !sourceObject.content) {
        return { newState: state, messages: [createMessage('system', 'System', `You can't seem to ${contentType} that right now.`)] };
    }

    const content = sourceObject.content.find(c => c.name.toLowerCase() === contentName);

    if (content) {
        const message = contentType === 'read' 
            ? `You read the ${contentName}:\n${content.url}`
            : `You watch the ${contentName}:\n${content.url}`;
        return { newState: state, messages: [createMessage('narrator', 'Narrator', message)] };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You can't find a "${contentName}" to ${contentType}.`)] };
}

function handleRead(state: PlayerState, contentName: string, game: Game): CommandResult {
    return handleContentInteraction(state, 'read', contentName, game);
}

function handleWatch(state: PlayerState, contentName: string, game: Game): CommandResult {
    return handleContentInteraction(state, 'watch', contentName, game);
}


// --- Main Action ---

export async function processCommand(
  currentState: PlayerState,
  playerInput: string
): Promise<CommandResult> {
  const game = gameCartridge;

  // If in conversation mode, handle as dialogue
  if (currentState.activeConversationWith) {
      return await handleConversation(currentState, playerInput, game);
  }
  
  // First, get the AI's interpretation of the command.
  const chapter = game.chapters[currentState.currentChapterId];
  const location = chapter.locations[currentState.currentLocationId];
  const objectsInLocation = location.objects.map(id => game.chapters[chapter.id].gameObjects[id]);
  const objectStates = objectsInLocation.map(obj => `${obj.name} is ${obj.isLocked ? 'locked' : 'unlocked'}`).join('. ');
  const objectNames = location.objects.map(id => chapter.gameObjects[id]?.name).join(', ');
  const npcNames = location.npcs.map(id => chapter.npcs[id]?.name).join(', ');
  
  let lookAroundSummary = `${location.description}\n\n`;
  if(objectNames) {
    lookAroundSummary += `You can see: ${objectNames}.\n`;
  }
  if(npcNames) {
    lookAroundSummary += `You see ${npcNames} here.`;
  }

  const gameStateSummary = `
    CHAPTER GOAL: ${chapter.goal}.
    CURRENT LOCATION: ${location.name}.
    INVENTORY: ${currentState.inventory.map(id => chapter.items[id]?.name).filter(Boolean).join(', ') || 'empty'}.
    LOCATION DESCRIPTION: ${lookAroundSummary.trim()}.
    OBJECT STATES: ${objectStates}.
  `;

  try {
    const aiResponse = await guidePlayerWithNarrator({
        gameSpecifications: game.description,
        gameState: gameStateSummary,
        playerCommand: playerInput,
        availableCommands: AVAILABLE_COMMANDS.join(', '),
    });

    const commandToExecute = aiResponse.commandToExecute.toLowerCase();
    const [verb, ...args] = commandToExecute.split(' ');
    const restOfCommand = args.join(' ');

    let result: CommandResult = { newState: currentState, messages: [] };

    // Now, execute the command and get the result
    switch (verb) {
        case 'examine':
            result = handleExamine(currentState, restOfCommand, game);
            break;
        case 'take':
            result = handleTake(currentState, restOfCommand, game);
            break;
        case 'go':
            result = handleGo(currentState, restOfCommand.replace('to ', ''), game);
            break;
        case 'use':
            const onMatch = restOfCommand.match(/(.*) on (.*)/);
            if (onMatch) {
                result = handleUse(currentState, onMatch[1], onMatch[2], game);
            } else {
                result = { newState: currentState, messages: [createMessage('system', 'System', 'Please specify what to use and what to use it on, e.g., "use key on desk".')] };
            }
            break;
        case 'talk':
             result = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
             break;
        case 'look':
             result = handleLook(currentState, game, lookAroundSummary);
             break;
        case 'inventory':
            result = handleInventory(currentState, game);
            break;
        case 'password':
            result = handlePassword(currentState, commandToExecute, game);
            break;
        case 'read':
            result = handleRead(currentState, restOfCommand, game);
            break;
        case 'watch':
            result = handleWatch(currentState, restOfCommand, game);
            break;
        default:
            result = { newState: currentState, messages: [createMessage('system', 'System', "I don't understand that command.")] };
    }
    
    let agentMessage = createMessage('agent', 'Agent Sharma', `${aiResponse.agentResponse}`);
    // In conversation mode, we don't want an agent message.
    if (result.newState.activeConversationWith) {
        return {
            newState: result.newState,
            messages: [...result.messages],
        };
    } 

    return {
        newState: result.newState,
        messages: [agentMessage, ...result.messages],
    };

  } catch (error) {
    console.error('Error processing command with GenKit:', error);
    return {
      newState: currentState,
      messages: [createMessage('system', 'System', 'Sorry, my thoughts are a bit scrambled right now. Try again.')],
    };
  }
}
