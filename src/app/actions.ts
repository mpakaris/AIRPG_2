'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { selectNpcResponse } from '@/ai/flows/select-npc-response';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId } from '@/lib/game/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';


// --- Utility Functions ---

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

function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): GameObject {
    const chapter = game.chapters[state.currentChapterId];
    const baseObject = chapter.gameObjects[id];
    const objectState = state.objectStates[id] || {};
    return { ...baseObject, ...objectState };
}

type CommandResult = {
  newState: PlayerState;
  messages: Message[];
};


// --- Conversation Helpers ---

const CONVERSATION_END_KEYWORDS = ['goodbye', 'bye', 'leave', 'stop', 'end', 'exit', 'thank you and goodbye'];

function isEndingConversation(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return CONVERSATION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}


async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const chapter = game.chapters[state.currentChapterId];
    const npc = chapter.npcs[state.activeConversationWith];
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

    // Prepare canned responses for the AI
    const cannedResponsesForAI = npc.cannedResponses?.map(r => ({ topic: r.topic, response: r.response })) || [];

    const aiResponse = await selectNpcResponse({
        playerInput: playerInput,
        npcName: npc.name,
        cannedResponses: cannedResponsesForAI,
    });
    
    const chosenTopic = aiResponse.topic;
    let npcMessageContent = npc.cannedResponses?.find(r => r.topic === 'default')?.response ?? "I don't know what to say.";

    const selectedResponse = npc.cannedResponses?.find(r => r.topic === chosenTopic);
    if (selectedResponse) {
        npcMessageContent = selectedResponse.response;
    }

    messages.push(createMessage(npc.id as NpcId, npc.name, `"${npcMessageContent}"`));

    const businessCardItem = Object.values(chapter.items).find(i => i.id === 'item_business_card');

    if (businessCardItem && !newState.inventory.includes(businessCardItem.id) && chosenTopic === 'clue') {
        newState.inventory.push(businessCardItem.id);
        
        const cardMessage = `The barista hands you a business card. It's been added to your inventory.`;
        messages.push(createMessage('narrator', 'Narrator', cardMessage, 'image', businessCardItem.image));
        
        const agentMessage = "Oh Burt you genious! Your instincts won, one more time! Maybe that is the key to open that Notebook!";
        messages.push(createMessage('agent', 'Agent Sharma', agentMessage));
    }

    return { newState, messages };
}

// --- Object Interaction Helper ---
const INTERACTION_END_KEYWORDS = ['exit', 'close', 'stop', 'leave', 'close notebook'];

function isEndingInteraction(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return INTERACTION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}

function handleObjectInteraction(state: PlayerState, playerInput: string, game: Game): CommandResult {
    if (!state.interactingWithObject) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not interacting with an object.')] };
    }

    const objectId = state.interactingWithObject;
    const object = getLiveGameObject(objectId, state, game);
    let newState = { ...state };
    let messages: Message[] = [];
    const lowerInput = playerInput.toLowerCase().trim();

    if (isEndingInteraction(lowerInput)) {
        newState.interactingWithObject = null;
        newState.notebookInteractionState = 'start';
        messages.push(createMessage('system', 'System', `You stop examining the ${object.name}.`));
        return { newState, messages };
    }
    
    const readKeywords = ['read', 'look at', 'examine', 'check', 'closer look'];
    const videoKeywords = ['watch', 'play', 'view', 'what is', 'recording', 'content'];

    const wantsToReadArticle = readKeywords.some(k => lowerInput.includes(k)) && lowerInput.includes('article');
    const wantsToWatchVideo = videoKeywords.some(k => lowerInput.includes(k)) && (lowerInput.includes('video') || lowerInput.includes('recording'));

    if (wantsToWatchVideo) {
        const videoContent = object.content?.find(c => c.type === 'video');
        if (videoContent) {
            newState.notebookInteractionState = 'video_watched';
            messages.push(createMessage('narrator', 'Narrator', videoContent.url, 'video'));
            messages.push(createMessage('agent', 'Agent Sharma', "Silas Bloom? I've never heard of him. But it seems he was a great musician. He wrote an amazing Song for this Rose. They really must have been crazy in love."));
            messages.push(createMessage('agent', 'Agent Sharma', "Burt, wait! It seems there is also a newspaper article. Maybe you should have a look at it."));
        } else {
            messages.push(createMessage('narrator', 'Narrator', `There is no video to watch in the ${object.name}.`));
        }
    } else if (wantsToReadArticle) {
        const articleContent = object.content?.find(c => c.type === 'article');
        if (articleContent) {
           newState.notebookInteractionState = 'article_read';
           messages.push(createMessage('narrator', 'Narrator', 'A newspaper article about Silas Bloom.', 'article', 'newspaper_article'));
           messages.push(createMessage('agent', 'Agent Sharma', "Burt, the article talks about Agent Mackling. Is that coincidence? It cant be. That must be what? Your grandfather? You are in law enforcement for 4 generations. Oh my god, this is huge, Burt!"));
        } else {
           messages.push(createMessage('narrator', 'Narrator', `There is no article to read in the ${object.name}.`));
        }
    } else {
        // Fallback messages based on state
        switch (newState.notebookInteractionState) {
            case 'start':
                messages.push(createMessage('narrator', 'Narrator', "The notebook is open. Inside, you see what appears to be a small data chip, likely a video or audio recording."));
                break;
            case 'video_watched':
                 messages.push(createMessage('narrator', 'Narrator', "You've watched the video. The newspaper article is still here. You could try to 'read article'."));
                 break;
            case 'article_read':
                 messages.push(createMessage('narrator', 'Narrator', "You've examined the contents of the notebook. Type 'exit' to stop examining it."));
                 break;
            default:
                messages.push(createMessage('system', 'System', `You can 'read article' or 'watch video'. Type 'exit' to stop.`));
                break;
        }
    }
    
    return { newState, messages };
}


