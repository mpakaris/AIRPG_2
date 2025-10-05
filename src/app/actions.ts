
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { selectNpcResponse } from '@/ai/flows/select-npc-response';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Action, Chapter, ChapterId, ImageDetails } from '@/lib/game/types';


// --- Utility Functions ---
const examinedObjectFlag = (id: GameObjectId | ItemId | NpcId) => `examined_${id}` as Flag;

function createMessage(
  sender: Message['sender'],
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  imageDetails?: { id: ItemId | NpcId | GameObjectId, game: Game, state: PlayerState, showEvenIfExamined?: boolean }
): Message {
    let image: ImageDetails | undefined;
    
    if (imageDetails) {
        const { id, game, state, showEvenIfExamined } = imageDetails;
        const chapter = game.chapters[state.currentChapterId];
        const isAlreadyExamined = state.flags.includes(examinedObjectFlag(id));
        
        if (showEvenIfExamined || !isAlreadyExamined) {
            const item = chapter.items[id as ItemId];
            const npc = chapter.npcs[id as NpcId];
            const gameObject = chapter.gameObjects[id as GameObjectId];
            
            if (gameObject) {
                const liveObject = getLiveGameObject(gameObject.id, state, game);
                if (!liveObject.isLocked && liveObject.unlockedImage) {
                    image = liveObject.unlockedImage;
                } else {
                    image = gameObject.image;
                }
            } else if (item?.image) {
                image = item.image;
            } else if (npc?.image) {
                image = npc.image;
            }
        }
    }


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


function getInitialState(game: Game): PlayerState {
    return {
        currentGameId: game.id,
        currentChapterId: game.startChapterId,
        currentLocationId: game.chapters[game.startChapterId].startLocationId,
        inventory: [],
        flags: [],
        objectStates: {},
        activeConversationWith: null,
        interactingWithObject: null,
    };
}


function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): GameObject & GameObjectState {
    const chapter = game.chapters[state.currentChapterId];
    const baseObject = chapter.gameObjects[id];
    const objectState = state.objectStates[id] || {};
    return { ...baseObject, ...objectState };
}

type CommandResult = {
  newState: PlayerState;
  messages: Message[];
};


// --- Generic Action Processor ---

function processActions(initialState: PlayerState, actions: Action[], game: Game): CommandResult {
    let newState = { ...initialState, flags: [...initialState.flags], objectStates: {...initialState.objectStates} };
    const messages: Message[] = [];
    const chapter = game.chapters[newState.currentChapterId];
    const narratorName = game.narratorName || 'Narrator';

    for (const action of actions) {
        switch (action.type) {
            case 'ADD_ITEM':
                if (!newState.inventory.includes(action.itemId)) {
                    newState.inventory = [...newState.inventory, action.itemId];
                }
                break;
            case 'SET_FLAG':
                if (!newState.flags.includes(action.flag)) {
                    newState.flags = [...newState.flags, action.flag];
                }
                break;
            case 'SHOW_MESSAGE':
                const messageImageId = action.imageId;
                const message = createMessage(
                    action.sender,
                    action.senderName || narratorName,
                    action.content,
                    action.messageType,
                    messageImageId ? { id: messageImageId, game, state: newState, showEvenIfExamined: true } : undefined
                );
                messages.push(message);

                 // After showing a message with an image, flag it as examined.
                 if (messageImageId && !newState.flags.includes(examinedObjectFlag(messageImageId))) {
                     newState.flags.push(examinedObjectFlag(messageImageId));
                 }
                break;
            case 'END_CONVERSATION':
                 if (newState.activeConversationWith) {
                    const npc = chapter.npcs[newState.activeConversationWith];
                    messages.push(createMessage('system', 'System', `You ended the conversation with ${npc.name}.`));
                    if (npc.goodbyeMessage) {
                        messages.push(createMessage(npc.id as NpcId, npc.name, `"${npc.goodbyeMessage}"`));
                    }
                    newState.activeConversationWith = null;
                }
                break;
            case 'START_INTERACTION':
                newState.interactingWithObject = action.objectId;
                if(action.interactionStateId){
                    newState.objectStates[action.objectId] = {
                        ...newState.objectStates[action.objectId],
                        currentInteractionStateId: action.interactionStateId
                    };
                }
                break;
            case 'END_INTERACTION':
                if (newState.interactingWithObject) {
                    const object = chapter.gameObjects[newState.interactingWithObject];
                    messages.push(createMessage('system', 'System', `You stop examining the ${object.name}.`));
                    newState.interactingWithObject = null;
                }
                break;
            case 'SET_INTERACTION_STATE':
                 if(newState.interactingWithObject) {
                    newState.objectStates[newState.interactingWithObject] = {
                        ...newState.objectStates[newState.interactingWithObject],
                        currentInteractionStateId: action.state
                    };
                }
                break;
        }
    }

    return { newState, messages };
}


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

    if (isEndingConversation(playerInput)) {
        const result = processActions(state, [{type: 'END_CONVERSATION'}], game);
        return result;
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
    let actionsToProcess: Action[] = [];

    const selectedResponse = npc.cannedResponses?.find(r => r.topic === chosenTopic);
    if (selectedResponse) {
        npcMessageContent = selectedResponse.response;
        actionsToProcess = selectedResponse.actions || [];
    }
    
    const initialResult = processActions(state, actionsToProcess, game);
    
    const initialMessage = createMessage(npc.id as NpcId, npc.name, `"${npcMessageContent}"`);
    initialResult.messages.unshift(initialMessage);


    return initialResult;
}

