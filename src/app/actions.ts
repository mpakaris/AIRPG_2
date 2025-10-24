

'use server';

import { 
  guidePlayerWithNarrator,
  generateStoryFromLogs
} from '@/ai';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Effect, Chapter, ChapterId, ImageDetails, GameId, User, TokenUsage, Story, Portal, LocationState } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getInitialState } from '@/lib/game-state';
import { dispatchMessage } from '@/lib/whinself-service';
import { processEffects, createMessage } from '@/lib/game/actions/process-effects';
import { getLiveGameObject } from '@/lib/game/actions/helpers';
import { handleConversation } from '@/lib/game/actions/handle-conversation';
import { handleExamine } from '@/lib/game/actions/handle-examine';
import { handleGo } from '@/lib/game/actions/handle-go';
import { handleInventory } from '@/lib/game/actions/handle-inventory';
import { handleLook } from '@/lib/game/actions/handle-look';
import { handleMove } from '@/lib/game/actions/handle-move';
import { handleOpen } from '@/lib/game/actions/handle-open';
import { handleRead } from '@/lib/game/actions/handle-read';
import { handleTake } from '@/lib/game/actions/handle-take';
import { handleTalk } from '@/lib/game/actions/handle-talk';
import { handleUse } from '@/lib/game/actions/handle-use';
import { processPassword } from '@/lib/game/actions/process-password';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { handleHelp } from '@/lib/game/actions/handle-help';

const GAME_ID = 'blood-on-brass' as GameId;

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;
const examinedObjectFlag = (id: string) => `examined_${id}` as Flag;

export type CommandResult = {
  newState: PlayerState | null;
  messages: Message[];
  resultType?: 'ALREADY_UNLOCKED';
  targetObjectName?: string;
};


// --- Data Loading ---

/**
 * Loads the entire game structure.
 * In development, it loads from the local `cartridge.ts` file for speed.
 * In test/production, it loads from Firestore.
 */
export async function getGameData(gameId: GameId): Promise<Game | null> {
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        console.log("DEV MODE: Loading game data from local cartridge.ts");
        // Ensure the imported cartridge has the correct ID, or find the correct one if needed.
        if (gameCartridge.id === gameId) {
            return gameCartridge;
        }
        return null;
    }

    console.log(`PROD/TEST MODE: Loading game data for ${gameId} from Firestore.`);
    const { firestore } = initializeFirebase();
    
    try {
        const gameRef = doc(firestore, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
            console.error(`Game with ID ${gameId} not found in Firestore.`);
            return null;
        }

        const gameData = gameSnap.data() as Game;

        // Helper function to fetch all documents from a sub-collection
        const fetchSubCollection = async (subCollectionName: string) => {
            const snap = await getDocs(collection(firestore, `games/${gameId}/${subCollectionName}`));
            return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
        };

        // Fetch all sub-collections in parallel
        const [
            chapters,
            locations,
            gameObjects,
            items,
            npcs,
            portals
        ] = await Promise.all([
            fetchSubCollection('chapters'),
            fetchSubCollection('locations'),
            fetchSubCollection('game_objects'),
            fetchSubCollection('items'),
            fetchSubCollection('npcs'),
            fetchSubCollection('portals')
        ]);

        gameData.chapters = chapters as Record<string, Chapter>;
        gameData.locations = locations as Record<string, Location>;
        gameData.gameObjects = gameObjects as Record<string, GameObject>;
        gameData.items = items as Record<string, Item>;
        gameData.npcs = npcs as Record<string, NPC>;
        gameData.portals = portals as Record<string, Portal>;

        return gameData;

    } catch(error) {
        console.error("Error fetching game data from Firestore:", error);
        return null;
    }
}


// --- Chapter & Game Completion ---