// --- Command Handlers ---

function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  let newState = { ...state };
  targetName = targetName.toLowerCase();

  const allSearchableIds: (GameObjectId | ItemId)[] = [
    ...location.objects,
    ...state.inventory
  ];
  
  const targetId = allSearchableIds.find(id => {
      const isGameObject = id in chapter.gameObjects;
      const item = isGameObject ? chapter.gameObjects[id as GameObjectId] : chapter.items[id as ItemId];
      return item.name.toLowerCase() === targetName;
  });


  if (targetId) {
    const isGameObject = targetId in chapter.gameObjects;
    if (isGameObject) {
        const targetObject = getLiveGameObject(targetId as GameObjectId, state, game);
        if (targetObject.isOpenable && !targetObject.isLocked) {
            newState.interactingWithObject = targetObject.id as GameObjectId;
            newState.notebookInteractionState = 'start';
            // Start the interaction with an empty input to get the initial description
            return handleObjectInteraction(newState, '', game);
        }
         return {
            newState: state,
            messages: [createMessage('narrator', 'Narrator', `You examine the ${targetObject.name}. ${targetObject.description}`)],
        };
    } else {
         const targetItem = chapter.items[targetId as ItemId];
         return {
            newState: state,
            messages: [createMessage('narrator', 'Narrator', `You examine the ${targetItem.name}. ${targetItem.description}`)],
        };
    }
  }

  return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}

function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const newState = { ...state, inventory: [...state.inventory], objectStates: {...state.objectStates} };
  targetName = targetName.toLowerCase();

  if (targetName === 'business card') {
      return { newState, messages: [createMessage('system', 'System', `You can't just take that. You should talk to the barista.`)] };
  }
  
  for (const objId of location.objects) {
    const liveObject = getLiveGameObject(objId, newState, game);
    if (!liveObject.isOpenable || (liveObject.isOpenable && !liveObject.isLocked)) {
       const itemToTakeId = (liveObject.items || []).find(itemId => chapter.items[itemId]?.name.toLowerCase() === targetName);

        if (itemToTakeId) {
            const itemToTake = chapter.items[itemToTakeId];
            if (newState.inventory.includes(itemToTake.id)) {
                return { newState, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
            }
            newState.inventory.push(itemToTake.id);
            
            const currentObjectItems = liveObject.items || [];
            const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
            newState.objectStates[objId] = { ...newState.objectStates[objId], items: newObjectItems };

            return { newState, messages: [createMessage('narrator', 'Narrator', `You take the ${itemToTake.name}.`)] };
        }
     }
  }
  
  return { newState, messages: [createMessage('system', 'System', `You can't take that.`)] };
}

function handleGo(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const currentLocation = chapter.locations[state.currentLocationId];
    targetName = targetName.toLowerCase();

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
        const newState = { ...state, currentLocationId: targetLocation.id, activeConversationWith: null, interactingWithObject: null };
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
  
  const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase() === objectName);

  if (!itemInInventory) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a ${itemName}.`)] };
  }
  
  if (!targetObjectId) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a ${objectName} here.`)] };
  }
  
  const targetObject = getLiveGameObject(targetObjectId, state, game);

  if (targetObject.unlocksWith === itemInInventory?.id && targetObject.isLocked) {
    const newState = { ...state, objectStates: { ...state.objectStates }};
    newState.objectStates[targetObject.id] = { ...newState.objectStates[targetObject.id], isLocked: false };
    
    return { newState, messages: [createMessage('narrator', 'Narrator', `You use the ${itemInInventory.name} on the ${targetObject.name}. It unlocks with a click!`)] };
  }

  return { newState: state, messages: [createMessage('system', 'System', `That doesn't seem to work.`)] };
}