// --- Object Interaction Helper ---

async function handleObjectInteraction(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.interactingWithObject) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not interacting with an object.')] };
    }
    const narratorName = game.narratorName || "Narrator";
    const objectId = state.interactingWithObject;
    const liveObject = getLiveGameObject(objectId, state, game);

    if (!liveObject.interactionStates) {
        return { newState: state, messages: [createMessage('system', 'System', `You can't interact with the ${liveObject.name} in this way.`)] };
    }

    const currentStateId = liveObject.currentInteractionStateId || liveObject.defaultInteractionStateId || 'start';
    const currentInteractionState = liveObject.interactionStates[currentStateId];

    if (!currentInteractionState) {
         return { newState: state, messages: [createMessage('system', 'System', `Interaction error with ${liveObject.name}.`)] };
    }

    const availableInteractionCommands = Object.keys(currentInteractionState.commands);

    // Use AI to interpret the player's intent within the context of the interaction
    const aiResponse = await guidePlayerWithNarrator({
        promptContext: `The player is currently examining the ${liveObject.name}. Your job is to map their input to one of the available actions.`,
        gameSpecifications: game.description,
        gameState: `Interacting with: ${liveObject.name}. Current state: ${currentInteractionState.description}`,
        playerCommand: playerInput,
        availableCommands: availableInteractionCommands.join(', '),
    });

    const agentMessage = createMessage('agent', narratorName, `${aiResponse.agentResponse}`);
    const commandToExecute = aiResponse.commandToExecute.toLowerCase();
    
    const matchingCommand = availableInteractionCommands.find(cmd => cmd.toLowerCase() === commandToExecute);

    if (matchingCommand) {
        const actions = currentInteractionState.commands[matchingCommand];
        let result = processActions(state, actions, game);
        
        result.messages.unshift(agentMessage);

        // After processing actions, check for chapter completion.
        const completion = checkChapterCompletion(result.newState, game);
        if (completion.isComplete) {
            // Use a consistent way to generate the completion flag
            result.newState.flags.push(chapterCompletionFlag(result.newState.currentChapterId));
            result.messages.push(...completion.messages);
        }
        
        return result;
    } else {
        // If AI returns 'invalid' or a command not in the list, show the agent's guiding message
        // and repeat the description of the current interaction state.
        return { newState: state, messages: [agentMessage, createMessage('narrator', narratorName, currentInteractionState.description)] };
    }
}


// --- Command Handlers ---

