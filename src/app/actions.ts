
'use server';

import {
  guidePlayerWithNarrator,
  generateStoryFromLogs
} from '@/ai';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Effect, Chapter, ChapterId, ImageDetails, GameId, User, TokenUsage, Story, Portal, LocationState, CommandResult, CellId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getInitialState } from '@/lib/game-state';
import { dispatchMessage } from '@/lib/whinself-service';
import { createMessage } from '@/lib/utils';
import { getLiveGameObject } from '@/lib/game/utils/helpers';
import { handleConversation } from '@/lib/game/actions/handle-conversation';
import { handleExamine } from '@/lib/game/actions/handle-examine';
import { handleGo } from '@/lib/game/actions/handle-go';
import { handleGoto } from '@/lib/game/actions/handle-goto';
import { handleInventory } from '@/lib/game/actions/handle-inventory';
import { handleLook } from '@/lib/game/actions/handle-look';
import { handleMove } from '@/lib/game/actions/handle-move';
import { handleOpen } from '@/lib/game/actions/handle-open';
import { handleRead } from '@/lib/game/actions/handle-read';
import { handleTake } from '@/lib/game/actions/handle-take';
import { handleTalk } from '@/lib/game/actions/handle-talk';
import { handleUse } from '@/lib/game/actions/handle-use';
import { handlePassword } from '@/lib/game/actions/handle-password';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { handleHelp } from '@/lib/game/actions/handle-help';
import { processEffects } from '@/lib/game/actions/process-effects';
import { GameStateManager } from '@/lib/game/engine';


const GAME_ID = 'blood-on-brass' as GameId;


// --- Data Loading ---

