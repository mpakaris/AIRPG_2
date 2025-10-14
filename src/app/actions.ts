
'use server';

import { guidePlayerWithNarrator } from '@/ai/flows/guide-player-with-narrator';
import { selectNpcResponse } from '@/ai/flows/select-npc-response';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Action, Chapter, ChapterId, ImageDetails, GameId, User } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getInitialState } from '@/lib/game-state';
import { dispatchMessage } from '@/lib/whinself-service';


// --- Utility Functions ---
const examinedObjectFlag = (id: GameObjectId | ItemId | NpcId) => `examined_${id}` as Flag;
const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;


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
        
        let shouldShowImage = true;
        
        if (showEvenIfExamined !== true) {
            if (isAlreadyExamined) {
                shouldShowImage = false;
            }
        }

        if (shouldShowImage) {
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


function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): GameObject & GameObjectState {
    const chapter = game.chapters[state.currentChapterId];
    const baseObject = chapter.gameObjects[id];
    const objectState = state.objectStates[id] || {};
    // Important: The order of spread is crucial. Start with the base, then layer the dynamic state on top.
    // This ensures cartridge defaults are respected but can be overridden by saved state.
    return { ...baseObject, ...objectState };
}

type CommandResult = {
  newState: PlayerState | null;
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
        return processActions(state, [{type: 'END_CONVERSATION'}], game);
    }

    if (!npc.cannedResponses || npc.cannedResponses.length === 0) {
        return {
            newState: state,
            messages: [createMessage(npc.id as NpcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing to say.'}"`)]
        };
    }

    const cannedResponsesForAI = npc.cannedResponses.map(r => ({ topic: r.topic, response: r.response }));

    const aiResponse = await selectNpcResponse({
        playerInput: playerInput,
        npcName: npc.name,
        cannedResponses: cannedResponsesForAI,
    });
    
    const chosenTopic = aiResponse.topic;
    const selectedResponse = npc.cannedResponses.find(r => r.topic === chosenTopic)
        || npc.cannedResponses.find(r => r.topic === 'default');

    if (!selectedResponse) {
        // This is a final fallback and should ideally not be reached if a 'default' exists.
        return {
            newState: state,
            messages: [createMessage(npc.id as NpcId, npc.name, `"I don't know what to say."`)]
        };
    }

    const initialMessage = createMessage(npc.id as NpcId, npc.name, `"${selectedResponse.response}"`);
    
    const actionsToProcess = selectedResponse.actions || [];
    let actionResult = processActions(state, actionsToProcess, game);
    
    // Prepend the NPC's own message to the messages generated by the actions. This is CRITICAL.
    actionResult.messages.unshift(initialMessage);

    return actionResult;
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
        
        return result;
    } else {
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
            { id: itemInInventory.id, game, state: newState, showEvenIfExamined: isAlreadyExamined ? false : true }
        );
        
        if (!isAlreadyExamined) {
            newState.flags.push(flag);
        }

        return { newState, messages: [message] };
    }
  
    const targetObjectId = location.objects.find(id => 
        chapter.gameObjects[id]?.name.toLowerCase().includes(targetName)
    );

    if (targetObjectId) {
        const liveObject = getLiveGameObject(targetObjectId, state, game);
        const flag = examinedObjectFlag(liveObject.id);
        const isAlreadyExamined = newState.flags.includes(flag);
        
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
            { id: liveObject.id, game, state: actionResult.newState, showEvenIfExamined: isAlreadyExamined ? false : true }
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
  
  for (const objId of location.objects) {
    const liveObject = getLiveGameObject(objId, newState, game);
    
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

    if (targetName === 'next_chapter') {
        const completion = checkChapterCompletion(state, game);
        if (completion.isComplete) {
            const nextChapterId = chapter.nextChapter?.id;
            if (nextChapterId && game.chapters[nextChapterId]) {
                const nextChapter = game.chapters[nextChapterId];
                const newState: PlayerState = {
                    ...state,
                    currentChapterId: nextChapterId,
                    currentLocationId: nextChapter.startLocationId,
                    activeConversationWith: null,
                    interactingWithObject: null,
                };
                const newLocation = nextChapter.locations[newState.currentLocationId];
                return {
                    newState,
                    messages: [
                        createMessage('system', 'System', `You are now in Chapter: ${nextChapter.title}.`),
                        createMessage('narrator', narratorName, newLocation.description),
                    ]
                };
            } else {
                 return { newState: state, messages: [createMessage('system', 'System', `There is no next chapter defined.`)] };
            }
        } else {
            return { newState: state, messages: [createMessage('agent', narratorName, `Hold on, Burt. We still need to ${chapter.goal.toLowerCase()} here in ${currentLocation.name}. We can't move on until we've figured that out.`)] };
        }
    }

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
            { id: npc.id, game, state: newState, showEvenIfExamined: false }
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
    const narratorName = game.narratorName || "Narrator";
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, state, game));
    
    const commandLower = command.toLowerCase();

    const targetObject = objectsInLocation.find(obj => {
        if (!obj.unlocksWithPhrase) return false;
        // Check if the object's name is in the command
        return commandLower.includes(obj.name.toLowerCase());
    });

    if (!targetObject || !targetObject.unlocksWithPhrase) {
        // Fallback for when the AI might just send the password without the object
        const fallbackObject = objectsInLocation.find(obj => obj.isLocked && obj.unlocksWithPhrase);
        if (fallbackObject) {
            return processPassword(state, command, fallbackObject, game);
        }
        return { newState: state, messages: [createMessage('system', 'System', 'You can\'t use a password on anything here, or you need to be more specific.')] };
    }
    
    return processPassword(state, command, targetObject, game);
}

