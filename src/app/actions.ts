
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { selectNpcResponse } from '@/ai/flows/select-npc-response';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Action, Chapter, ChapterId } from '@/lib/game/types';


// --- Utility Functions ---

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
                messages.push(createMessage(action.sender, senderName, action.content, action.messageType, action.imageId));
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

  const allSearchableIds: (GameObjectId | ItemId)[] = [
    ...location.objects,
    ...state.inventory
  ];
  
  const targetId = allSearchableIds.find(id => {
      const isGameObject = id in chapter.gameObjects;
      const item = isGameObject ? chapter.gameObjects[id as GameObjectId] : chapter.items[id as ItemId];
      // Allow partial matches, e.g. "chalkboard" matches "Chalkboard Menu"
      return item.name.toLowerCase().includes(targetName);
  });


  if (targetId) {
    const isGameObject = targetId in chapter.gameObjects;
    if (isGameObject) {
        const targetObject = getLiveGameObject(targetId as GameObjectId, state, game);

        if (targetObject.isOpenable && targetObject.isLocked && targetObject.unlocksWithUrl) {
            const actions = targetObject.onExamineLockedActions || [];
            const result = processActions(newState, actions, game);
            const message = `${targetObject.description} A mini-game opens on your device: ${targetObject.unlocksWithUrl}`;
            result.messages.unshift(createMessage('narrator', narratorName, message, 'image', targetObject.id));
            return result;
        }

        if (targetObject.isOpenable && !targetObject.isLocked) {
            const actions: Action[] = [{ type: 'START_INTERACTION', objectId: targetObject.id as GameObjectId, interactionStateId: targetObject.defaultInteractionStateId || 'start' }];
            const result = processActions(newState, actions, game);
             const liveObject = getLiveGameObject(targetObject.id as GameObjectId, result.newState, game);
             const interactionState = liveObject.interactionStates?.[liveObject.currentInteractionStateId || 'start'];

            result.messages.push(createMessage('narrator', narratorName, interactionState?.description || targetObject.unlockedDescription || `You open the ${targetObject.name}.`));
            return result;
        }
        
         const message = createMessage(
            'narrator', 
            narratorName, 
            `You examine the ${targetObject.name}. ${targetObject.description}`,
            targetObject.image ? 'image' : 'text',
            targetObject.id
         );
         return {
            newState: state,
            messages: [message],
        };
    } else {
         const targetItem = chapter.items[targetId as ItemId];
         return {
            newState: state,
            messages: [createMessage('narrator', narratorName, `You examine the ${targetItem.name}. ${targetItem.description}`)],
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
  const narratorName = game.narratorName || "Narrator";
  
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

            return { newState, messages: [createMessage('narrator', narratorName, `You take the ${itemToTake.name}.`)] };
        }
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
    
    return { newState, messages: [createMessage('narrator', narratorName, `You use the ${itemInInventory.name} on the ${targetObject.name}. It unlocks with a click!`)] };
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
    const narratorName = game.narratorName || "Narrator";
    
    const targetObjectId = location.objects.find(objId => chapter.gameObjects[objId]?.name.toLowerCase() === objectName.trim().toLowerCase());

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
        
        const actions: Action[] = targetObject.onUnlockActions || [];
        const result = processActions(newState, actions, game);
        
        const liveObject = getLiveGameObject(targetObject.id, result.newState, game);
        const interactionState = liveObject.interactionStates?.[liveObject.currentInteractionStateId || 'start'];
        
        const unlockMessage = createMessage('narrator', narratorName, `You speak the words, and the ${targetObject.name} unlocks with a soft click.`, 'image', liveObject.unlockedImage ? liveObject.id : undefined);
        result.messages.unshift(unlockMessage);

        result.messages.push(createMessage('narrator', narratorName, interactionState?.description || liveObject.unlockedDescription || `You open the ${liveObject.name}.`));
        
        return result;
    }

    return { newState: state, messages: [createMessage('system', 'System', 'That password doesn\'t work.')] };
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
      const result = handleObjectInteraction(currentState, playerInput, game);
      const commandToExecute = playerInput.toLowerCase();
      const didRunAction = result.messages.some(m => m.sender !== 'narrator'); // A bit of a hack
      // If the direct command handler didn't find anything, try the AI
      if(!didRunAction || commandToExecute.includes("examine") || commandToExecute.includes("look")) {
         // Fall through to AI
      } else {
        return result;
      }
  }

  // Handle structured commands that the AI struggles with.
  if (playerInput.toLowerCase().startsWith('password for')) {
      return handlePassword(currentState, playerInput, game);
  }

  // AI processing for general commands
  try {
    const location = chapter.locations[currentState.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, currentState, game));
    const objectStates = objectsInLocation.map(obj => `${obj.name} is ${obj.isLocked ? 'locked' : 'unlocked'}`).join('. ');
    const objectNames = objectsInlocaion.map(obj => obj.name);
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
      LOCATION DESCRIPTION: ${lookAroundSummary.trim()}.
      OBJECT STATES: ${objectStates}.
    `;

    if(currentState.interactingWithObject) {
        const object = getLiveGameObject(currentState.interactingWithObject, currentState, game);
        const interactionStateId = object.currentInteractionStateId || object.defaultInteractionStateId || 'start';
        const interactionState = object.interactionStates?.[interactionStateId];
        gameStateSummaryForAI += `\nINTERACTING WITH: The ${object.name}. The current state is: ${interactionState?.description}`;
    }


    const aiResponse = await guidePlayerWithNarrator({
        promptContext: game.promptContext || '',
        gameSpecifications: game.description,
        gameState: gameStateSummaryForAI,
        playerCommand: playerInput,
        availableCommands: AVAILABLE_COMMANDS.join(', '),
    });

    const agentMessage = createMessage('agent', narratorName, `${aiResponse.agentResponse}`);
    const commandToExecute = aiResponse.commandToExecute.toLowerCase();
    
    if (commandToExecute === 'invalid') {
        return {
            newState: currentState,
            messages: [agentMessage],
        };
    }
    
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
        case 'watch':
        case 'read':
             if (currentState.interactingWithObject) {
                result = handleObjectInteraction(currentState, commandToExecute, game);
             } else {
                 result = { newState: currentState, messages: [createMessage('system', 'System', "You need to be examining something to do that.")] };
             }
             break;
        default:
             result = { newState: currentState, messages: [createMessage('system', 'System', "I don't understand that command.")] };
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
