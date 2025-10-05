
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { selectNpcResponse } from '@/ai/flows/select-npc-response';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Action, Chapter, ChapterId } from '@/lib/game/types';


// --- Utility Functions ---
const examinedObjectFlag = (objectId: GameObjectId) => `examined_${objectId}` as Flag;

function createMessage(
  sender: Message['sender'],
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  imageId?: ItemId | NpcId | GameObjectId
): Message {
    let image;
    if (imageId) {
        const chapter = gameCartridge.chapters[gameCartridge.startChapterId];
        const item = chapter.items[imageId as ItemId];
        const npc = chapter.npcs[imageId as NpcId];
        const gameObject = chapter.gameObjects[imageId as GameObjectId];

        if (item?.image) {
            image = item.image;
        } else if (npc?.image) {
            image = npc.image;
        } else if (gameObject?.image) {
            image = gameObject.image;
        } else if (gameObject?.unlockedImage) {
            image = gameObject.unlockedImage;
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
    let newState = { ...initialState, objectStates: {...initialState.objectStates} };
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
                let senderName = action.senderName;
                if (action.sender === 'agent' && game.narratorName) {
                    senderName = game.narratorName;
                }

                let imageIdToShow = action.imageId;
                if (action.imageId && action.sender === 'narrator') {
                    // Check if the object has been examined before
                    const flag = examinedObjectFlag(action.imageId as GameObjectId);
                    if (newState.flags.includes(flag)) {
                        imageIdToShow = undefined; // Don't show image again
                    } else {
                        newState.flags = [...newState.flags, flag]; // Set flag for future
                    }
                }
                messages.push(createMessage(action.sender, senderName, action.content, action.messageType, imageIdToShow));
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

    const initialMessage = createMessage(npc.id as NpcId, npc.name, `"${npcMessageContent}"`);
    
    const actionResult = processActions(state, actionsToProcess, game);

    return {
        newState: actionResult.newState,
        messages: [initialMessage, ...actionResult.messages]
    };
}

// --- Object Interaction Helper ---

function handleObjectInteraction(state: PlayerState, playerInput: string, game: Game): CommandResult {
    if (!state.interactingWithObject) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not interacting with an object.')] };
    }

    const objectId = state.interactingWithObject;
    const liveObject = getLiveGameObject(objectId, state, game);
    const lowerInput = playerInput.toLowerCase().trim();

    if (!liveObject.interactionStates) {
        return { newState: state, messages: [createMessage('system', 'System', `You can't interact with the ${liveObject.name} in this way.`)] };
    }

    const currentStateId = liveObject.currentInteractionStateId || liveObject.defaultInteractionStateId || 'start';
    const currentInteractionState = liveObject.interactionStates[currentStateId];

    if (!currentInteractionState) {
         return { newState: state, messages: [createMessage('system', 'System', `Interaction error with ${liveObject.name}.`)] };
    }

    // Find a command from the current state that is included in the player's input
    const matchingCommand = Object.keys(currentInteractionState.commands).find(cmd => 
        lowerInput.includes(cmd.toLowerCase())
    );
    
    if (matchingCommand) {
        const actions = currentInteractionState.commands[matchingCommand];
        const result = processActions(state, actions, game);
        
        // After processing actions, check for chapter completion.
        const completion = checkChapterCompletion(result.newState, game);
        if (completion.isComplete) {
            // Use a consistent way to generate the completion flag
            result.newState.flags.push(chapterCompletionFlag(result.newState.currentChapterId));
            result.messages.push(...completion.messages);
        }
        
        return result;
    } else {
        const narratorName = game.narratorName || "Narrator";
        // If no command matches, just repeat the description of the current interaction state
        return { newState: state, messages: [createMessage('narrator', narratorName, currentInteractionState.description)] };
    }
}


// --- Command Handlers ---

function handleExamine(state: PlayerState, targetName: string, game: Game): CommandResult {
  const chapter = game.chapters[state.currentChapterId];
  const location = chapter.locations[state.currentLocationId];
  let newState = { ...state };
  targetName = targetName.toLowerCase();
  const narratorName = game.narratorName || "Narrator";

  // Check inventory first
  const itemInInventory = state.inventory
      .map(id => chapter.items[id])
      .find(item => item?.name.toLowerCase().includes(targetName));

  if (itemInInventory) {
      const flag = examinedObjectFlag(itemInInventory.id as unknown as GameObjectId); // Treat item ID as game object ID for flag purposes
      const imageId = !newState.flags.includes(flag) ? itemInInventory.id : undefined;
      if (imageId) {
          newState.flags = [...newState.flags, flag];
      }
      return {
          newState,
          messages: [createMessage('narrator', narratorName, itemInInventory.description, 'image', imageId)]
      };
  }
  
  // Then check objects in location
  const targetObjectId = location.objects.find(id => 
      chapter.gameObjects[id]?.name.toLowerCase().includes(targetName)
  );

  if (targetObjectId) {
      const liveObject = getLiveGameObject(targetObjectId, state, game);
      const actions: Action[] = [{ 
          type: 'SHOW_MESSAGE', 
          sender: 'narrator', 
          senderName: narratorName, 
          content: 'You examine the object.', // Default message
          imageId: liveObject.image ? liveObject.id : undefined
      }];

      if (liveObject.isLocked && liveObject.onExamine?.locked) {
          actions[0].content = liveObject.onExamine.locked.message;
          actions.push(...(liveObject.onExamine.locked.actions || []));
      } else if (!liveObject.isLocked && liveObject.onExamine?.unlocked) {
          actions[0].content = liveObject.onExamine.unlocked.message;
          if (liveObject.unlockedImage) actions[0].imageId = liveObject.id;
          actions.push(...(liveObject.onExamine.unlocked.actions || []));
      } else if (liveObject.onExamine?.default) {
          actions[0].content = liveObject.onExamine.default.message;
          actions.push(...(liveObject.onExamine.default.actions || []));
      } else {
          actions[0].content = `You examine the ${liveObject.name}.`;
      }
      
      return processActions(newState, actions, game);
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
        
        if (npc.startConversationActions) {
            const result = processActions(newState, npc.startConversationActions, game);
            newState = result.newState;
            messages.push(...result.messages);
        }

        messages.unshift(createMessage('system', 'System', `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`));
        
        const welcomeMessage = (npc as NPC).welcomeMessage || "Hello.";
        messages.push(createMessage(npc.id as NpcId, npc.name, `"${welcomeMessage}"`, 'image', npc.id));

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
    const passwordMatch = command.toLowerCase().match(/(?:password for |password) (.*?) (?:is |")?(.*)/);
    if (!passwordMatch) {
        return { newState: state, messages: [createMessage('system', 'System', 'Invalid password format. Please use: password for <object> "<phrase>"')] };
    }

    let [, objectName, phrase] = passwordMatch;
    phrase = phrase.replace(/"/g, ''); // remove quotes
    objectName = objectName.trim();

    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    
    const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase().includes(objectName));

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${objectName}" here.`)] };
    }
    
    const targetObject = getLiveGameObject(targetObjectId, state, game);

    if (!targetObject.isLocked) {
        return { newState: state, messages: [createMessage('system', 'System', `The ${targetObject.name} is already unlocked.`)] };
    }

    if (targetObject.unlocksWithPhrase?.toLowerCase() === phrase.toLowerCase()) {
        let newState = { ...state, objectStates: { ...state.objectStates }};
        newState.objectStates[targetObject.id] = { ...newState.objectStates[targetObject.id], isLocked: false };
        
        const actions = targetObject.onUnlock?.actions || [];
        const result = processActions(newState, actions, game);
        
        const unlockMessage = createMessage('narrator', narratorName, targetObject.onUnlock?.successMessage || "It unlocks!", 'image', targetObject.unlockedImage ? targetObject.id : undefined);
        result.messages.unshift(unlockMessage);
        
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

  // Handle special interaction states first. These bypass the main AI.
  if (currentState.activeConversationWith) {
      return await handleConversation(currentState, playerInput, game);
  }
  if (currentState.interactingWithObject) {
      return handleObjectInteraction(currentState, playerInput, game);
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
    
    // Handle invalid commands first
    if (verb === 'invalid') {
        const [originalVerb] = playerInput.toLowerCase().split(' ');
        const targetObject = objectsInLocation.find(obj => commandToExecute.includes(obj.name.toLowerCase()));

        if (targetObject?.onFailure?.[originalVerb]) {
             return { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure[originalVerb]!)] };
        }
        
        // Return only the agent's guiding message if no specific failure message is found
        return {
            newState: currentState,
            messages: [agentMessage],
        };
    }
    

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
            // "look" can mean "look around" or be a prefix for "look behind", etc.
            if(restOfCommand === 'around') {
                result = handleLook(currentState, game, lookAroundSummary);
            } else {
                const targetObject = objectsInLocation.find(obj => restOfCommand.includes(obj.name.toLowerCase()));
                 if (targetObject?.onFailure?.[verb]) {
                     result = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure[verb]!)] };
                 } else if (targetObject?.onFailure?.['look behind']) { // Specific check for "look behind"
                     result = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure['look behind']!)] };
                 }
                 else {
                     result = handleLook(currentState, game, lookAroundSummary); // Default to look around
                 }
            }
             break;
        case 'inventory':
            result = handleInventory(currentState, game);
            break;
        case 'password':
            result = handlePassword(currentState, commandToExecute, game);
            break;
        case 'watch':
        case 'read':
             if (currentState.interactingWithObject) {
                result = handleObjectInteraction(currentState, commandToExecute, game);
             } else {
                 result = { newState: currentState, messages: [createMessage('system', 'System', "You need to be examining something to do that.")] };
             }
             break;
        default:
            // This handles generic verbs like 'move', 'break', 'look behind'
            const targetObject = objectsInLocation.find(obj => restOfCommand.includes(obj.name.toLowerCase()));
            if (targetObject?.onFailure?.[verb]) {
                result = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure[verb]!)] };
            } else {
                result = { newState: currentState, messages: [agentMessage] }; // Default to agent's message if command is unclear
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
    return {
      newState: currentState,
      messages: [createMessage('system', 'System', 'Sorry, an error occurred while processing your command.')],
    };
  }
}