function checkChapterCompletion(state: PlayerState, game: Game): { isComplete: boolean; messages: Message[] } {
    const chapter = game.chapters[game.startChapterId]; // Simplified for now
    const isAlreadyComplete = state.flags.includes(chapterCompletionFlag(game.startChapterId));

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
        const game = await getGameData(GAME_ID);
        if (!game) {
            return { user: null, isNew: false, error: "Game data could not be loaded." };
        }

        if (!userSnap.exists()) {
            const newUser: User = {
                id: userId,
                username: `Player_${userId.substring(userId.length - 4)}`,
                purchasedGames: [game.id],
                createdAt: Date.now(),
            };
            await setDoc(userRef, newUser);
            console.log(`New user created: ${userId}. Initializing game state.`);
            
            // Immediately create and save initial game state and logs for the new user.
            const freshState = getInitialState(game);
            const initialMessages = await createInitialMessages(game);
            await logAndSave(userId, game.id, freshState, initialMessages);

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
  const game = await getGameData(GAME_ID);
  
  if (!game) {
      throw new Error("Critical: Game data could not be loaded. Cannot process command.");
  }

  const gameId = game.id;
  let allMessagesForSession: Message[] = [];
  let currentState: PlayerState;

  if (!userId) {
    return {
        newState: getInitialState(game),
        messages: [createMessage('system', 'System', 'Error: User ID is missing. Cannot process command.')]
    };
  }

  const { firestore } = initializeFirebase();
  const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
  const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

  try {
    const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);
    
    if (stateSnap.exists()) {
        currentState = stateSnap.data() as PlayerState;
    } else {
        currentState = getInitialState(game);
    }
  
    if (!game.locations[currentState.currentLocationId]) {
        console.warn(`Invalid location ID '${currentState.currentLocationId}' found in processCommand. Resetting to initial state.`);
        currentState = getInitialState(game);
    }
    
    if (logSnap.exists()) {
        allMessagesForSession = logSnap.data()?.messages || [];
    } else {
        allMessagesForSession = await createInitialMessages(game);
    }

    const chapter = game.chapters[game.startChapterId]; // Simplified for now
    const agentName = game.narratorName || "Agent Sharma";
    const lowerInput = playerInput.toLowerCase().trim();

    const playerMessage = createMessage('player', 'You', playerInput);
    allMessagesForSession.push(playerMessage);
    
    let commandHandlerResult: CommandResult | null = null;

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
    else if (lowerInput === '/help' || lowerInput === 'help' || lowerInput === 'hint' || lowerInput === `what's next?`) {
        commandHandlerResult = handleHelp(currentState, game);
    }
    // Conversation commands
    else if (currentState.activeConversationWith) {
        commandHandlerResult = await handleConversation(currentState, playerInput, game);
    }
    // Interaction Trap Guardrail
    else if (currentState.interactingWithObject) {
        const liveObject = getLiveGameObject(currentState.interactingWithObject, currentState, game);
        if (liveObject) {
            const interactingWith = liveObject.gameLogic;
            const mentionsAnotherObject = Object.values(game.gameObjects).some(obj => 
                obj.id !== interactingWith.id && lowerInput.includes(obj.name.toLowerCase())
            );

            if (mentionsAnotherObject) {
                const trapMessage = createMessage(
                    'agent', 
                    agentName, 
                    `Whoa there, Burt. We're zeroed in on the ${interactingWith.name} right now. If you want to check something else, we need to 'exit' this first.`
                );
                // This is a special case: we just return the message and don't change state.
                return { newState: currentState, messages: [playerMessage, trapMessage] };
            }
        }
    }
    
    // Main command parsing logic
    if (!commandHandlerResult) {
        const location = game.locations[currentState.currentLocationId];
        
        // --- Start AI Context Preparation ---
        const locationState: LocationState = currentState.locationStates[currentState.currentLocationId] || { objects: location.objects };
        const visibleObjects = locationState.objects.map(id => getLiveGameObject(id, currentState, game)).filter(Boolean) as {gameLogic: GameObject, state: GameObjectState}[];
        const visibleObjectNames = visibleObjects.map(obj => obj.gameLogic.name);

        // Add items inside open containers to the list of visible names, but ONLY if the container has been examined first.
        for (const obj of visibleObjects) {
            const hasBeenExamined = currentState.flags.includes(examinedObjectFlag(obj.gameLogic.id));
            if (obj.state.isOpen && hasBeenExamined && obj.state.items) {
                for (const itemId of obj.state.items) {
                    const item = game.items[itemId];
                    if (item) {
                        visibleObjectNames.push(item.name);
                    }
                }
            }
        }
        
        const visibleNpcNames = location.npcs.map(id => game.npcs[id]?.name).filter(Boolean) as string[];
        // --- End AI Context Preparation ---

        const { output: aiResponse, usage } = await guidePlayerWithNarrator({
            promptContext: game.promptContext || '',
            gameState: JSON.stringify({
                ...currentState,
                // Sanitize large objects from gamestate to save tokens
                objectStates: undefined,
                locationStates: undefined,
                portalStates: undefined,
                npcStates: undefined,
                stories: undefined
            }, null, 2),
            playerCommand: playerInput,
            availableCommands: AVAILABLE_COMMANDS.join(', '),
            visibleObjectNames: visibleObjectNames,
            visibleNpcNames: visibleNpcNames,
        });

        let agentMessage = createMessage('agent', agentName, `${aiResponse.agentResponse}`, 'text', undefined, usage);
        allMessagesForSession.push(agentMessage);

        const commandToExecute = aiResponse.commandToExecute.toLowerCase();
        
        const verbMatch = commandToExecute.match(/^(\w+)\s*/);
        const verb = verbMatch ? verbMatch[1] : commandToExecute;
        const restOfCommand = commandToExecute.substring((verbMatch ? verbMatch[0].length : verb.length)).trim();
        
        switch (verb) {
            case 'examine':
            case 'look':
                if(restOfCommand === 'around') {
                     const lookAroundSummary = `${location.sceneDescription}\n\nYou can see the following objects:\n${visibleObjectNames.map(name => `• ${name}`).join('\n')}\n\nYou see the following people here:\n${visibleNpcNames.map(name => `• ${name}`).join('\n')}`;
                     commandHandlerResult = handleLook(currentState, game, lookAroundSummary);
                } else if (restOfCommand.startsWith('behind')) {
                    const target = restOfCommand.replace('behind ', '').trim();
                    commandHandlerResult = handleMove(currentState, target, game);
                } else {
                     commandHandlerResult = handleExamine(currentState, restOfCommand.replace('at ', ''), game);
                }
                break;
            case 'move':
                commandHandlerResult = handleMove(currentState, restOfCommand, game);
                break;
            case 'open':
                commandHandlerResult = await handleOpen(currentState, restOfCommand, game);
                break;
            case 'take':
            case 'pick': // Alias for take
                const target = restOfCommand.startsWith('up ') ? restOfCommand.substring(3) : restOfCommand;
                commandHandlerResult = handleTake(currentState, target, game);
                break;
            case 'go':
                commandHandlerResult = handleGo(currentState, restOfCommand.replace('to ', ''), game);
                break;
            case 'use':
                const useOnMatch = restOfCommand.match(/"(.*?)"\s+on\s+"(.*?)"/);
                if (useOnMatch) {
                    commandHandlerResult = await handleUse(currentState, useOnMatch[1].trim(), useOnMatch[2].trim(), game);
                } else {
                    commandHandlerResult = await handleUse(currentState, restOfCommand.replace(/"/g, ''), '', game);
                }
                break;
            case 'read':
                commandHandlerResult = await handleRead(currentState, restOfCommand.replace(/"/g, ''), game);
                break;
            case 'talk':
                 commandHandlerResult = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
                 break;
            case 'inventory':
                commandHandlerResult = handleInventory(currentState, game);
                break;
            case 'password':
            case 'say':
            case 'enter':
                commandHandlerResult = processPassword(currentState, commandToExecute, game);
                break;
            case 'close':
            case 'exit':
                if (currentState.interactingWithObject) {
                    commandHandlerResult = processEffects(currentState, [{type: 'END_INTERACTION'}], game);
                } else {
                    commandHandlerResult = { newState: currentState, messages: [] };
                }
                break;
            case 'invalid':
                 commandHandlerResult = { newState: currentState, messages: [] };
                 break;
            case 'help':
                commandHandlerResult = handleHelp(currentState, game);
                break;
            default:
                const targetObject = visibleObjects.find(obj => restOfCommand.includes(obj.gameLogic.name.toLowerCase()));
                if (targetObject && targetObject.gameLogic.fallbackMessages) {
                    const fallbackMessages = targetObject.gameLogic.fallbackMessages;
                    const failureMessage = fallbackMessages?.[verb as keyof typeof fallbackMessages] || fallbackMessages?.default;
                    if (failureMessage) {
                        commandHandlerResult = { newState: currentState, messages: [createMessage('narrator', "Narrator", failureMessage)] };
                    } else {
                        commandHandlerResult = { newState: currentState, messages: [] };
                    }
                } else {
                    commandHandlerResult = { newState: currentState, messages: [] }; 
                }
                break;
        }
    }
    
    // --- Finalization ---
    // Ensure commandHandlerResult and its messages are valid before proceeding
    if (commandHandlerResult && commandHandlerResult.messages) {
        // Now it's safe to push messages
        allMessagesForSession.push(...commandHandlerResult.messages);
    }


    let finalState = commandHandlerResult?.newState;

    if (finalState) {
        const completion = checkChapterCompletion(finalState, game);
        if (completion.isComplete) {
            const isNewlyComplete = !currentState.flags.includes(chapterCompletionFlag(game.startChapterId));
            if (isNewlyComplete) {
                finalState.flags = [...finalState.flags, chapterCompletionFlag(game.startChapterId)];
                allMessagesForSession.push(...completion.messages);
            }
        }
    }
    
    const finalResult = {
        newState: finalState || currentState,
        messages: allMessagesForSession,
    };
    
    await logAndSave(userId, gameId, finalResult.newState, finalResult.messages);
    
    // In dev, send new messages (that aren't from the player) to the webhook simulator
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        const newMessagesFromServer = finalResult.messages.filter(
            m => m.timestamp >= playerMessage.timestamp && m.sender !== 'player'
        );
        for (const message of newMessagesFromServer) {
            await dispatchMessage(userId, message);
        }
    }
    
    return finalResult;

  } catch (error) {
    console.error('Error processing command:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponseMessage = createMessage('system', 'System', `Sorry, an error occurred: ${errorMessage}`);
    
    const messagesWithError = [...allMessagesForSession, errorResponseMessage];
    
    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const stateSnap = await getDoc(stateRef);
    
    let stateToSave: PlayerState;
    if (stateSnap.exists()) {
        stateToSave = stateSnap.data() as PlayerState;
    } else {
        const game = await getGameData(GAME_ID);
        if (!game) throw new Error("Could not load game data to create initial state.");
        stateToSave = getInitialState(game);
    }

    await logAndSave(userId, gameId, stateToSave, messagesWithError);
    
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        await dispatchMessage(userId, errorResponseMessage);
    }
    
    return { newState: stateToSave, messages: messagesWithError };
  }
}

export async function resetGame(userId: string): Promise<{newState: PlayerState, messages: Message[]}> {
    if (!userId) {
        throw new Error("User ID is required to reset the game.");
    }
    const game = await getGameData(GAME_ID);
    if (!game) {
        throw new Error("Could not load game data to reset game.");
    }
    const gameId = game.id;
    const freshState = getInitialState(game);
    const initialMessages = await createInitialMessages(game);

    await logAndSave(userId, gameId, freshState, initialMessages);

    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        for (const message of initialMessages) {
            await dispatchMessage(userId, message);
        }
    }

    return { newState: freshState, messages: initialMessages };
}

async function createInitialMessages(game: Game): Promise<Message[]> {
    const initialGameState = getInitialState(game);
    const startChapter = game.chapters[initialGameState.currentChapterId];
    const newInitialMessages: Message[] = [];
  
    const welcomeMessage = {
      id: crypto.randomUUID(),
      sender: 'narrator' as const,
      senderName: 'Narrator',
      type: 'text' as const,
      content: `Welcome to ${game.title}. Your journey begins.`,
      timestamp: Date.now(),
    };
    newInitialMessages.push(welcomeMessage);

    if (startChapter.introductionVideo) {
      newInitialMessages.push({
        id: crypto.randomUUID(),
        sender: 'narrator' as const,
        senderName: 'Narrator',
        type: 'video' as const,
        content: startChapter.introductionVideo,
        timestamp: Date.now() + 1,
      });
    }

    // Add initial location description
    const initialLocation = game.locations[initialGameState.currentLocationId];
    if (initialLocation) {
        const locationMessage: Message = {
            id: crypto.randomUUID(),
            sender: 'narrator' as const,
            senderName: 'Narrator',
            type: initialLocation.sceneImage ? 'image' : 'text',
            content: initialLocation.sceneDescription,
            timestamp: Date.now() + 2,
        };
        if (initialLocation.sceneImage) {
            locationMessage.image = initialLocation.sceneImage;
        }
        newInitialMessages.push(locationMessage);
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
    if (state) {
        await setDoc(stateRef, state, { merge: false });
    }
    
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
        if (error instanceof Error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
        throw new Error('An unknown error occurred while sending the message.');
    }
}


export async function generateStoryForChapter(userId: string, gameId: GameId, chapterId: ChapterId): Promise<{ newState: PlayerState }> {
    const { firestore } = initializeFirebase();
    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

    const [stateSnap, logSnap, game] = await Promise.all([
        getDoc(stateRef), 
        getDoc(logRef),
        getGameData(gameId)
    ]);

    if (!stateSnap.exists() || !logSnap.exists()) {
        throw new Error("Player state or logs not found. Cannot generate story.");
    }
    if (!game) {
        throw new Error("Game data could not be loaded. Cannot generate story.");
    }

    const playerState = stateSnap.data() as PlayerState;
    const allMessages = logSnap.data()?.messages as Message[];
    const chapter = game.chapters[chapterId];

    if (!chapter) {
        throw new Error(`Chapter ${chapterId} not found.`);
    }

    const messageLogsForAI = allMessages.map(m => ({ senderName: m.senderName, content: m.content }));

    const { output: storyOutput, usage: storyUsage } = await generateStoryFromLogs({
        storyStyleGuide: game.storyStyleGuide || 'You are a master storyteller. Turn the following log into a story.',
        gameDescription: game.description,
        chapterTitle: chapter.title,
        storyGenerationDetails: chapter.storyGenerationDetails,
        messageLogs: messageLogsForAI,
    });

    const newStory: Story = {
        chapterId: chapterId,
        title: chapter.title,
        content: storyOutput.story,
        usage: storyUsage,
    };

    const newState: PlayerState = {
        ...playerState,
        stories: {
            ...playerState.stories,
            [chapterId]: newStory,
        },
    };

    await setDoc(stateRef, newState);

    return { newState };
}