async function handleTalk(state: PlayerState, npcName: string, game: Game): Promise<CommandResult> {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    npcName = npcName.toLowerCase();

    const npc = Object.values(chapter.npcs)
        .find(n => n?.name.toLowerCase().includes(npcName));

    if (npc && location.npcs.includes(npc.id)) {
        let newState = { ...state, activeConversationWith: npc.id, interactingWithObject: null };
        let messages: Message[] = [];
        
        if (!state.hasStartedFirstConversation) {
            newState.hasStartedFirstConversation = true;
        }
        messages.push(createMessage('system', 'System', `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`));
        
        const welcomeMessage = (npc as NPC).welcomeMessage || "Hello.";
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
    const passwordMatch = command.toLowerCase().match(/password for (.*?) "(.*)"/);
    if (!passwordMatch) {
        return { newState: state, messages: [createMessage('system', 'System', 'Invalid password format. Please use: password for <object> "<phrase>"')] };
    }

    const [, objectName, phrase] = passwordMatch;
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    
    const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase() === objectName.trim().toLowerCase());

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${objectName}" here.`)] };
    }
    
    const targetObject = getLiveGameObject(targetObjectId, state, game);

    if (!targetObject.isLocked) {
        return { newState: state, messages: [createMessage('system', 'System', `The ${targetObject.name} is already unlocked.`)] };
    }

    if (targetObject.unlocksWithPhrase?.toLowerCase() === phrase.toLowerCase()) {
        const newState = { ...state, objectStates: { ...state.objectStates }};
        newState.objectStates[targetObject.id] = { ...newState.objectStates[targetObject.id], isLocked: false };
        newState.interactingWithObject = targetObject.id;
        newState.notebookInteractionState = 'start';

        const unlockedMessage = `You speak the words, and the ${targetObject.name} unlocks with a soft click.`;
        // Start the interaction with an empty input to get the initial description
        const initialInteractionMessages = handleObjectInteraction(newState, '', game).messages;

        return { newState, messages: [
                createMessage('narrator', 'Narrator', unlockedMessage),
                ...initialInteractionMessages
            ]
        };
    }

    return { newState: state, messages: [createMessage('system', 'System', 'That password doesn\'t work.')] };
}

// --- Main Action ---

export async function processCommand(
  currentState: PlayerState,
  playerInput: string
): Promise<CommandResult> {
  const game = gameCartridge;

  // Handle special interaction states first. These bypass the main AI.
  if (currentState.activeConversationWith) {
      return await handleConversation(currentState, playerInput, game);
  }
  if (currentState.interactingWithObject) {
      return handleObjectInteraction(currentState, playerInput, game);
  }

  // Handle structured commands that the AI struggles with.
  if (playerInput.toLowerCase().startsWith('password for')) {
      return handlePassword(currentState, playerInput, game);
  }

  // AI processing for general commands
  try {
    const chapter = game.chapters[currentState.currentChapterId];
    const location = chapter.locations[currentState.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, currentState, game));
    const objectStates = objectsInLocation.map(obj => `${obj.name} is ${obj.isLocked ? 'locked' : 'unlocked'}`).join('. ');
    const objectNames = objectsInLocation.map(obj => obj.name).join(', ');
    const npcNames = location.npcs.map(id => chapter.npcs[id]?.name).join(', ');
    
    let lookAroundSummary = `${location.description}\n\n`;
    if(objectNames) {
      lookAroundSummary += `You can see: ${objectNames}.\n`;
    }
    if(npcNames) {
      lookAroundSummary += `You see ${npcNames} here.`;
    }

    const gameStateSummaryForAI = `
      CHAPTER GOAL: ${chapter.goal}.
      CURRENT LOCATION: ${location.name}.
      INVENTORY: ${currentState.inventory.map(id => chapter.items[id]?.name).filter(Boolean).join(', ') || 'empty'}.
      LOCATION DESCRIPTION: ${lookAroundSummary.trim()}.
      OBJECT STATES: ${objectStates}.
    `;

    const aiResponse = await guidePlayerWithNarrator({
        gameSpecifications: game.description,
        gameState: gameStateSummaryForAI,
        playerCommand: playerInput,
        availableCommands: AVAILABLE_COMMANDS.join(', '),
    });

    const commandToExecute = aiResponse.commandToExecute.toLowerCase();
    const [verb, ...args] = commandToExecute.split(' ');
    const restOfCommand = args.join(' ');

    let result: CommandResult;
    
    // Execute the command determined by the AI
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
        default:
             result = { newState: currentState, messages: [createMessage('system', 'System', "I don't understand that command.")] };
             break;
    }
    
    // Only add the agent's message if the command was successful and didn't come from the system.
    const finalMessages = [...result.messages];
    const hasSystemMessage = result.messages.some(m => m.sender === 'system');

    if (!hasSystemMessage) {
        const agentMessage = createMessage('agent', 'Agent Sharma', `${aiResponse.agentResponse}`);
        finalMessages.unshift(agentMessage);
    }
    
    return {
        newState: result.newState,
        messages: finalMessages,
    };

  } catch (error) {
    console.error('Error processing command with GenKit:', error);
    return {
      newState: currentState,
      messages: [createMessage('system', 'System', 'Sorry, my thoughts are a bit scrambled right now. Try again.')],
    };
  }
}