function processPassword(state: PlayerState, command: string, targetObject: GameObject & GameObjectState, game: Game): CommandResult {
    const narratorName = game.narratorName || "Narrator";
    const commandLower = command.toLowerCase();
    const objectNameLower = targetObject.name.toLowerCase();
    
    // Extract the phrase by removing the verb and object name from the command
    let phrase = commandLower.replace("password", "").replace(objectNameLower, "").trim();
    phrase = phrase.replace(/^"|"$/g, '').replace(/^for |^is /,'').trim();

    if (!phrase) {
        return { newState: state, messages: [createMessage('narrator', narratorName, 'You need to specify a password phrase.')] };
    }
    
    const expectedPhrase = targetObject.unlocksWithPhrase;

    if (phrase.toLowerCase() === expectedPhrase!.toLowerCase()) {
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
    } else {
        return { newState: state, messages: [createMessage('narrator', narratorName, targetObject.onUnlock?.failMessage || 'That password doesn\'t work.')] };
    }
}

function checkChapterCompletion(state: PlayerState, game: Game): { isComplete: boolean; messages: Message[] } {
    const chapter = game.chapters[state.currentChapterId];
    const isAlreadyComplete = state.flags.includes(chapterCompletionFlag(state.currentChapterId));

    if (isAlreadyComplete || !chapter.objectives || chapter.objectives.length === 0) {
        return { isComplete: isAlreadyComplete, messages: [] }; 
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

// --- User Management ---
export async function findOrCreateUser(userId: string): Promise<{ user: User | null; isNew: boolean; error?: string }> {
    if (!userId || typeof userId !== 'string' || userId.trim().length < 5) {
        return { user: null, isNew: false, error: "Invalid User ID provided." };
    }
    
    const { firestore } = initializeFirebase();
    const userRef = doc(firestore, 'users', userId);
    
    try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const newUser: User = {
                id: userId,
                username: `Player_${userId.substring(userId.length - 4)}`,
                purchasedGames: [gameCartridge.id],
            };
            await setDoc(userRef, newUser);
            console.log(`New user created: ${userId}`);
            return { user: newUser, isNew: true };
        } else {
            console.log(`Existing user found: ${userId}`);
            return { user: userSnap.data() as User, isNew: false };
        }
    } catch (error) {
        console.error("Error in findOrCreateUser:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred accessing the database.";
        return { user: null, isNew: false, error: errorMessage };
    }
}


// --- Main Action ---

export async function processCommand(
  userId: string,
  playerInput: string
): Promise<{newState: PlayerState, messages: Message[]}> {
  const game = gameCartridge;
  const gameId = game.id;

  if (!userId) {
    return {
        newState: getInitialState(game),
        messages: [createMessage('system', 'System', 'Error: User ID is missing. Cannot process command.')]
    };
  }

  const { firestore } = initializeFirebase();
  const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

  const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);
  
  let currentState: PlayerState;
  if (stateSnap.exists()) {
      currentState = stateSnap.data() as PlayerState;
  } else {
      currentState = getInitialState(game);
  }

  // Defensive check: If chapter is still invalid, reset.
  if (!game.chapters[currentState.currentChapterId]) {
      console.warn(`Invalid chapter ID '${currentState.currentChapterId}' found in processCommand. Resetting to initial state.`);
      currentState = getInitialState(game);
  }
  
  let allMessagesForSession: Message[] = [];
  if (logSnap.exists()) {
      allMessagesForSession = logSnap.data()?.messages || [];
  } else {
      allMessagesForSession = createInitialMessages();
  }

  let finalResult: {newState: PlayerState, messages: Message[]};

  try {
    const chapter = game.chapters[currentState.currentChapterId];
    const narratorName = game.narratorName || "Narrator";
    const lowerInput = playerInput.toLowerCase().trim();

    const playerMessage = createMessage('player', 'You', playerInput);
    allMessagesForSession.push(playerMessage);
    
    let commandHandlerResult: CommandResult;

    // Dev commands
    if (lowerInput.startsWith('dev:complete_')) {
        const chapterId = lowerInput.replace('dev:complete_', '') as ChapterId;
        const targetChapter = game.chapters[chapterId];
        let messages = [createMessage('system', 'System', `DEV: ${targetChapter.title} flags set to complete.`)];
        let newState = { ...currentState };
        if (targetChapter) {
            targetChapter.objectives?.forEach(obj => {
                if (!newState.flags.includes(obj.flag)) {
                    newState.flags = [...newState.flags, obj.flag];
                }
            });
        }
        commandHandlerResult = { newState, messages };
    }
    // Context-specific commands
    else if (currentState.activeConversationWith) {
        commandHandlerResult = await handleConversation(currentState, playerInput, game);
    } else if (currentState.interactingWithObject && (lowerInput === 'exit' || lowerInput === 'close')) {
        commandHandlerResult = processActions(currentState, [{type: 'END_INTERACTION'}], game);
    } else if (currentState.interactingWithObject) {
        commandHandlerResult = await handleObjectInteraction(currentState, playerInput, game);
    }
    // Main command parsing logic
    else {
        const location = chapter.locations[currentState.currentLocationId];
        const objectsInLocation = location.objects.map(id => getLiveGameObject(id, currentState, game));
        const objectNames = objectsInLocation.map(obj => obj.name);
        const npcNames = location.npcs.map(id => chapter.npcs[id]?.name).filter(Boolean) as string[];
        const isChapterComplete = checkChapterCompletion(currentState, game).isComplete;
        
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

        if (isChapterComplete && chapter.nextChapter) {
            gameStateSummaryForAI += `\nCHAPTER COMPLETE. The player is ready to move on to the next chapter: '${chapter.nextChapter.title}'.`
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
        const [verb, ...args] = commandToExecute.split(' ');
        const restOfCommand = args.join(' ');
        
        switch (verb) {
            case 'examine':
                commandHandlerResult = handleExamine(currentState, restOfCommand, game);
                break;
            case 'take':
                commandHandlerResult = handleTake(currentState, restOfCommand, game);
                break;
            case 'go':
                commandHandlerResult = handleGo(currentState, restOfCommand.replace('to ', ''), game);
                break;
            case 'use':
                const onMatch = restOfCommand.match(/(.*) on (.*)/);
                if (onMatch) {
                    commandHandlerResult = handleUse(currentState, onMatch[1].trim(), onMatch[2].trim(), game);
                } else {
                    commandHandlerResult = { newState: currentState, messages: [createMessage('system', 'System', 'Please specify what to use and what to use it on, e.g., "use key on desk".')] };
                }
                break;
            case 'talk':
                 commandHandlerResult = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
                 break;
            case 'look':
                 if (restOfCommand.startsWith('around')) {
                     commandHandlerResult = handleLook(currentState, game, lookAroundSummary);
                 } else if (restOfCommand.startsWith('behind')) {
                     const targetName = restOfCommand.replace('behind ', '').trim();
                     const targetObject = objectsInLocation.find(obj => obj.name.toLowerCase().includes(targetName));
                     if (targetObject?.onFailure?.['look behind']) {
                         commandHandlerResult = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure['look behind'])] };
                     } else if (targetObject) {
                         commandHandlerResult = { newState: currentState, messages: [createMessage('narrator', narratorName, targetObject.onFailure?.default || `You look behind the ${targetObject.name} and see nothing out of the ordinary.`)] };
                     } else {
                         commandHandlerResult = { newState: currentState, messages: [createMessage('narrator', narratorName, "You don't see that here.")] };
                     }
                 } else {
                    commandHandlerResult = handleExamine(currentState, restOfCommand.replace('at ', ''), game);
                 }
                 break;
            case 'inventory':
                commandHandlerResult = handleInventory(currentState, game);
                break;
            case 'password':
                commandHandlerResult = handlePassword(currentState, commandToExecute, game);
                break;
            case 'invalid':
                 commandHandlerResult = { newState: currentState, messages: [agentMessage] };
                 break;
            default:
                const targetObject = objectsInLocation.find(obj => restOfCommand.includes(obj.name.toLowerCase()));
                if (targetObject) {
                    const failureMessage = targetObject.onFailure?.[verb] || targetObject.onFailure?.default;
                    if (failureMessage) {
                        commandHandlerResult = { newState: currentState, messages: [createMessage('narrator', narratorName, failureMessage)] };
                    } else {
                        commandHandlerResult = { newState: currentState, messages: [agentMessage] };
                    }
                } else {
                    commandHandlerResult = { newState: currentState, messages: [agentMessage] }; 
                }
                break;
        }
        
        const hasSystemMessage = commandHandlerResult.messages.some(m => m.sender === 'system');
        // Only add agent message if the command wasn't "invalid" and didn't already produce a system message
        if (verb !== 'invalid' && !hasSystemMessage) {
            commandHandlerResult.messages.unshift(agentMessage);
        }
    }
    
    // --- Finalization ---
    const newMessagesFromServer = commandHandlerResult.messages;
    allMessagesForSession.push(...newMessagesFromServer);

    let finalState = commandHandlerResult.newState;

    if (finalState) {
        const completion = checkChapterCompletion(finalState, game);
        const isNewlyComplete = completion.isComplete && !finalState.flags.includes(chapterCompletionFlag(finalState.currentChapterId));

        if (isNewlyComplete) {
            finalState.flags = [...finalState.flags, chapterCompletionFlag(finalState.currentChapterId)];
            allMessagesForSession.push(...completion.messages);
        }
    }
    
    finalResult = {
        newState: finalState || currentState,
        messages: allMessagesForSession,
    };
    
    await logAndSave(userId, gameId, finalResult.newState, finalResult.messages);
    
    if (process.env.NODE_ENV === 'development') {
        for (const message of newMessagesFromServer) {
             if (message.sender !== 'player') {
                await dispatchMessage(userId, message);
            }
        }
    }
    
    return finalResult;

  } catch (error) {
    console.error('Error processing command:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    finalResult = {
      newState: currentState,
      messages: [createMessage('system', 'System', `Sorry, an error occurred: ${errorMessage}`)],
    };
    // We only need to save and dispatch the error message
    await logAndSave(userId, gameId, currentState, finalResult.messages);
    if (process.env.NODE_ENV === 'development') {
        await dispatchMessage(userId, finalResult.messages[0]);
    }
    
    return { newState: currentState, messages: allMessagesForSession.concat(finalResult.messages) };
  }
}