export async function getGameData(gameId: GameId): Promise<Game | null> {
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        console.log("DEV MODE: Loading game data from local cartridge.ts");
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

        const fetchSubCollection = async (subCollectionName: string) => {
            const snap = await getDocs(collection(firestore, `games/${gameId}/${subCollectionName}`));
            return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
        };

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
    const chapterCompletionFlagValue = `chapter_${game.startChapterId}_complete` as Flag;
    const isAlreadyComplete = GameStateManager.hasFlag(state, chapterCompletionFlagValue);

    if (isAlreadyComplete || !chapter.objectives || chapter.objectives.length === 0) {
        return { isComplete: isAlreadyComplete, messages: [] };
    }

    const allObjectivesMet = chapter.objectives.every(obj => GameStateManager.hasFlag(state, obj.flag));

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
            
            const freshState = getInitialState(game);
            const initialMessages = await createInitialMessages(freshState, game);
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


export async function createInitialMessages(state: PlayerState, game: Game): Promise<Message[]> {
    const chapter = game.chapters[game.startChapterId];
    const location = game.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    const messages: Message[] = [];
    if (chapter.introductionVideo) {
        messages.push(createMessage('narrator', narratorName, chapter.introductionVideo, 'video'));
    }
    messages.push(createMessage('narrator', narratorName, location.sceneDescription));
    return messages;
}


// --- Main Action ---

export async function processCommand(
  userId: string,
  playerInput: string
): Promise<CommandResult> {
    const safePlayerInput = playerInput || '';
    const lowerInput = safePlayerInput.toLowerCase().trim();

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
            console.log('[processCommand] ✅ Loaded state from Firestore');
            console.log('[processCommand] SD Card isVisible:', currentState.world?.['item_sd_card']?.isVisible);
            console.log('[processCommand] SD Card taken:', currentState.world?.['item_sd_card']?.taken);
        } else {
            currentState = getInitialState(game);
            console.log('[processCommand] ⚠️ No saved state found, using initial state');
        }
    
        if (!game.locations[currentState.currentLocationId]) {
            console.warn(`Invalid location ID '${currentState.currentLocationId}' found in processCommand. Resetting to initial state.`);
            currentState = getInitialState(game);
        }
        
        if (logSnap.exists() && logSnap.data()?.messages?.length > 0) {
            allMessagesForSession = logSnap.data()?.messages || [];
        } else {
            allMessagesForSession = await createInitialMessages(currentState, game);
        }

        const agentName = game.narratorName || "Agent Sharma";

        let playerMessage: Message | null = null;
        if (safePlayerInput) {
            playerMessage = createMessage('player', 'You', safePlayerInput);
            allMessagesForSession.push(playerMessage);
        }
        
        // NEW ARCHITECTURE: Handlers now return Effect[] instead of CommandResult
        let effects: Effect[] = [];

        // --- Core Command Logic ---
        if (currentState.activeConversationWith) {
            // handleConversation still uses old architecture (legacy)
            const legacyResult = await handleConversation(currentState, safePlayerInput, game);
            allMessagesForSession.push(...legacyResult.messages);
            currentState = legacyResult.newState;
        } else if (lowerInput === 'restart') {
            return await resetGame(userId);
        } else {
            // Let the AI interpret the command
            const location = game.locations[currentState.currentLocationId];
            const examinedObjectFlag = (id: string) => `examined_${id}`;

            const locationState: LocationState = currentState.locationStates?.[currentState.currentLocationId] || { objects: location.objects };
            const visibleObjects = locationState.objects.map(id => getLiveGameObject(id, currentState, game)).filter(Boolean) as {gameLogic: GameObject, state: GameObjectState}[];

            let visibleEntityNames = visibleObjects.map(obj => obj.gameLogic.name);
            visibleEntityNames.push(...currentState.inventory.map(id => game.items[id]?.name).filter(Boolean));

            for (const obj of visibleObjects) {
                const hasBeenExamined = GameStateManager.hasFlag(currentState, examinedObjectFlag(obj.gameLogic.id));
                if (obj.state.isOpen && hasBeenExamined && obj.state.items) {
                    for (const itemId of obj.state.items) {
                        const item = game.items[itemId];
                        if (item) {
                            visibleEntityNames.push(item.name);
                        }
                    }
                }
            }

            const visibleNpcNames = location.npcs.map(id => game.npcs[id]?.name).filter(Boolean) as string[];
            visibleEntityNames.push(...visibleNpcNames);

            const { output: aiResponse, usage } = await guidePlayerWithNarrator({
                promptContext: game.promptContext || '',
                gameState: JSON.stringify({
                    ...currentState,
                    objectStates: undefined, locationStates: undefined, portalStates: undefined, npcStates: undefined, stories: undefined
                }, null, 2),
                playerCommand: safePlayerInput,
                availableCommands: AVAILABLE_COMMANDS.join(', '),
                visibleObjectNames: visibleEntityNames,
                visibleNpcNames: visibleNpcNames,
            });

            if (aiResponse.agentResponse) {
                let agentMessage = createMessage('agent', agentName, `${aiResponse.agentResponse}`, 'text', undefined, usage);
                allMessagesForSession.push(agentMessage);
            }

            const commandToExecute = aiResponse.commandToExecute.toLowerCase();

            const verbMatch = commandToExecute.match(/^(\w+)\s*/);
            const verb = verbMatch ? verbMatch[1] : commandToExecute;
            const restOfCommand = commandToExecute.substring((verbMatch ? verbMatch[0].length : verb.length)).trim();

            // NEW: Route to handlers that return Effect[]
            switch (verb) {
                case 'examine':
                case 'look':
                    if (restOfCommand === 'around') {
                        // NEW: handleLook returns Effect[]
                        effects = await handleLook(currentState, game);
                    } else {
                        // NEW: handleExamine returns Effect[]
                        const examineTarget = restOfCommand.replace(/^at\s+/, '').replace(/"/g, '');
                        effects = await handleExamine(currentState, examineTarget, game);
                    }
                    break;
                case 'move':
                    // NEW: handleMove returns Effect[]
                    effects = await handleMove(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'take':
                case 'pick':
                    const targetRaw = restOfCommand.startsWith('up ') ? restOfCommand.substring(3) : restOfCommand;
                    const target = targetRaw.replace(/"/g, ''); // Strip quotes like we do for read
                    // NEW: handleTake returns Effect[]
                    effects = await handleTake(currentState, target, game);
                    break;
                case 'inventory':
                     // NEW: handleInventory returns Effect[]
                     effects = await handleInventory(currentState, game);
                     break;
                case 'help':
                case 'hint':
                    // NEW: handleHelp returns Effect[]
                    effects = await handleHelp(currentState, game);
                    break;
                case 'go':
                    // NEW: handleGo returns Effect[]
                    effects = await handleGo(currentState, restOfCommand, game);
                    break;
                case 'goto':
                case 'moveto':
                case 'shift':
                    // NEW: handleGoto changes focus without performing an action
                    effects = await handleGoto(currentState, restOfCommand, game);
                    break;
                 case 'talk':
                     // LEGACY: handleTalk uses old architecture (complex NPC state)
                     const talkResult = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
                     allMessagesForSession.push(...talkResult.messages);
                     currentState = talkResult.newState;
                     break;
                 case 'use':
                    const useOnMatch = restOfCommand.match(/^(.*?)\s+on\s+(.*)$/);
                    if (useOnMatch) {
                        // NEW: handleUse returns Effect[]
                        const useItem = useOnMatch[1].trim().replace(/"/g, '');
                        const useTarget = useOnMatch[2].trim().replace(/"/g, '');
                        effects = await handleUse(currentState, useItem, useTarget, game);
                    } else {
                        effects = await handleUse(currentState, restOfCommand.replace(/"/g, ''), '', game);
                    }
                    break;
                case 'open':
                    // NEW: handleOpen returns Effect[]
                    effects = await handleOpen(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'read':
                    // NEW: handleRead returns Effect[]
                    effects = await handleRead(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'password':
                case 'say':
                case 'enter':
                    // NEW: handlePassword returns Effect[] and requires focus
                    effects = await handlePassword(currentState, commandToExecute, game);
                    break;
                case 'close':
                case 'exit':
                    if (currentState.interactingWithObject) {
                        effects = [{type: 'END_INTERACTION'}];
                    } else if (currentState.activeConversationWith) {
                        effects = [{type: 'END_CONVERSATION'}];
                    } else if (currentState.currentFocusId) {
                        // Clear focus - return to room-level view
                        effects = [{type: 'CLEAR_FOCUS'}];
                    }
                    break;
                case 'invalid':
                     // Do nothing
                     break;
                default:
                    // Do nothing
                    break;
            }

            // NEW: Apply effects through processEffects (which includes image resolution)
            if (effects.length > 0) {
                const result = await processEffects(currentState, effects, game);
                currentState = result.newState;  // FIX: Use newState, not state!
                console.log('[processCommand] After processEffects - currentState SD Card isVisible:', currentState.world?.['item_sd_card']?.isVisible);
                console.log('[processCommand] After processEffects - currentState SD Card taken:', currentState.world?.['item_sd_card']?.taken);
                allMessagesForSession.push(...result.messages);
            }
        }

        let finalState = currentState;

        if (finalState) {
            const completion = checkChapterCompletion(finalState, game);
            if (completion.isComplete) {
                const chapterCompletionFlagValue = `chapter_${game.startChapterId}_complete` as Flag;
                const isNewlyComplete = !GameStateManager.hasFlag(currentState, chapterCompletionFlagValue);
                if (isNewlyComplete) {
                    // Use SET_FLAG effect to set completion flag
                    const completionEffects: Effect[] = [
                        { type: 'SET_FLAG', flag: chapterCompletionFlagValue, value: true }
                    ];
                    const result = GameStateManager.applyAll(completionEffects, finalState, completion.messages);
                    finalState = result.state;
                    allMessagesForSession.push(...result.messages);
                }
            }
        }
        
        const finalResult: CommandResult = {
            newState: finalState || currentState,
            messages: allMessagesForSession,
        };

        console.log('[processCommand] Before logAndSave - finalResult.newState SD Card isVisible:', finalResult.newState.world?.['item_sd_card']?.isVisible);
        console.log('[processCommand] Before logAndSave - finalResult.newState SD Card taken:', finalResult.newState.world?.['item_sd_card']?.taken);

        await logAndSave(userId, gameId, finalResult.newState, finalResult.messages);
        
        if (process.env.NEXT_PUBLIC_NODE_ENV === 'development' && playerMessage) {
            const newMessagesFromServer = finalResult.messages.filter(
                m => m.timestamp >= playerMessage!.timestamp && m.sender !== 'player'
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

export async function resetGame(userId: string): Promise<CommandResult> {
    if (!userId) {
        throw new Error("User ID is required to reset the game.");
    }
    const game = await getGameData(GAME_ID);
    if (!game) {
        throw new Error("Could not load game data to reset game.");
    }
    const gameId = game.id;
    const freshState = getInitialState(game);
    const initialMessages = await createInitialMessages(freshState, game);

    await logAndSave(userId, gameId, freshState, initialMessages);

    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        for (const message of initialMessages) {
            await dispatchMessage(userId, message);
        }
    }

    return { newState: freshState, messages: initialMessages };
}

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
        console.log('[logAndSave] Saving state to Firestore');
        console.log('[logAndSave] SD Card isVisible:', state.world?.['item_sd_card']?.isVisible);
        console.log('[logAndSave] SD Card taken:', state.world?.['item_sd_card']?.taken);
        await setDoc(stateRef, state, { merge: false });
        console.log('[logAndSave] ✅ State saved successfully');
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