function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    let newState = { ...state, flags: [...state.flags] };
    targetName = targetName.toLowerCase();
    const narratorName = game.narratorName || "Narrator";
    
    // Check inventory first
    const itemInInventory = state.inventory
        .map(id => chapter.items[id])
        .find(item => item?.name.toLowerCase().includes(targetName));

    if (itemInInventory) {
        const flag = examinedObjectFlag(itemInInventory.id);
        const isAlreadyExamined = newState.flags.includes(flag);
        
        const message = createMessage(
            'narrator', 
            narratorName, 
            itemInInventory.description,
            'image',
            { id: itemInInventory.id, game, state: newState, showEvenIfExamined: true }
        );
        
        if (!isAlreadyExamined) {
            newState.flags.push(flag);
        }

        return { newState, messages: [message] };
    }
  
    // Then check objects in location
    const targetObjectId = location.objects.find(id => 
        chapter.gameObjects[id]?.name.toLowerCase().includes(targetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, state, game);
        const flag = examinedObjectFlag(liveObject.id);
        
        const actions: Action[] = [];
        let messageContent: string;
        
        const onExamine = liveObject.onExamine;

        if (liveObject.isLocked && onExamine?.locked) {
            messageContent = onExamine.locked.message;
            actions.push(...(onExamine.locked.actions || []));
        } else if (!liveObject.isLocked && onExamine?.unlocked) {
            messageContent = onExamine.unlocked.message;
            actions.push(...(onExamine.unlocked.actions || []));
        } else {
             messageContent = onExamine?.default?.message || `You examine the ${liveObject.name}.`;
             actions.push(...(onExamine?.default?.actions || []));
        }
        
        let actionResult = processActions(newState, actions, game);
        
        const mainMessage = createMessage(
            'narrator',
            narratorName,
            messageContent,
            'image',
            { id: liveObject.id, game, state: actionResult.newState, showEvenIfExamined: true }
        );
        
        if (!actionResult.newState.flags.includes(flag)) {
            actionResult.newState.flags.push(flag);
        }
        
        actionResult.messages.unshift(mainMessage);
        
        return actionResult;
    }

    return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" here.`)] };
}


function handleTake(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const newState = { ...state, inventory: [...state.inventory], objectStates: {...state.objectStates} };
  targetName = targetName.toLowerCase();
  const narratorName = game.narratorName || "Narrator";
  
  // Find the object that *contains* the item we want to take.
  for (const objId of location.objects) {
    const liveObject = getLiveGameObject(objId, newState, game);
    
    // Find the specific item by name within the object's potential items.
    const itemToTakeId = (liveObject.items || []).find(itemId => 
        chapter.items[itemId]?.name.toLowerCase() === targetName
    );

    if (itemToTakeId) {
        const itemToTake = chapter.items[itemToTakeId];

        if (!itemToTake.isTakable) {
            return { newState, messages: [createMessage('narrator', narratorName, itemToTake.onTake?.failMessage || `You can't take the ${itemToTake.name}.`)] };
        }
        
        if (newState.inventory.includes(itemToTake.id)) {
            return { newState, messages: [createMessage('system', 'System', `You already have the ${itemToTake.name}.`)] };
        }

        newState.inventory.push(itemToTake.id);
        
        const currentObjectItems = liveObject.items || [];
        const newObjectItems = currentObjectItems.filter(id => id !== itemToTake.id);
        newState.objectStates[objId] = { ...newState.objectStates[objId], items: newObjectItems };

        const actions = itemToTake.onTake?.successActions || [];
        const result = processActions(newState, actions, game);
        result.messages.unshift(createMessage('narrator', narratorName, itemToTake.onTake?.successMessage || `You take the ${itemToTake.name}.`));
        return result;
    }
  }
  
  return { newState, messages: [createMessage('system', 'System', `You can't take that.`)] };
}

function handleGo(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const currentLocation = chapter.locations[state.currentLocationId];
    targetName = targetName.toLowerCase();
    const narratorName = game.narratorName || "Narrator";

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
                createMessage('narrator', narratorName, targetLocation.description)
            ]
        };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You can't go there.`)] };
}


function handleUse(state: PlayerState, itemName: string, objectName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  const narratorName = game.narratorName || "Narrator";
  
  const itemInInventory = state.inventory
    .map(id => chapter.items[id])
    .find(i => i?.name.toLowerCase().includes(itemName));
  
  const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase().includes(objectName));

  if (!itemInInventory) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't have a ${itemName}.`)] };
  }
  
  if (!targetObjectId) {
    return { newState: state, messages: [createMessage('system', 'System', `You don't see a ${objectName} here.`)] };
  }
  
  const targetObject = getLiveGameObject(targetObjectId, state, game);

  if (targetObject.isLocked && targetObject.unlocksWith === itemInInventory?.id) {
    let newState = { ...state, objectStates: { ...state.objectStates }};
    newState.objectStates[targetObject.id] = { ...newState.objectStates[targetObject.id], isLocked: false };
    
    const actions = targetObject.onUnlock?.actions || [];
    const result = processActions(newState, actions, game);
    result.messages.unshift(createMessage('narrator', narratorName, targetObject.onUnlock?.successMessage || `You use the ${itemInInventory.name} on the ${targetObject.name}. It unlocks!`));

    return result;
  }

  return { newState: state, messages: [createMessage('narrator', narratorName, `That doesn't seem to work.`)] };
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
        
        const startActions = npc.startConversationActions || [];
        const actionResult = processActions(newState, startActions, game);