export async function resetGame(userId: string): Promise<{newState: PlayerState, messages: Message[]}> {
    if (!userId) {
        throw new Error("User ID is required to reset the game.");
    }
    const game = gameCartridge;
    const gameId = game.id;
    const freshState = getInitialState(game);
    const initialMessages = createInitialMessages();

    await logAndSave(userId, gameId, freshState, initialMessages);

    if (process.env.NODE_ENV === 'development') {
        for (const message of initialMessages) {
            await dispatchMessage(userId, message);
        }
    }

    return { newState: freshState, messages: initialMessages };
}

function createInitialMessages(): Message[] {
    const game = gameCartridge;
    const initialGameState = getInitialState(game);
    const startChapter = game.chapters[initialGameState.currentChapterId];
    const newInitialMessages: Message[] = [];
  
    const welcomeMessage = {
      id: crypto.randomUUID(),
      sender: 'narrator' as const,
      senderName: game.narratorName || 'Narrator',
      type: 'text' as const,
      content: `Welcome to ${game.title}. Your journey begins.`,
      timestamp: Date.now(),
    };
    newInitialMessages.push(welcomeMessage);

    if (startChapter.introductionVideo) {
      newInitialMessages.push({
        id: crypto.randomUUID(),
        sender: 'narrator' as const,
        senderName: game.narratorName || 'Narrator',
        type: 'video' as const,
        content: startChapter.introductionVideo,
        timestamp: Date.now() + 1,
      });
    }
  
    return newInitialMessages;
  };


export async function logAndSave(
  userId: string,
  gameId: GameId,
  state: PlayerState,
  messages: Message[]
): Promise<void> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    console.error('Firestore is not initialized.');
    return;
  }

  const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

  try {
    // Overwrite the state and logs completely on each turn
    if (state) {
        await setDoc(stateRef, state, { merge: false });
    }
    
    // Overwrite the entire log with the full session history
    await setDoc(logRef, { messages: messages }, { merge: false });

  } catch (error) {
    console.error('Failed to save game state or logs:', error);
  }
}

export async function sendWhinselfTestMessage(userId: string, message: string): Promise<void> {
    try {
        await dispatchMessage(userId, {
            id: crypto.randomUUID(),
            sender: 'player',
            senderName: 'Player',
            type: 'text',
            content: message,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error("Failed to send Whinself test message:", error);
        // We re-throw the error so the client-side can catch it and display a toast.
        if (error instanceof Error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
        throw new Error('An unknown error occurred while sending the message.');
    }
}

    