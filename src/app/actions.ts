
'use server';

import {
  guidePlayerWithNarrator,
  generateStoryFromLogs
} from '@/ai';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import type { Game, SerializableGame, Item, Location, Message, PlayerState, GameObject, NpcId, NPC, GameObjectId, GameObjectState, ItemId, Flag, Effect, Chapter, ChapterId, ImageDetails, GameId, User, TokenUsage, Story, Portal, CommandResult, CellId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
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
import { handleDrop } from '@/lib/game/actions/handle-drop';
import { handleSearch } from '@/lib/game/actions/handle-search';
import { handleBreak } from '@/lib/game/actions/handle-break';
import { handleCombine } from '@/lib/game/actions/handle-combine';
import { handleClose } from '@/lib/game/actions/handle-close';
import { handleCall } from '@/lib/game/actions/handle-call';
import { handleDeviceCommand } from '@/lib/game/actions/handle-device-command';
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
            messages.push(createMessage('narrator', narratorName, chapter.postChapterMessage));
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
            // User exists, but check if player state and logs exist
            console.log(`Existing user found: ${userId}. Checking for player state and logs...`);
            const stateRef = doc(firestore, 'player_states', `${userId}_${game.id}`);
            const logRef = doc(firestore, 'logs', `${userId}_${game.id}`);

            const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);

            // Recreate if state is missing OR logs are missing/empty
            const logsAreValid = logSnap.exists() && logSnap.data()?.messages?.length > 0;

            if (!stateSnap.exists() || !logsAreValid) {
                console.log(`Player state or logs missing/empty for ${userId}. Recreating...`);
                const freshState = getInitialState(game);
                const initialMessages = await createInitialMessages(freshState, game);
                await logAndSave(userId, game.id, freshState, initialMessages);
            }

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
        // Create video message with proper image property
        const videoMessage = createMessage('narrator', narratorName, chapter.introMessage || 'Watch this video to begin your journey...', 'video');
        // Manually set the image property since this isn't entity-based media
        videoMessage.image = {
            url: chapter.introductionVideo,
            description: 'Introduction video',
            hint: 'intro'
        };
        messages.push(videoMessage);
    } else if (chapter.introMessage) {
        // Use chapter-specific intro message if no video
        messages.push(createMessage('narrator', narratorName, chapter.introMessage));
    }

    // Use location intro message (first-time entry) or fall back to scene description
    const introText = location.introMessage || location.sceneDescription;
    messages.push(createMessage('narrator', narratorName, introText));

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
        } else {
            currentState = getInitialState(game);
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

        const systemName = "System";

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
        } else if (currentState.activeDeviceFocus) {
            // DEVICE FOCUS MODE: Route commands to device-specific handler
            effects = await handleDeviceCommand(currentState, safePlayerInput, game);
            if (effects.length > 0) {
                const result = await processEffects(currentState, effects, game);
                currentState = result.newState;
                allMessagesForSession.push(...result.messages);
            }

            await logAndSave(userId, gameId, currentState, allMessagesForSession);
            return { newState: currentState, messages: allMessagesForSession };
        } else if (lowerInput === 'restart') {
            return await resetGame(userId);
        } else if (lowerInput.startsWith('/password ')) {
            // EXPLICIT PASSWORD COMMAND: /password <phrase>
            // This removes ambiguity - player explicitly indicates they're entering a password
            const passwordPhrase = safePlayerInput.substring(10).trim(); // Remove "/password " prefix

            if (!currentState.currentFocusId || currentState.focusType !== 'object') {
                const needsFocusMessage = createMessage('system', systemName, game.systemMessages.needsFocus);
                allMessagesForSession.push(needsFocusMessage);
            } else {
                // Route directly to password handler
                effects = await handlePassword(currentState, passwordPhrase, game);
                if (effects.length > 0) {
                    const result = await processEffects(currentState, effects, game);
                    currentState = result.newState;
                    allMessagesForSession.push(...result.messages);
                }
            }

            await logAndSave(userId, gameId, currentState, allMessagesForSession);
            return { newState: currentState, messages: allMessagesForSession };
        } else if (lowerInput === '/map') {
            // SHOW MAP: Display the current chapter's map
            const currentChapter = game.chapters[currentState.currentChapterId];

            // Chapter-specific maps
            const chapterMaps: Record<string, string> = {
                'ch1-the-cafe': 'https://res.cloudinary.com/dg912bwcc/image/upload/v1762686189/Cafe_Blueprint_pv01xp.png',
                // Add more chapters as needed
            };

            const mapUrl = chapterMaps[currentState.currentChapterId] || chapterMaps['ch1-the-cafe'];

            const mapMessage = createMessage(
                'narrator',
                game.narratorName || 'Narrator',
                `Here's the map for ${currentChapter?.title || 'the current area'}:`,
                'image',
                {
                    url: mapUrl,
                    description: `Map of ${currentChapter?.title || 'the area'}`,
                    hint: 'location map'
                }
            );
            allMessagesForSession.push(mapMessage);

            await logAndSave(userId, gameId, currentState, allMessagesForSession);
            return { newState: currentState, messages: allMessagesForSession };
        } else {
            // Let the AI interpret the command (natural language - could be anything!)
            const location = game.locations[currentState.currentLocationId];

            // IMPORTANT: Use VisibilityResolver to get ALL visible entities
            // This includes entities revealed via REVEAL_FROM_PARENT (children of containers)
            const { VisibilityResolver } = await import('@/lib/game/engine');
            const visibleEntities = VisibilityResolver.getVisibleEntities(currentState, game);

            // Get names of all visible objects
            let visibleEntityNames: string[] = [];
            for (const objectId of visibleEntities.objects) {
                const obj = game.gameObjects[objectId as GameObjectId];
                if (obj) {
                    visibleEntityNames.push(obj.name);
                }
            }

            // Get names of all visible items (including inventory)
            for (const itemId of visibleEntities.items) {
                const item = game.items[itemId as ItemId];
                if (item) {
                    visibleEntityNames.push(item.name);
                }
            }

            // Get names of all visible NPCs
            const visibleNpcNames: string[] = [];
            for (const npcId of visibleEntities.npcs) {
                const npc = game.npcs[npcId as NpcId];
                if (npc) {
                    visibleNpcNames.push(npc.name);
                    visibleEntityNames.push(npc.name);
                }
            }

            const { output: aiResponse, usage } = await guidePlayerWithNarrator({
                promptContext: game.promptContext || '',
                gameState: JSON.stringify({
                    ...currentState,
                    world: undefined, // Too large for AI context
                    stories: undefined, // Not needed for AI
                    counters: undefined, // Analytics only
                }, null, 2),
                playerCommand: safePlayerInput,
                availableCommands: AVAILABLE_COMMANDS.join(', '),
                visibleObjectNames: visibleEntityNames,
                visibleNpcNames: visibleNpcNames,
            });

            if (aiResponse.agentResponse) {
                let systemMessage = createMessage('system', systemName, `${aiResponse.agentResponse}`, 'text', undefined, usage);
                allMessagesForSession.push(systemMessage);
            }

            const commandToExecute = aiResponse.commandToExecute.toLowerCase();

            const verbMatch = commandToExecute.match(/^(\w+)\s*/);
            const verb = verbMatch ? verbMatch[1] : commandToExecute;
            const restOfCommand = commandToExecute.substring((verbMatch ? verbMatch[0].length : verb.length)).trim();

            console.log('[processCommand] Verb:', verb, 'RestOfCommand:', restOfCommand);

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
                     // NEW: handleTalk returns Effect[]
                     effects = await handleTalk(currentState, restOfCommand.replace('to ', ''), game);
                     break;
                 case 'call':
                 case 'dial':
                     // NEW: handleCall returns Effect[]
                     effects = await handleCall(currentState, restOfCommand, game);
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
                    // Support "open X with Y" pattern
                    const openWithMatch = restOfCommand.match(/^(.*?)\s+(?:with|using)\s+(.*)$/);
                    if (openWithMatch) {
                        console.log('[processCommand] OPEN pattern matched - target:', openWithMatch[1], 'item:', openWithMatch[2]);
                        // Redirect to use handler for "open X with Y"
                        const openTarget = openWithMatch[1].trim().replace(/"/g, '');
                        const openItem = openWithMatch[2].trim().replace(/"/g, '');
                        effects = await handleUse(currentState, openItem, openTarget, game);
                    } else {
                        effects = await handleOpen(currentState, restOfCommand.replace(/"/g, ''), game);
                    }
                    break;
                case 'read':
                    // NEW: handleRead returns Effect[]
                    // Support "read X with Y" pattern
                    const readWithMatch = restOfCommand.match(/^(.*?)\s+(?:with|on|using)\s+(.*)$/);
                    if (readWithMatch) {
                        console.log('[processCommand] READ pattern matched - target:', readWithMatch[1], 'item:', readWithMatch[2]);
                        // For reading, the syntax is "read TARGET with TOOL"
                        // The target needs the tool, so we check target's onRead handlers
                        // This is different from general USE where we "use ITEM on TARGET"
                        const readTarget = readWithMatch[1].trim().replace(/"/g, '');
                        const readTool = readWithMatch[2].trim().replace(/"/g, '');
                        console.log('[processCommand] Calling handleUse with tool:', readTool, 'on target:', readTarget);
                        effects = await handleUse(currentState, readTool, readTarget, game);
                    } else {
                        effects = await handleRead(currentState, restOfCommand.replace(/"/g, ''), game);
                    }
                    break;
                case 'password':
                case 'say':
                case 'enter':
                    // NEW: handlePassword returns Effect[] and requires focus
                    effects = await handlePassword(currentState, commandToExecute, game);
                    break;
                case 'drop':
                case 'discard':
                    // NEW: handleDrop returns Effect[]
                    effects = await handleDrop(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'search':
                    // NEW: handleSearch returns Effect[]
                    effects = await handleSearch(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'break':
                case 'smash':
                case 'destroy':
                    // NEW: handleBreak returns Effect[]
                    effects = await handleBreak(currentState, restOfCommand.replace(/"/g, ''), game);
                    break;
                case 'combine':
                case 'merge':
                    // NEW: handleCombine returns Effect[]
                    const combineMatch = restOfCommand.match(/^(.*?)\s+(with|and)\s+(.*)$/);
                    if (combineMatch) {
                        const item1 = combineMatch[1].trim().replace(/"/g, '');
                        const item2 = combineMatch[3].trim().replace(/"/g, '');
                        effects = await handleCombine(currentState, item1, item2, game);
                    } else {
                        effects = [{
                            type: 'SHOW_MESSAGE',
                            speaker: 'system',
                            content: 'Use "combine item1 with item2" to combine two items.'
                        }];
                    }
                    break;
                case 'close':
                case 'goodbye':
                case 'bye':
                    // End conversation if active
                    if (currentState.activeConversationWith) {
                        const npc = game.npcs[currentState.activeConversationWith];
                        effects = [
                            {
                                type: 'SHOW_MESSAGE',
                                speaker: currentState.activeConversationWith,
                                senderName: npc?.name || 'NPC',
                                content: `"${npc?.goodbyeMessage || 'Goodbye.'}"`,
                                messageType: 'text'
                            },
                            {
                                type: 'SHOW_MESSAGE',
                                speaker: 'system',
                                content: `You ended the conversation with ${npc?.name || 'the NPC'}. Type your next command to continue.`
                            },
                            {type: 'END_CONVERSATION'}
                        ];
                    } else {
                        effects = [{
                            type: 'SHOW_MESSAGE',
                            speaker: 'system',
                            content: "You're not currently in a conversation."
                        }];
                    }
                    break;
                case 'exit':
                    // Check if there's a target object to close
                    if (restOfCommand && restOfCommand.trim()) {
                        // NEW: handleClose returns Effect[] - close an object
                        effects = await handleClose(currentState, restOfCommand.replace(/"/g, ''), game);
                    } else if (currentState.interactingWithObject) {
                        // Legacy: exit interaction
                        effects = [{type: 'END_INTERACTION'}];
                    } else if (currentState.activeConversationWith) {
                        // End conversation (same as goodbye)
                        const npc = game.npcs[currentState.activeConversationWith];
                        effects = [
                            {
                                type: 'SHOW_MESSAGE',
                                speaker: currentState.activeConversationWith,
                                senderName: npc?.name || 'NPC',
                                content: `"${npc?.goodbyeMessage || 'Goodbye.'}"`,
                                messageType: 'text'
                            },
                            {
                                type: 'SHOW_MESSAGE',
                                speaker: 'system',
                                content: `You ended the conversation with ${npc?.name || 'the NPC'}. Type your next command to continue.`
                            },
                            {type: 'END_CONVERSATION'}
                        ];
                    } else if (currentState.currentFocusId) {
                        // Legacy: clear focus - return to room-level view
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
                console.log('[processCommand] Processing', effects.length, 'effects from verb:', verb);
                console.log('[processCommand] Effects:', effects.map(e => e.type));
                const result = await processEffects(currentState, effects, game);
                currentState = result.newState;  // FIX: Use newState, not state!
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

export async function resetGame(userId: string): Promise<CommandResult & { shouldReload?: boolean }> {
    if (!userId) {
        throw new Error("User ID is required to reset the game.");
    }
    const game = await getGameData(GAME_ID);
    if (!game) {
        throw new Error("Could not load game data to reset game.");
    }
    const gameId = game.id;

    // In development mode, delete all user data and signal a reload
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        const { firestore } = initializeFirebase();
        const userRef = doc(firestore, 'users', userId);
        const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
        const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

        try {
            console.log(`[RESET] Deleting all data for dev user: ${userId}`);
            await Promise.all([
                deleteDoc(userRef),
                deleteDoc(stateRef),
                deleteDoc(logRef)
            ]);
            console.log(`[RESET] Successfully deleted user, state, and logs for ${userId}`);

            // Return signal to reload the browser
            return {
                newState: getInitialState(game),
                messages: [],
                shouldReload: true
            };
        } catch (error) {
            console.error("[RESET] Error deleting user data:", error);
            throw new Error("Failed to delete user data. Please try again.");
        }
    }

    // In production, just reset state and logs without deleting user
    const freshState = getInitialState(game);
    const initialMessages = await createInitialMessages(freshState, game);
    await logAndSave(userId, gameId, freshState, initialMessages);

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

    let playerState = stateSnap.data() as PlayerState;
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

    const { newState } = await processEffects(playerState, [{
        type: 'SET_STORY',
        story: newStory,
    }], game);

    await setDoc(stateRef, newState);

    return { newState };
}