newState = actionResult.newState;
        messages.push(...actionResult.messages);

        messages.unshift(createMessage('system', 'System', `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`));
        
        const welcomeMessage = (npc as NPC).welcomeMessage || "Hello.";
        
        const flag = examinedObjectFlag(npc.id);

        const npcMessage = createMessage(
            npc.id as NpcId,
            npc.name,
            `"${welcomeMessage}"`,
            'image',
            { id: npc.id, game, state: newState, showEvenIfExamined: true }
        );
        messages.push(npcMessage);


        if (!newState.flags.includes(flag)) {
            newState.flags.push(flag);
        }

        return { newState, messages };
    }
    
    return { newState: state, messages: [createMessage('system', 'System', `There is no one called "${npcName}" here.`)] };
}

function handleLook(state: PlayerState, game: Game, summary: string): CommandResult {
  const narratorName = game.narratorName || "Narrator";
  return { newState: state, messages: [createMessage('narrator', narratorName, summary.trim())] };
}


function handleInventory(state: PlayerState, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    if (state.inventory.length === 0) {
        return { newState: state, messages: [createMessage('system', 'System', 'Your inventory is empty.')] };
    }
    const itemNames = state.inventory.map(id => {
        const item = chapter.items[id];
        if (item) return `• ${item.name}`;
        return null;
    }).filter(Boolean).join('\n');
    return { newState: state, messages: [createMessage('system', 'System', `You are carrying:\n${itemNames}`)] };
}

function handlePassword(state: PlayerState, command: string, game: Game): CommandResult {
    // Robustly find the phrase in quotes
    const phraseMatch = command.match(/"(.*?)"/);
    if (!phraseMatch) {
        return { newState: state, messages: [createMessage('system', 'System', 'Invalid password format. Please enclose the password phrase in quotes, e.g., password <object> "<phrase>"')] };
    }
    const phrase = phraseMatch[1];
    
    // Find where the phrase starts
    const phraseStartIndex = command.indexOf(`"${phrase}"`);

    // The object name is everything between "password" and the start of the phrase
    const commandVerb = "password";
    // Find the beginning of the object name
    const commandVerbIndex = command.toLowerCase().indexOf(commandVerb);
    
    if (commandVerbIndex === -1) {
        return { newState: state, messages: [createMessage('system', 'System', `Invalid password format. Could not find the word "password" in command: "${command}"`)] };
    }

    const objectName = command.substring(commandVerbIndex + commandVerb.length, phraseStartIndex).trim();

    if (!objectName || !phrase) {
        return { newState: state, messages: [createMessage('system', 'System', `Invalid password format. Could not determine object or phrase from command: "${command}"`)] };
    }

    return processPassword(state, objectName, phrase, game);
}


function processPassword(state: PlayerState, objectName: string, phrase: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    
    const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase().includes(objectName.toLowerCase()));

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${objectName}" here.`)] };
    }
    
    const targetObject = getLiveGameObject(targetObjectId, state, game);

    if (!targetObject.isLocked) {
        return { newState: state, messages: [createMessage('system', 'System', `The ${targetObject.name} is already unlocked.`)] };
    }
    
    const expectedPhrase = (targetObject.unlocksWithPhrase || "").trim().toLowerCase();
    const actualPhrase = phrase.trim().toLowerCase();

    if (expectedPhrase === actualPhrase) {
        let newState = { ...state, objectStates: { ...state.objectStates }};
        newState.objectStates[targetObject.id] = { ...newState.objectStates[targetObject.id], isLocked: false };
        
        const actions = targetObject.onUnlock?.actions || [];
        const result = processActions(newState, actions, game);
        
        const unlockMessage = createMessage(
            'narrator', 
            narratorName, 
            targetObject.onUnlock?.successMessage || "It unlocks!", 
            'image', 
            { id: targetObject.id, game, state: result.newState, showEvenIfExamined: true }
        );
        result.messages.unshift(unlockMessage);

        if (!result.newState.flags.includes(examinedObjectFlag(targetObject.id))) {
            result.newState.flags.push(examinedObjectFlag(targetObject.id));
        }
        
        return result;
    }

    return { newState: state, messages: [createMessage('narrator', narratorName, targetObject.onUnlock?.failMessage || 'That password doesn\'t work.')] };
}

// --- Chapter Completion Check ---
const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;

function checkChapterCompletion(state: PlayerState, game: Game): { isComplete: boolean; messages: Message[] } {
    const chapter = game.chapters[state.currentChapterId];
    const completionFlag = chapterCompletionFlag(state.currentChapterId);

    if (!chapter.objectives || state.flags.includes(completionFlag)) {
        return { isComplete: false, messages: [] };
    }
    
    const allObjectivesMet = chapter.objectives.every(obj => state.flags.includes(obj.flag));

    if (allObjectivesMet) {
        const messages: Message[] = [];
        const narratorName = game.narratorName || "Narrator";
        if (chapter.completionVideo) {
            messages.push(createMessage('narrator', narratorName, chapter.completionVideo, 'video'))
        }
        if(chapter.postChapterMessage) {
            messages.push(createMessage('agent', narratorName, chapter.postChapterMessage));
        }
        return { isComplete: true, messages };
    }
    
    return { isComplete: false, messages: [] };
}


// --- Main Action ---

export async function processCommand(
  currentState: PlayerState,
  playerInput: string
): Promise<CommandResult> {
  const game = gameCartridge;
  const lowerInput = playerInput.toLowerCase();
  const chapter = game.chapters[currentState.currentChapterId];
  const narratorName = game.narratorName || "Narrator";
  const completionFlag = chapterCompletionFlag(currentState.currentChapterId);

  // Post-chapter state
  if (currentState.flags.includes(completionFlag)) {
      if (chapter.nextChapter?.transitionCommand && lowerInput.includes(chapter.nextChapter.transitionCommand)) {
          return {
              newState: currentState, // In future, this would change state to next chapter
              messages: [createMessage('system', 'System', `Transitioning to ${chapter.nextChapter.title}... (Not yet implemented)`)]
          };
      }
      return {
          newState: currentState,
          messages: [createMessage('agent', narratorName, chapter.postChapterMessage || "Let's move on.")]
      };
  }

  // Dev command to complete a chapter
  if (playerInput.startsWith('dev:complete_')) {
    const chapterId = playerInput.replace('dev:complete_', '') as ChapterId;
    const targetChapter = game.chapters[chapterId];

    if (targetChapter) {
        let newState = { ...currentState };
        
        targetChapter.objectives?.forEach(obj => {
            if (!newState.flags.includes(obj.flag)) {
                newState.flags = [...newState.flags, obj.flag];
            }
        });
        
        const completion = checkChapterCompletion(newState, game);
        let messages = [createMessage('system', 'System', `DEV: ${targetChapter.title} flags set to complete.`)];

        if (completion.isComplete) {
          newState.flags.push(chapterCompletionFlag(chapterId));
          messages.push(...completion.messages);
        }
        
        return { newState, messages };
    }
  }

  // Handle special interaction states first.
  if (currentState.activeConversationWith) {
      return await handleConversation(currentState, playerInput, game);
  }
  if (currentState.interactingWithObject) {
      return await handleObjectInteraction(currentState, playerInput, game);
  }

    // --- Password Command Fast Path ---
    // Create a dedicated path for the password command to make it more reliable.
    if (lowerInput.includes('password') && lowerInput.includes('"')) {
        const agentMessage = createMessage('agent', narratorName, "Let's see if that works...");
        const result = handlePassword(currentState, playerInput, game);
        // Prepend the agent message only if the command didn't fail with a system message
        if (!result.messages.some(m => m.sender === 'system')) {
            result.messages.unshift(agentMessage);
        }
        return result;
    }


  // AI processing for general commands
  try {
    const location = chapter.locations[currentState.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, currentState, game));
    const objectNames = objectsInLocation.map(obj => obj.name);
    const npcNames = location.npcs.map(id => chapter.npcs[id]?.name).filter(Boolean) as string[];
    
    let lookAroundSummary = `${location.description}\n\n`;
    if(objectNames.length > 0) {
      lookAroundSummary += `You can see the following objects:\n${objectNames.map(name => `• ${name}`).join('\n')}\n`;
    }
    if(npcNames.length > 0) {
      lookAroundSummary += `\nYou see the following people here:\n${npcNames.map(name => `• ${name}`).join('\n')}`;
    }
    
    let gameStateSummaryForAI = `
      CHAPTER GOAL: ${chapter.goal}.
      CURRENT LOCATION: ${location.name}.
      INVENTORY: ${currentState.inventory.map(id => chapter.items[id]?.name).filter(Boolean).join(', ') || 'empty'}.
      VISIBLE OBJECTS: ${objectNames.join(', ')}.
      VISIBLE NPCS: ${npcNames.join(', ')}.
    `;


    const aiResponse = await guidePlayerWithNarrator({
        promptContext: game.promptContext || '',
        gameSpecifications: game.description,
        gameState: gameStateSummaryForAI,
        playerCommand: playerInput,
        availableCommands: AVAILABLE_COMMANDS.join(', '),
    });

    const agentMessage = createMessage('agent', narratorName, `${aiResponse.agentResponse}`);
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
                result = handleUse(currentState, onMatch[1].trim(), onMatch[2].trim(), game);
            } else {
                result = { newState: currentState, messages: [createMessage('system', 'System', 'Please specify what to use and what to use it on, e.g., "use key on desk".')] };
            }
            break;
        case 'talk':
             result = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
             break;
        case 'look':
             if (restOfCommand.startsWith('around')) {
                 result = handleLook(currentState, game, lookAroundSummary);
             } else if (restOfCommand.startsWith('behind')) {
                 const targetName = restOfCommand.replace('behind ', '').trim();
                 const targetObject = objectsInLocation.find(obj => obj.name.toLowerCase().includes(targetName));
                 if (targetObject?.onFailure?.['look behind']) {
                     result = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure['look behind'])] };
                 } else if (targetObject) {
                     result = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure?.default || `You look behind the ${targetObject.name} and see nothing out of the ordinary.`)] };
                 } else {
                     result = { newState: currentState, messages: [createMessage('narrator', narratorName, "You don't see that here.")] };
                 }
             } else {
                // If it's just "look" or "look at [something]", treat as examine
                result = handleExamine(currentState, restOfCommand.replace('at ', ''), game);
             }
             break;
        case 'inventory':
            result = handleInventory(currentState, game);
            break;
        case 'password':
            result = handlePassword(currentState, commandToExecute, game);
            break;
        case 'invalid':
             // The AI has determined the command is invalid. Just show the agent's message.
             return { newState: currentState, messages: [agentMessage] };
        default:
            // This handles generic verbs like 'move', 'break' that are not standard commands
            const targetObject = objectsInLocation.find(obj => restOfCommand.includes(obj.name.toLowerCase()));
            if (targetObject) {
                const failureMessage = targetObject.onFailure?.[verb] || targetObject.onFailure?.default;
                if (failureMessage) {
                    result = { newState: currentState, messages: [createMessage('narrator', narratorName, failureMessage)] };
                } else {
                    // Fallback if no specific failure message is found
                    result = { newState: currentState, messages: [agentMessage] };
                }
            } else {
                // Fallback if no target object is identified, or it's a pure conversational input
                result = { newState: currentState, messages: [agentMessage] }; 
            }
            break;
    }
    
    // Check for chapter completion
    const completion = checkChapterCompletion(result.newState, game);
    let finalMessages = [...result.messages];

    if (completion.isComplete && !result.newState.flags.includes(completionFlag)) {
        result.newState.flags.push(completionFlag);
        finalMessages.push(...completion.messages);
    }
    
    // Only add the agent's message if the command was successful and didn't come from the system.
    const hasSystemMessage = result.messages.some(m => m.sender === 'system');

    if (!hasSystemMessage) {
        finalMessages.unshift(agentMessage);
    }
    
    return {
        newState: result.newState,
        messages: finalMessages,
    };

  } catch (error) {
    console.error('Error processing command with GenKit:', error);
    if (error instanceof Error) {
        return {
          newState: currentState,
          messages: [createMessage('system', 'System', `Sorry, an error occurred while processing your command: ${error.message}`)],
        };
    }
    return {
      newState: currentState,
      messages: [createMessage('system', 'System', 'Sorry, an unknown error occurred while processing your command.')],
    };
  }
}
