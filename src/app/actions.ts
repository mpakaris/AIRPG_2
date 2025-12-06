
'use server';

import {
    generateStoryFromLogs
} from '@/ai';
import { initializeFirebase } from '@/firebase';
import { getInitialState } from '@/lib/game-state';
import { handleBreak } from '@/lib/game/actions/handle-break';
import { handleCall } from '@/lib/game/actions/handle-call';
import { handleClose } from '@/lib/game/actions/handle-close';
import { handleCombine } from '@/lib/game/actions/handle-combine';
import { handleConversation } from '@/lib/game/actions/handle-conversation';
import { handleDeviceCommand } from '@/lib/game/actions/handle-device-command';
import { handleDrop } from '@/lib/game/actions/handle-drop';
import { handleExamine } from '@/lib/game/actions/handle-examine';
import { handleGo } from '@/lib/game/actions/handle-go';
import { handleGoto } from '@/lib/game/actions/handle-goto';
import { handleHelp } from '@/lib/game/actions/handle-help';
import { handleContextualHelp } from '@/lib/game/actions/handle-contextual-help';
import { handleInventory } from '@/lib/game/actions/handle-inventory';
import { handleLook } from '@/lib/game/actions/handle-look';
import { handleMove } from '@/lib/game/actions/handle-move';
import { handleOpen } from '@/lib/game/actions/handle-open';
import { handlePassword } from '@/lib/game/actions/handle-password';
import { handleRead } from '@/lib/game/actions/handle-read';
import { handleSearch } from '@/lib/game/actions/handle-search';
import { handleTake } from '@/lib/game/actions/handle-take';
import { handleTalk } from '@/lib/game/actions/handle-talk';
import { handleUse } from '@/lib/game/actions/handle-use';
import { processEffects } from '@/lib/game/actions/process-effects';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { AVAILABLE_COMMANDS } from '@/lib/game/commands';
import { GameStateManager } from '@/lib/game/engine';
import type { Chapter, ChapterId, CommandResult, Effect, Flag, Game, GameId, GameObject, GameObjectId, Item, ItemId, Location, Message, NPC, NpcId, PlayerState, Portal, Story, User } from '@/lib/game/types';
import { createMessage } from '@/lib/utils';
import { extractUIMessages } from '@/lib/utils/extract-ui-messages';
import { dispatchMessage } from '@/lib/whinself-service';
import { getAllLogs, logsExist } from '@/lib/firestore/log-retrieval';
import { calculateStateDiff } from '@/lib/game/utils/state-diff';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';


const GAME_ID = 'blood-on-brass' as GameId;


// --- Helper Functions ---

/**
 * Normalizes Firestore Timestamps to plain numbers
 * Firestore returns Timestamp objects with toJSON methods that React can't serialize
 * This function recursively converts them to millisecond timestamps
 */
function normalizeTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Check if this is a Firestore Timestamp object
    if (obj?.seconds !== undefined && obj?.nanoseconds !== undefined) {
        // Convert to milliseconds
        return obj.seconds * 1000 + Math.floor(obj.nanoseconds / 1000000);
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.getTime();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeTimestamps(item));
    }

    // Handle plain objects
    if (typeof obj === 'object' && obj.constructor === Object) {
        const normalized: any = {};
        for (const key in obj) {
            normalized[key] = normalizeTimestamps(obj[key]);
        }
        return normalized;
    }

    return obj;
}

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

/**
 * Checks if chapter is complete based on happy path or legacy objectives
 *
 * Priority:
 * 1. Use happy path system if defined
 * 2. Fall back to legacy objectives system
 */
function checkChapterCompletion(state: PlayerState, game: Game): { isComplete: boolean; messages: Message[] } {
    const chapter = game.chapters[state.currentChapterId];
    const chapterCompletionFlagValue = `chapter_${state.currentChapterId}_completed` as Flag;
    const isAlreadyComplete = GameStateManager.hasFlag(state, chapterCompletionFlagValue);

    // If already marked complete, return early
    if (isAlreadyComplete) {
        return { isComplete: true, messages: [] };
    }

    let isComplete = false;

    // Priority 1: Check happy path system
    if (chapter.happyPath && chapter.happyPath.length > 0) {
        const { checkChapterCompletion: checkHappyPathCompletion } = require('@/lib/game/utils/happy-path-tracker');
        isComplete = checkHappyPathCompletion(chapter, state, game);
    }
    // Priority 2: Fall back to legacy objectives
    else if (chapter.objectives && chapter.objectives.length > 0) {
        const allObjectivesMet = chapter.objectives.every(obj =>
            GameStateManager.hasFlag(state, obj.flag)
        );
        isComplete = allObjectivesMet;
    }

    // If complete, generate completion messages
    if (isComplete) {
        const messages: Message[] = [];
        const narratorName = game.narratorName || "Narrator";

        // Show completion video
        if (chapter.completionVideo) {
            messages.push(createMessage('narrator', narratorName, chapter.completionVideo, 'video'));
        }

        // Show post-chapter message
        const completionMessage = chapter.postChapterMessage ||
            `🎉 Congratulations! You've completed "${chapter.title}"!`;
        messages.push(createMessage('narrator', narratorName, completionMessage));

        // Show next chapter prompt
        if (chapter.nextChapter) {
            messages.push(createMessage(
                'narrator',
                narratorName,
                `\nReady for the next chapter? Type "${chapter.nextChapter.transitionCommand}" to continue to "${chapter.nextChapter.title}".`
            ));
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

            const [stateSnap, logsValid] = await Promise.all([
                getDoc(stateRef),
                logsExist(firestore, userId, game.id)
            ]);

            // Recreate if state is missing OR logs are missing/empty
            if (!stateSnap.exists() || !logsValid) {
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

    // 1. Welcome message
    messages.push(createMessage('narrator', narratorName, 'Welcome to Bloodhaven! Watch the following Videos to start your journey!'));

    // 2. Chapter title
    messages.push(createMessage('narrator', narratorName, 'WALK IN JUSTICE - Burt Macklin Chronicles | Chapter I'));

    // 3. First intro video (Cutscene)
    if (chapter.introVideo1) {
        const video1Message = createMessage('narrator', narratorName, '', 'video');
        video1Message.image = {
            url: chapter.introVideo1,
            description: 'Burt Macklin - Cutscene I',
            hint: 'intro-cutscene'
        };
        messages.push(video1Message);
    }

    // 4. Second intro video (Explanation)
    if (chapter.introVideo2) {
        const video2Message = createMessage('narrator', narratorName, '', 'video');
        video2Message.image = {
            url: chapter.introVideo2,
            description: 'Introduction Explanation',
            hint: 'intro-explanation'
        };
        messages.push(video2Message);
    }

    // 5. Scene description
    const sceneText = "You are inside The Daily Grind. It's a bustling downtown cafe, smelling of coffee and rain.\n\nA stranger just placed a mysterious Metal Box in front of you, out of nowhere.\n\nWhat do you do next, Burt Macklin?";
    messages.push(createMessage('narrator', narratorName, sceneText));

    return messages;
}


// --- Main Action ---

export async function processCommand(
  userId: string,
  playerInput: string
): Promise<CommandResult> {
    const rawPlayerInput = playerInput || '';

    // 🐕 PROMPT WATCH-DOG: Validate and sanitize input
    const { validatePlayerInput, formatValidationError } = await import('@/lib/security/prompt-watch-dog');
    const validation = validatePlayerInput(rawPlayerInput);

    // If validation failed, log error and return with all existing messages
    if (!validation.isValid) {
        const errorMsg = formatValidationError(validation);
        console.log(`❌ [Prompt Watch-Dog] Blocked invalid input (${validation.violations[0]?.type})`);
        console.log(`   Original: "${rawPlayerInput.substring(0, 50)}${rawPlayerInput.length > 50 ? '...' : ''}"`);
        console.log(`   Reason: ${errorMsg}\n`);

        const game = await getGameData(GAME_ID);
        if (!game) {
            throw new Error("Critical: Game data could not be loaded.");
        }

        const gameId = game.id;
        const { firestore } = initializeFirebase();
        const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);

        // Get current state
        const stateSnap = await getDoc(stateRef);

        let currentState: PlayerState;
        let allMessagesForSession: Message[] = [];

        if (stateSnap.exists()) {
            currentState = stateSnap.data() as PlayerState;
        } else {
            currentState = getInitialState(game);
        }

        // Load logs using new helper that handles both old and new formats
        allMessagesForSession = await getAllLogs(firestore, userId, gameId);
        if (allMessagesForSession.length === 0) {
            allMessagesForSession = await createInitialMessages(currentState, game);
        }
        // Normalize timestamps for React serialization
        allMessagesForSession = normalizeTimestamps(allMessagesForSession);

        // Create a single consolidated validation error message for UI display
        const errorDisplayMessage = createMessage(
            'system',
            '🛡️ Security Filter',
            `⚠️ Input Blocked\n\nYour input was blocked by the security filter:\n"${rawPlayerInput}"\n\n${errorMsg}`
        );

        // Create consolidated validation error log entry (similar to EnhancedCommandLog)
        const validationErrorLog: any = {
            type: 'validation_error',
            errorId: `error_${Date.now()}`,
            timestamp: Date.now(),

            // Original unfiltered input (what the player prompted)
            originalInput: rawPlayerInput,

            // What the system replied to the player
            systemResponse: errorMsg,

            // Validation details (what the watchdog filtered and why)
            violations: validation.violations.map(v => ({
                type: v.type,
                severity: v.severity,
                message: v.message,
            })),

            // Metadata (additional filtering information)
            metadata: {
                originalLength: validation.metadata.originalLength,
                sanitizedLength: validation.metadata.sanitizedLength,
                strippedChars: validation.metadata.strippedChars,
            },

            // Context (where this happened in the game)
            context: {
                chapterId: currentState.currentChapterId,
                locationId: currentState.currentLocationId,
                userId: userId,
                gameId: gameId,
            },

            // UI Messages (consolidated single error message for display)
            uiMessages: [errorDisplayMessage]
        };

        // Add to messages array (single consolidated entry)
        const updatedMessages = [...allMessagesForSession, validationErrorLog];

        // Save to database
        await logAndSave(userId, gameId, currentState, updatedMessages);

        // Return ALL messages (for UI display)
        const allUIMessages = extractUIMessages(updatedMessages);
        return { newState: currentState, messages: allUIMessages };
    }

    // Use sanitized input for processing
    const safePlayerInput = validation.sanitizedInput;
    const lowerInput = safePlayerInput.toLowerCase().trim();

    // Log if any characters were stripped during sanitization
    if (validation.metadata.strippedChars > 0) {
        console.log(`🐕 [Prompt Watch-Dog] Sanitized input: removed ${validation.metadata.strippedChars} chars`);
        console.log(`   Original: "${rawPlayerInput.substring(0, 50)}${rawPlayerInput.length > 50 ? '...' : ''}"`);
        console.log(`   Sanitized: "${safePlayerInput}"\n`);
    }

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

    // Variables for unified command logging (declare here for function-wide scope, accessible in catch block)
    let commandStartTime: number | undefined;
    let stateBefore: PlayerState | undefined;
    let preprocessedInput = safePlayerInput;
    let uiMessagesThisTurn: Message[] = [];
    let effects: Effect[] = [];
    let preprocessingMs = 0;
    let aiInterpretationMs = 0;
    let executionMs = 0;
    let stateUpdateMs = 0;
    let safetyNetResult: any;
    let verb = 'unknown';
    let restOfCommand = '';
    let executionSuccess = true;
    let executionErrorMessage: string | undefined;
    let executionErrorType: 'invalid_target' | 'invalid_action' | 'ai_unclear' | 'system_error' | undefined;

    try {
        // Try to load state from database
        let stateSnap;
        try {
            stateSnap = await getDoc(stateRef);
        } catch (dbReadError) {
            console.error('[Database Error] Failed to read game data:', dbReadError);

            // Create database error log
            const dbErrorLog = createDatabaseErrorLog(
                'READ_STATE',
                dbReadError instanceof Error ? dbReadError : new Error('Unknown database read error'),
                userId,
                gameId,
                safePlayerInput
            );

            // Use initial state as fallback
            currentState = getInitialState(game);
            allMessagesForSession = await createInitialMessages(currentState, game);

            // Add db_error to messages
            allMessagesForSession.push(dbErrorLog);

            // Return with error message
            return {
                newState: currentState,
                messages: extractUIMessages(allMessagesForSession)
            };
        }

        if (stateSnap.exists()) {
            currentState = stateSnap.data() as PlayerState;
        } else {
            currentState = getInitialState(game);
        }

        if (!game.locations[currentState.currentLocationId]) {
            console.warn(`Invalid location ID '${currentState.currentLocationId}' found in processCommand. Resetting to initial state.`);
            currentState = getInitialState(game);
        }

        // Load logs using new helper that handles both old and new formats
        allMessagesForSession = await getAllLogs(firestore, userId, gameId);
        if (allMessagesForSession.length === 0) {
            allMessagesForSession = await createInitialMessages(currentState, game);
        }
        // Normalize timestamps for React serialization
        allMessagesForSession = normalizeTimestamps(allMessagesForSession);

        const systemName = "System";

        // Initialize stateBefore now that currentState is assigned
        stateBefore = currentState;

        let playerMessage: Message | null = null;
        if (safePlayerInput) {
            playerMessage = createMessage('player', 'You', safePlayerInput);
            // Will be added to appropriate array based on command type:
            // - Special commands (device, password, map): add to allMessagesForSession
            // - Regular commands: add to uiMessagesThisTurn (for consolidated logging)
        }

        // --- Core Command Logic ---
        if (currentState.activeConversationWith) {
            // Check if player is trying to execute a game command (not dialogue)
            // Commands like USE, EXAMINE, LOOK, GO, TAKE should break conversation context
            const gameCommandPattern = /^(use|examine|look|take|go|read|open|close|move|search|break|unlock|enter|exit|help|inventory|map)\s+/i;
            const isGameCommand = gameCommandPattern.test(safePlayerInput.trim());

            // Special case: trying to use device (phone, etc.) during conversation
            const useDevicePattern = /^use\s+(phone|fbi\s*phone|device)/i;
            const isUsingDevice = useDevicePattern.test(safePlayerInput.trim());

            if (isGameCommand) {
                // If trying to use a device, politely ask them to end conversation first
                if (isUsingDevice) {
                    const npc = game.npcs[currentState.activeConversationWith];
                    const npcName = npc?.name || 'them';

                    const politeMessage = createMessage(
                        'narrator',
                        game.narratorName || 'Narrator',
                        `First end the conversation with ${npcName} before using your device. It's not polite to be on your phone when someone is talking to you. Type 'goodbye' or 'exit' to end the conversation.`
                    );

                    if (playerMessage) uiMessagesThisTurn.push(playerMessage);
                    uiMessagesThisTurn.push(politeMessage);

                    // Create simple log entry
                    const blockEntry = {
                        type: 'command',
                        timestamp: Date.now(),
                        input: { raw: safePlayerInput },
                        execution: { handler: 'conversation_block', success: false },
                        uiMessages: uiMessagesThisTurn,
                        context: {
                            chapterId: currentState.currentChapterId,
                            locationId: currentState.currentLocationId,
                            turnNumber: allMessagesForSession.filter((msg: any) => msg.type === 'command').length + 1,
                        },
                    };

                    await logAndSave(userId, gameId, currentState, [blockEntry as any]);
                    const allMessagesWithNew = [...allMessagesForSession, blockEntry as any];
                    return { newState: currentState, messages: extractUIMessages(allMessagesWithNew) };
                }

                // Other game commands: Route to normal command interpretation
                // This allows things like "examine" to work during conversation
                console.log(`[CONVERSATION BYPASS] Detected game command during conversation: "${safePlayerInput}"`);
                // Fall through to normal command processing below
            } else {
                // CONVERSATION: Use consolidated logging
                if (playerMessage) uiMessagesThisTurn.push(playerMessage);

                // Track conversation timing and state
                const conversationStartTime = Date.now();
                const stateBefore = JSON.parse(JSON.stringify(currentState));

                // Handle conversation
                const conversationResult = await handleConversation(currentState, safePlayerInput, game);
                currentState = conversationResult.newState;

                const conversationMs = Date.now() - conversationStartTime;

                // Extract AI usage from conversation messages
                let totalTokensInput = 0;
                let totalTokensOutput = 0;
                let totalCost = 0;
                let conversationAIModel = 'unknown';

                for (const msg of conversationResult.messages) {
                    if (msg.usage) {
                        totalTokensInput += msg.usage.inputTokens || 0;
                        totalTokensOutput += msg.usage.outputTokens || 0;
                        totalCost += msg.usage.totalTokens * 0.00000015; // Estimate cost
                        conversationAIModel = 'gemini-2.5-flash-lite'; // Conversation AI model
                    }
                    uiMessagesThisTurn.push(msg);
                }

                // Create consolidated log entry for conversation
                const consolidatedEntry = {
                    id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'command',
                    timestamp: Date.now(),

                    // 1. PLAYER INPUT (use "input" to match UI expectations)
                    input: {
                        raw: rawPlayerInput,
                        sanitized: safePlayerInput,
                        wasGibberish: false,
                        preprocessingMs: 0,
                    },

                    // 2. AI INTERPRETATION (Conversation AI)
                    aiInterpretation: {
                        primaryAI: {
                            model: conversationAIModel,
                            handler: 'conversation',
                            npcId: currentState.activeConversationWith,
                            latencyMs: conversationMs,
                            costUSD: totalCost,
                        },
                        finalDecision: {
                            source: 'conversation_ai',
                            handler: 'handleConversation',
                        },
                        totalAICalls: totalTokensInput > 0 ? 1 : 0,
                        totalCostUSD: totalCost,
                    },

                    // 3. EXECUTION
                    execution: {
                        handler: 'conversation',
                        targetEntity: currentState.activeConversationWith,
                        effectsApplied: conversationResult.messages.length,
                        success: true,
                        executionMs: conversationMs,
                    },

                    // 4. UI MESSAGES
                    uiMessages: uiMessagesThisTurn,

                    // 5. STATE DIFF (only changes, not full snapshots)
                    stateDiff: calculateStateDiff(stateBefore || currentState, currentState),

                    // 6. TOKEN USAGE
                    tokens: totalTokensInput > 0 ? {
                        input: totalTokensInput,
                        output: totalTokensOutput,
                        total: totalTokensInput + totalTokensOutput,
                    } : undefined,

                    // 7. PERFORMANCE
                    performance: {
                        preprocessingMs: 0,
                        aiInterpretationMs: conversationMs,
                        executionMs: 0,
                        totalMs: conversationMs,
                    },

                    // 8. CONTEXT
                    context: {
                        chapterId: currentState.currentChapterId,
                        locationId: currentState.currentLocationId,
                        turnNumber: allMessagesForSession.filter((msg: any) => msg.type === 'command').length + 1,
                    },

                    // 9. QUALITY METRICS
                    wasSuccessful: true,
                    wasUnclear: false,
                };

                // Save ONLY the new consolidated entry (subcollection handles multiple turns)
                await logAndSave(userId, gameId, currentState, [consolidatedEntry as any]);

                // For UI display, combine previous messages with new entry
                const allMessagesWithNew = [...allMessagesForSession, consolidatedEntry as any];
                return { newState: currentState, messages: extractUIMessages(allMessagesWithNew) };
            }
        }

        if (currentState.activeDeviceFocus) {
            // DEVICE FOCUS MODE: Use consolidated logging
            if (playerMessage) uiMessagesThisTurn.push(playerMessage);

            // Start execution timer
            const executionStartTime = Date.now();

            // DEVICE FOCUS MODE: Route commands to device-specific handler
            effects = await handleDeviceCommand(currentState, safePlayerInput, game);
            if (effects.length > 0) {
                const result = await processEffects(currentState, effects, game);
                currentState = result.newState;
                uiMessagesThisTurn.push(...result.messages);
            }

            executionMs = Date.now() - executionStartTime;

            // Create consolidated log entry for device commands
            const consolidatedEntry = {
                type: 'command',
                timestamp: Date.now(),

                // 1. RAW PLAYER INPUT
                input: {
                    raw: safePlayerInput,
                },

                // 2. AI INTERPRETATION (device commands don't use AI interpretation)
                interpretation: null,

                // 3. EXECUTION DETAILS
                execution: {
                    verb: 'device',
                    target: currentState.activeDeviceFocus || 'unknown',
                    effects: effects.map(e => e.type),
                    success: true,
                    errorMessage: null,
                    executionMs: executionMs || 0,
                },

                // 4. UI MESSAGES
                uiMessages: uiMessagesThisTurn,

                // 5. STATE SNAPSHOTS
                stateSnapshot: {
                    before: stateBefore,
                    after: currentState,
                },

                // 6. TOKEN USAGE (N/A for device commands)
                tokens: undefined,

                // 7. PERFORMANCE
                performance: {
                    preprocessingMs: 0,
                    aiInterpretationMs: 0,
                    executionMs: executionMs || 0,
                    totalMs: executionMs || 0,
                },

                // 8. CONTEXT
                context: {
                    chapterId: currentState.currentChapterId,
                    locationId: currentState.currentLocationId,
                    turnNumber: allMessagesForSession.filter((msg: any) => msg.type === 'command').length + 1,
                },

                // 9. QUALITY METRICS
                wasSuccessful: true,
                wasUnclear: false,
            };

            // Save ONLY the new consolidated entry to Firebase (subcollection handles multiple turns)
            await logAndSave(userId, gameId, currentState, [consolidatedEntry as any]);

            // For UI display, combine previous messages with new entry
            const allMessagesWithNew = [...allMessagesForSession, consolidatedEntry as any];
            const allUIMessages = extractUIMessages(allMessagesWithNew);
            return { newState: currentState, messages: allUIMessages };
        } else if (lowerInput === 'restart') {
            return await resetGame(userId);
        } else if (lowerInput === '/map') {
            // SPECIAL COMMAND: Map - Use consolidated logging
            if (playerMessage) uiMessagesThisTurn.push(playerMessage);

            // Start execution timer
            const executionStartTime = Date.now();

            // SHOW MAP: Display the current chapter's map
            const currentChapter = game.chapters[currentState.currentChapterId];

            // Chapter-specific maps
            const chapterMaps: Record<string, string> = {
                'ch1-the-cafe': 'https://res.cloudinary.com/dg912bwcc/image/upload/v1763992995/Cafe_Blueprint_exbuth.jpg',
                // Add more chapters as needed
            };

            const mapUrl = chapterMaps[currentState.currentChapterId] || chapterMaps['ch1-the-cafe'];

            const mapMessage: Message = {
                id: `msg_${Date.now()}`,
                sender: 'narrator',
                senderName: game.narratorName || 'Narrator',
                type: 'image',
                content: `This is the map for the current chapter:`,
                image: {
                    url: mapUrl,
                    description: `Map of ${currentChapter?.title || 'the area'}`,
                    hint: 'location map'
                },
                timestamp: Date.now()
            };
            uiMessagesThisTurn.push(mapMessage);

            executionMs = Date.now() - executionStartTime;

            // Create consolidated log entry for map command
            const consolidatedEntry = {
                type: 'command',
                timestamp: Date.now(),

                // 1. RAW PLAYER INPUT
                input: {
                    raw: safePlayerInput,
                },

                // 2. AI INTERPRETATION (map command doesn't use AI interpretation)
                interpretation: null,

                // 3. EXECUTION DETAILS
                execution: {
                    verb: 'map',
                    target: currentState.currentChapterId,
                    effects: ['SHOW_MESSAGE'],
                    success: true,
                    errorMessage: null,
                    executionMs: executionMs || 0,
                },

                // 4. UI MESSAGES
                uiMessages: uiMessagesThisTurn,

                // 5. STATE SNAPSHOTS
                stateSnapshot: {
                    before: stateBefore,
                    after: currentState,
                },

                // 6. TOKEN USAGE (N/A for map command)
                tokens: undefined,

                // 7. PERFORMANCE
                performance: {
                    preprocessingMs: 0,
                    aiInterpretationMs: 0,
                    executionMs: executionMs || 0,
                    totalMs: executionMs || 0,
                },

                // 8. CONTEXT
                context: {
                    chapterId: currentState.currentChapterId,
                    locationId: currentState.currentLocationId,
                    turnNumber: allMessagesForSession.filter((msg: any) => msg.type === 'command').length + 1,
                },

                // 9. QUALITY METRICS
                wasSuccessful: true,
                wasUnclear: false,
            };

            // Save ONLY the new consolidated entry to Firebase (subcollection handles multiple turns)
            await logAndSave(userId, gameId, currentState, [consolidatedEntry as any]);

            // For UI display, combine previous messages with new entry
            const allMessagesWithNew = [...allMessagesForSession, consolidatedEntry as any];
            const allUIMessages = extractUIMessages(allMessagesWithNew);
            return { newState: currentState, messages: allUIMessages };
        } else {
            // UNIFIED COMMAND LOGGING: Track everything for debugging and analytics
            commandStartTime = Date.now();
            stateBefore = JSON.parse(JSON.stringify(currentState)); // Deep copy for snapshot

            // SAFETY NET: Preprocess input, detect patterns, use 2-tier AI interpretation
            const { preprocessInput, isHelpRequest, isEmptyOrGibberish, getGibberishMessage } = await import('@/lib/game/utils/input-preprocessing');

            // 1. PREPROCESS INPUT
            const preprocessingStartTime = Date.now();
            preprocessedInput = preprocessInput(safePlayerInput);
            const lowerInput = preprocessedInput.toLowerCase();
            preprocessingMs = Date.now() - preprocessingStartTime;

            // 1.5. HANDLE /password COMMAND
            // Convert /password <phrase> to password <phrase>
            // This allows /password to use consolidated logging and bypass AI interpretation
            let skipAIInterpretation = false;
            if (lowerInput.startsWith('/password ')) {
                const phrase = safePlayerInput.substring(10).trim(); // Remove "/password " prefix
                preprocessedInput = `password ${phrase}`;
                skipAIInterpretation = true; // Skip AI, go directly to password handler
            }

            // 2. QUICK PATTERN CHECKS (no AI needed)
            // DISABLED: Old help system - now using entity-aware pre-filter below (line 910)
            // if (isHelpRequest(preprocessedInput)) {
            //     // SPECIAL CASE: Help (old format)
            //     if (playerMessage) allMessagesForSession.push(playerMessage);

            //     // Extract question if player asked something specific (e.g., "help, I don't know how to open the box")
            //     const playerQuestion = preprocessedInput.length > 10 ? preprocessedInput : null;
            //     effects = await handleHelp(currentState, playerQuestion, game);
            //     if (effects.length > 0) {
            //         const result = await processEffects(currentState, effects, game);
            //         currentState = result.newState;
            //         allMessagesForSession.push(...result.messages);
            //     }
            //     await logAndSave(userId, gameId, currentState, allMessagesForSession);
            //     return { newState: currentState, messages: extractUIMessages(allMessagesForSession) };
            // }

            if (isEmptyOrGibberish(preprocessedInput)) {
                // SPECIAL CASE: Gibberish
                const newMessages: Message[] = [];
                if (playerMessage) newMessages.push(playerMessage);

                const gibberishMsg = createMessage('narrator', game.narratorName || 'Narrator', getGibberishMessage(preprocessedInput));
                newMessages.push(gibberishMsg);

                // Save only new messages (subcollection handles multiple turns)
                await logAndSave(userId, gameId, currentState, newMessages);

                // Return all messages for UI display
                const allForUI = [...allMessagesForSession, ...newMessages];
                return { newState: currentState, messages: extractUIMessages(allForUI) };
            }

            // REGULAR COMMAND: Use consolidated logging
            if (playerMessage) uiMessagesThisTurn.push(playerMessage);

            // 3. PREPARE AI INTERPRETATION INPUT
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

            // 4. AI INTERPRETATION WITH SAFETY NET
            const aiInterpretationStartTime = Date.now();

            // PRE-FILTER: Detect help questions BEFORE AI (faster + more reliable)
            console.log('[DEBUG PRE-FILTER] Checking input:', lowerInput);
            const isHelpQuestion =
                lowerInput.startsWith('what should i do with') ||
                lowerInput.startsWith('what should i do') ||
                lowerInput.startsWith('what can i do with') ||
                lowerInput.startsWith('what can i do') ||
                lowerInput.startsWith('how do i') ||
                lowerInput.startsWith('what about') ||
                lowerInput === "i'm stuck" ||
                lowerInput === "i'm confused" ||
                lowerInput === "i'm lost" ||
                lowerInput === "i don't know what to do";
            console.log('[DEBUG PRE-FILTER] Is help question?', isHelpQuestion);

            // Skip AI interpretation for explicit /password commands OR help questions
            if (skipAIInterpretation) {
                // Bypass AI, use preprocessed command directly
                safetyNetResult = {
                    commandToExecute: preprocessedInput,
                    confidence: 1.0,
                    primaryConfidence: 1.0,
                    source: 'bypass' as const,
                    aiCalls: 0,
                    reasoning: 'Explicit /password command, bypassing AI interpretation'
                };
                aiInterpretationMs = 0;
            } else if (isHelpQuestion) {
                // Route directly to contextual help (bypass AI)
                safetyNetResult = {
                    commandToExecute: `contextual_help ${preprocessedInput}`,
                    confidence: 1.0,
                    primaryConfidence: 1.0,
                    source: 'bypass' as const,
                    aiCalls: 0,
                    reasoning: 'Help question detected - bypassing AI for speed'
                };
                aiInterpretationMs = 0;
            } else {
                const { interpretCommandWithSafetyNet, CONFIDENCE_THRESHOLDS } = await import('@/ai/flows/interpret-with-safety-net');

                safetyNetResult = await interpretCommandWithSafetyNet(
                    {
                        promptContext: game.promptContext || '',
                        gameState: JSON.stringify({
                            ...currentState,
                            world: undefined, // Too large for AI context
                            stories: undefined, // Not needed for AI
                            counters: undefined, // Analytics only
                        }, null, 2),
                        playerCommand: preprocessedInput,
                        availableCommands: AVAILABLE_COMMANDS.join(', '),
                        visibleObjectNames: visibleEntityNames,
                        visibleNpcNames: visibleNpcNames,
                    },
                    gameId,
                    userId
                );
                aiInterpretationMs = Date.now() - aiInterpretationStartTime;
            }

            // ========================================================================
            // AI INTERPRETATION SUMMARY
            // ========================================================================
            console.log('\n🤖 ═══════════════════════════════════════════════════════════');
            console.log('   AI COMMAND INTERPRETATION');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📥 Player Input: "${safePlayerInput}"`);
            console.log(`🎯 Command Output: "${safetyNetResult.commandToExecute}"`);
            console.log(`📊 Confidence: ${(safetyNetResult.confidence * 100).toFixed(1)}%`);
            console.log(`🔄 AI Calls: ${safetyNetResult.aiCalls} (${safetyNetResult.source})`);
            console.log(`🌐 LLM Backend: ☁️  API (Gemini Flash Lite)`);
            console.log(`⏱️  Latency: ${aiInterpretationMs}ms`);
            if (safetyNetResult.primaryConfidence !== undefined) {
                console.log(`   ├─ Primary AI: ${(safetyNetResult.primaryConfidence * 100).toFixed(1)}% (Gemini)`);
            }
            if (safetyNetResult.safetyConfidence !== undefined) {
                console.log(`   └─ Safety AI: ${(safetyNetResult.safetyConfidence * 100).toFixed(1)}% (GPT-5 Nano)`);
            }
            if (safetyNetResult.reasoning) {
                console.log(`💭 Reasoning: ${safetyNetResult.reasoning}`);
            }
            console.log('═══════════════════════════════════════════════════════════\n');

            // 5. LOG AI RESPONSE TO PLAYER (ONLY if incorrectly filled)
            // The AI should leave responseToPlayer EMPTY for normal command interpretation
            // The reasoning field is EXPECTED and used for debugging - only responseToPlayer is an error
            if (safetyNetResult.responseToPlayer && safetyNetResult.responseToPlayer.trim() !== '') {
                // Log to console only - DO NOT add to message log (would create empty entries in admin dashboard)
                console.error('\n🚨 ═══════════════════════════════════════════════════════════');
                console.error('   AI REASONING ERROR DETECTED');
                console.error('═══════════════════════════════════════════════════════════');
                console.error('❌ AI filled responseToPlayer field when it should have been empty.');
                console.error('   This field should ONLY be used for truly invalid commands.\n');
                console.error(`📥 Player Input: "${safePlayerInput}"`);
                console.error(`💬 Response to Player: "${safetyNetResult.responseToPlayer}"`);
                console.error(`🎯 Command: "${safetyNetResult.commandToExecute}"`);
                console.error(`📊 Confidence: ${(safetyNetResult.confidence * 100).toFixed(1)}%`);
                console.error(`💭 Reasoning: ${safetyNetResult.reasoning || '(none)'}`);
                console.error(`🔧 Fix: Update AI prompt to keep responseToPlayer empty for normal commands`);
                console.error('═══════════════════════════════════════════════════════════\n');

                // NOTE: We do NOT add this to allMessagesForSession because:
                // 1. It would create empty "Sender: ()" entries in admin dashboard
                // 2. Console logging is sufficient for debugging
                // 3. The actual command still executes correctly
            }

            // 6. HANDLE TRULY INVALID COMMANDS (with contextual feedback)
            if (safetyNetResult.commandToExecute === 'invalid') {
                // Check if the player is trying to access gated/blocked content
                const { checkForGatedContent } = await import('@/lib/game/utils/gated-content-detector');
                const gatedCheck = checkForGatedContent(safePlayerInput, currentState, game);

                let responseMessage: string;
                let errorType: 'gated_content' | 'invalid_command' = 'invalid_command';

                if (gatedCheck.isGated) {
                    // Player is trying to access content that exists but is blocked
                    responseMessage = gatedCheck.contextualMessage;
                    errorType = 'gated_content';
                } else {
                    // Truly invalid command
                    responseMessage = `I'm not sure what you mean by "${safePlayerInput}". Try commands like: look, examine, take, use, or type /help for more options.`;
                }

                // Create structured invalid command log entry (similar to validation_error)
                const invalidCommandLog: any = {
                    type: 'command_invalid',
                    errorId: `invalid_${Date.now()}`,
                    timestamp: Date.now(),

                    // Player input
                    playerInput: safePlayerInput,
                    rawInput: rawPlayerInput || safePlayerInput,

                    // System response
                    systemResponse: responseMessage,

                    // Classification
                    invalidationType: errorType,

                    // Context
                    context: {
                        userId,
                        gameId,
                        chapterId: currentState.currentChapterId,
                        locationId: currentState.currentLocationId,
                        focusId: currentState.currentFocusId,
                        focusType: currentState.focusType,
                    },

                    // AI interpretation details (for debugging)
                    aiInterpretation: {
                        confidence: safetyNetResult.confidence,
                        reasoning: safetyNetResult.reasoning,
                        source: safetyNetResult.source,
                    },

                    // UI messages (what player sees)
                    uiMessages: [
                        createMessage('narrator', game.narratorName || 'Narrator', responseMessage)
                    ]
                };

                // Save only new message log (subcollection handles multiple turns)
                await logAndSave(userId, gameId, currentState, [invalidCommandLog]);

                // Return all messages for UI display
                const allForUI = [...allMessagesForSession, invalidCommandLog];
                return { newState: currentState, messages: extractUIMessages(allForUI) };
            }

            // 7. LOW CONFIDENCE BUT VALID COMMAND - Let it execute anyway
            // Even if confidence is low (0.35-0.49), if the command is valid, let the game engine handle it
            // The engine will provide appropriate feedback if the action fails
            if (safetyNetResult.confidence < 0.5 && safetyNetResult.commandToExecute !== 'invalid') {
                console.log(`⚠️ Low confidence (${(safetyNetResult.confidence * 100).toFixed(1)}%) but executing command anyway: ${safetyNetResult.commandToExecute}`);
                // Continue to command execution below
            }

            const commandToExecute = safetyNetResult.commandToExecute.toLowerCase();
            console.log('[DEBUG] Full command to execute:', commandToExecute);

            const verbMatch = commandToExecute.match(/^(\w+)\s*/);
            verb = verbMatch ? verbMatch[1] : commandToExecute;
            restOfCommand = commandToExecute.substring((verbMatch ? verbMatch[0].length : verb.length)).trim();

            console.log(`🎮 Executing → Verb: "${verb}" | Target: "${restOfCommand || '(none)'}"\n`);

            // Track command execution timing
            const executionStartTime = Date.now();

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
                    // Extract optional question from rest of command (e.g., "help how do I open the box")
                    const helpQuestion = restOfCommand || null;
                    effects = await handleHelp(currentState, helpQuestion, game);
                    break;
                case 'contextual_help':
                    // NEW: handleContextualHelp returns Effect[]
                    // For natural language expressions of confusion/frustration
                    // Uses the original player input as context for more personalized help
                    effects = await handleContextualHelp(currentState, rawPlayerInput, game);
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
                        // For reading, the syntax is "read TARGET with TOOL"
                        // The target needs the tool, so we check target's onRead handlers
                        // This is different from general USE where we "use ITEM on TARGET"
                        const readTarget = readWithMatch[1].trim().replace(/"/g, '');
                        const readTool = readWithMatch[2].trim().replace(/"/g, '');
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
                    effects = await handleBreak(currentState, restOfCommand.replace(/"/g, ''), game, safePlayerInput);
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
            const stateUpdateStartTime = Date.now();
            if (effects.length > 0) {
                console.log(`⚙️  Processing ${effects.length} effect(s): ${effects.map(e => e.type).join(', ')}`);
                const result = await processEffects(currentState, effects, game);
                currentState = result.newState;  // FIX: Use newState, not state!
                // DON'T add to allMessagesForSession - collect for consolidated entry
                uiMessagesThisTurn.push(...result.messages);
                console.log(`✅ Effects applied in ${Date.now() - stateUpdateStartTime}ms\n`);
            }
            executionMs = Date.now() - executionStartTime;
            stateUpdateMs = Date.now() - stateUpdateStartTime;
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

        // CONSOLIDATED LOGGING: One entry per player turn with everything
        if (typeof commandStartTime !== 'undefined') {
            try {
                const totalMs = Date.now() - commandStartTime;

                // Calculate total cost using environment-configured pricing
                const PRIMARY_AI_PRICING = {
                    input: (parseFloat(process.env.PRIMARY_AI_INPUT_COST || '0.10')) / 1_000_000,
                    output: (parseFloat(process.env.PRIMARY_AI_OUTPUT_COST || '0.40')) / 1_000_000,
                };

                const SAFETY_AI_PRICING = {
                    input: (parseFloat(process.env.SAFETY_AI_INPUT_COST || '0.05')) / 1_000_000,
                    output: (parseFloat(process.env.SAFETY_AI_OUTPUT_COST || '0.40')) / 1_000_000,
                };

                // Extract token usage from help system messages (if any)
                let helpTokensInput = 0;
                let helpTokensOutput = 0;
                for (const msg of uiMessagesThisTurn) {
                    if (msg.usage) {
                        helpTokensInput += msg.usage.inputTokens || 0;
                        helpTokensOutput += msg.usage.outputTokens || 0;
                        console.log(`📊 Extracted AI usage from help message: ${msg.usage.inputTokens} input, ${msg.usage.outputTokens} output tokens`);
                    }
                }

                // Extract actual token usage from primary AI
                const primaryTokensInput = safetyNetResult?.primaryUsage?.inputTokens || 0;
                const primaryTokensOutput = safetyNetResult?.primaryUsage?.outputTokens || 0;

                // Extract actual token usage from safety AI (if triggered)
                const safetyTokensInput = safetyNetResult?.safetyUsage?.inputTokens || 0;
                const safetyTokensOutput = safetyNetResult?.safetyUsage?.outputTokens || 0;

                const totalTokensInput = primaryTokensInput + safetyTokensInput + helpTokensInput;
                const totalTokensOutput = primaryTokensOutput + safetyTokensOutput + helpTokensOutput;

                // Calculate primary AI cost (Gemini Flash Lite)
                const primaryAICost = (primaryTokensInput * PRIMARY_AI_PRICING.input) + (primaryTokensOutput * PRIMARY_AI_PRICING.output);

                // Calculate safety AI cost (GPT-5 Nano)
                const safetyAICost = (safetyTokensInput * SAFETY_AI_PRICING.input) + (safetyTokensOutput * SAFETY_AI_PRICING.output);

                // Calculate help AI cost (contextual hints)
                const helpAICost = (helpTokensInput * PRIMARY_AI_PRICING.input) + (helpTokensOutput * PRIMARY_AI_PRICING.output);

                const totalCost = primaryAICost + safetyAICost + helpAICost;

                console.log(`📊 Token usage - Primary: ${primaryTokensInput}/${primaryTokensOutput}, Safety: ${safetyTokensInput}/${safetyTokensOutput}, Help: ${helpTokensInput}/${helpTokensOutput}`);
                console.log(`💰 Costs - Primary: $${primaryAICost.toFixed(6)}, Safety: $${safetyAICost.toFixed(6)}, Help: $${helpAICost.toFixed(6)}, Total: $${totalCost.toFixed(6)}`);

                // Create ONE consolidated entry
                const consolidatedEntry: EnhancedCommandLog = {
                    type: 'command',
                    commandId: `${userId}_${Date.now()}`,
                    timestamp: new Date(),

                    // 1. PLAYER INPUT
                    input: {
                        raw: safePlayerInput,
                        preprocessed: preprocessedInput || safePlayerInput,
                        wasHelpRequest: false,
                        wasGibberish: false,
                        preprocessingMs: preprocessingMs || 0,
                    },

                    // 2. AI INTERPRETATION (Analytics)
                    aiInterpretation: typeof safetyNetResult !== 'undefined' ? {
                        primaryAI: {
                            model: 'gemini-2.5-flash-lite',
                            confidence: safetyNetResult.primaryConfidence || safetyNetResult.confidence,
                            commandToExecute: safetyNetResult.commandToExecute,
                            reasoning: safetyNetResult.reasoning,
                            latencyMs: aiInterpretationMs || 0,
                            costUSD: primaryAICost, // Actual calculated cost for primary AI
                        },
                        safetyAI: safetyNetResult.aiCalls === 2 ? {
                            model: 'gpt-5-nano',
                            confidence: safetyNetResult.safetyConfidence || 0,
                            commandToExecute: safetyNetResult.commandToExecute,
                            latencyMs: 0,
                            costUSD: safetyAICost, // Actual calculated cost for safety AI
                            wasTriggered: true,
                            helpedImprove: safetyNetResult.source !== 'primary',
                        } : undefined,
                        finalDecision: {
                            source: safetyNetResult.source,
                            confidence: safetyNetResult.confidence,
                            commandToExecute: safetyNetResult.commandToExecute,
                            disagreement: false,
                        },
                        totalAICalls: safetyNetResult.aiCalls,
                        totalCostUSD: totalCost,
                    } : undefined,

                    // 3. EXECUTION SUMMARY (details in uiMessages)
                    execution: {
                        handler: verb || 'unknown',
                        targetEntity: restOfCommand || undefined,
                        effectTypes: (effects || []).map(e => e.type),  // Just types, not full objects
                        effectsApplied: effects?.length || 0,
                        success: executionSuccess,
                        errorMessage: executionErrorMessage,
                        executionMs: executionMs || 0,
                    },

                    // 4. UI MESSAGES (what player saw - includes media URLs)
                    uiMessages: uiMessagesThisTurn,

                    // 5. STATE DIFF (only changes, not full snapshots)
                    // This reduces size from 8-12 KB per turn → 1-2 KB per turn
                    stateDiff: calculateStateDiff(stateBefore || finalResult.newState, finalResult.newState),

                    // 6. TOKEN USAGE
                    tokens: {
                        input: totalTokensInput,
                        output: totalTokensOutput,
                        total: totalTokensInput + totalTokensOutput,
                    },

                    // 7. PERFORMANCE
                    performance: {
                        preprocessingMs: preprocessingMs || 0,
                        aiInterpretationMs: aiInterpretationMs || 0,
                        executionMs: executionMs || 0,
                        totalMs,
                    },

                    // 8. CONTEXT
                    context: {
                        chapterId: finalResult.newState.currentChapterId,
                        locationId: finalResult.newState.currentLocationId,
                        // Count existing command logs to get accurate turn number
                        turnNumber: allMessagesForSession.filter((msg: any) => msg.type === 'command').length + 1,
                    },

                    // 9. QUALITY METRICS
                    wasSuccessful: executionSuccess && (typeof safetyNetResult === 'undefined' || safetyNetResult?.commandToExecute !== 'invalid'),
                    wasUnclear: typeof safetyNetResult !== 'undefined' ? safetyNetResult.confidence < 0.6 : false,
                };

                // Debug: Log what we're about to save
                console.log(`🔍 DEBUG: Saving consolidated entry with tokens:`, JSON.stringify(consolidatedEntry.tokens, null, 2));
                console.log(`🔍 DEBUG: Saving consolidated entry with AI costs:`, JSON.stringify({
                    primaryCost: consolidatedEntry.aiInterpretation?.primaryAI?.costUSD,
                    safetyCost: consolidatedEntry.aiInterpretation?.safetyAI?.costUSD,
                    totalCost: consolidatedEntry.aiInterpretation?.totalCostUSD
                }, null, 2));

                // Save ONLY the new consolidated entry to Firebase (subcollection handles multiple turns)
                const saveResult = await logAndSave(userId, gameId, finalResult.newState, [consolidatedEntry as any]);

                // For UI display, combine previous messages with new entry
                const allMessagesWithNew = [...allMessagesForSession, consolidatedEntry as any];

                // If database save failed, create a db_error entry and add to messages
                let finalMessages = allMessagesWithNew;
                if (!saveResult.success && saveResult.error) {
                    console.error('[Database Error] Failed to save game data:', saveResult.error);
                    const dbErrorLog = createDatabaseErrorLog(
                        'WRITE_STATE',
                        saveResult.error,
                        userId,
                        gameId,
                        safePlayerInput
                    );
                    finalMessages = [...allMessagesWithNew, dbErrorLog];

                    // Try to save with the error included (best effort - may also fail)
                    try {
                        await logAndSave(userId, gameId, finalResult.newState, [dbErrorLog]);
                    } catch (secondaryError) {
                        console.error('[Database Error] Failed to save db_error log:', secondaryError);
                        // At least return the error to the user
                    }
                }

                // Extract all UI messages for client display
                const allUIMessages = extractUIMessages(finalMessages);
                return {
                    newState: finalResult.newState,
                    messages: allUIMessages  // Return full UI message history
                };
            } catch (error) {
                console.error('[Consolidated Logging] Failed to create consolidated log:', error);
                // Fall back to saving only UI messages from this turn
                const newMessagesThisTurn = uiMessagesThisTurn.length > 0 ? uiMessagesThisTurn : finalResult.messages;
                await logAndSave(userId, gameId, finalResult.newState, newMessagesThisTurn);

                // Return all messages for UI display
                const allForUI = [...allMessagesForSession, ...newMessagesThisTurn];
                const allUIMessages = extractUIMessages(allForUI);
                return { newState: finalResult.newState, messages: allUIMessages };
            }
        } else {
            // No tracking data (conversation or special commands) - save only new messages
            const newMessagesThisTurn = finalResult.messages || [];
            await logAndSave(userId, gameId, finalResult.newState, newMessagesThisTurn);

            // Return all messages for UI display
            const allForUI = [...allMessagesForSession, ...newMessagesThisTurn];
            const allUIMessages = extractUIMessages(allForUI);
            return { newState: finalResult.newState, messages: allUIMessages };
        }

    } catch (error) {
        console.error('Error processing command:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Determine error type/source
        let errorSource: 'AI_INTERPRETATION' | 'AI_NARRATION' | 'HANDLER_EXECUTION' | 'STATE_UPDATE' | 'DATABASE' | 'UNKNOWN' = 'UNKNOWN';
        if (errorMessage.includes('temperature') || errorMessage.includes('model') || errorMessage.includes('API')) {
            errorSource = 'AI_INTERPRETATION';
        } else if (errorMessage.includes('gemini') || errorMessage.includes('openai') || errorMessage.includes('genkit')) {
            errorSource = 'AI_NARRATION';
        } else if (errorMessage.includes('handler') || errorMessage.includes('command')) {
            errorSource = 'HANDLER_EXECUTION';
        } else if (errorMessage.includes('state') || errorMessage.includes('update')) {
            errorSource = 'STATE_UPDATE';
        } else if (errorMessage.includes('firestore') || errorMessage.includes('database')) {
            errorSource = 'DATABASE';
        }

        // Create user-facing error message
        const errorResponseMessage = createMessage(
            'system',
            '⚠️ System Error',
            `Sorry, something went wrong while processing your command.\n\nError: ${errorMessage}\n\nPlease try a different command or contact support if this persists.`
        );

        // Create consolidated AI error log entry (similar to validation_error)
        const aiErrorLog: any = {
            type: 'ai_error',
            errorId: `ai_error_${Date.now()}`,
            timestamp: Date.now(),

            // What the player prompted
            playerInput: safePlayerInput || rawPlayerInput || '',
            rawInput: rawPlayerInput || '',

            // Error details
            error: {
                message: errorMessage,
                stack: errorStack,
                source: errorSource,
                name: error instanceof Error ? error.name : 'Error',
            },

            // What the system replied to the player
            systemResponse: `Sorry, something went wrong while processing your command.\n\nError: ${errorMessage}`,

            // Context
            context: typeof currentState !== 'undefined' ? {
                userId: userId,
                gameId: gameId,
                chapterId: currentState?.currentChapterId,
                locationId: currentState?.currentLocationId,
                focusId: currentState?.currentFocusId,
                focusType: currentState?.focusType,
                activeConversation: currentState?.activeConversationWith,
            } : {
                userId: userId,
                gameId: gameId,
            },

            // AI tracking (if available from scope)
            aiContext: typeof commandStartTime !== 'undefined' ? {
                commandStartTime,
                hadAIInterpretation: typeof aiInterpretationMs !== 'undefined' && aiInterpretationMs > 0,
                hadSafetyNet: typeof safetyNetResult !== 'undefined',
            } : undefined,

            // UI Messages (single consolidated error message)
            uiMessages: [errorResponseMessage]
        };

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

        // Add consolidated error entry to messages
        const messagesWithError = [...allMessagesForSession, aiErrorLog];
        await logAndSave(userId, gameId, stateToSave, messagesWithError);

        if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
            await dispatchMessage(userId, errorResponseMessage);
        }

        return { newState: stateToSave, messages: extractUIMessages(messagesWithError) };
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

            const deletePromises: Promise<any>[] = [
                deleteDoc(userRef),
                deleteDoc(stateRef),
                deleteDoc(logRef)
            ];

            // Also delete turns subcollection (new format)
            try {
                const turnsCol = collection(firestore, `logs/${userId}_${gameId}/turns`);
                const turnsSnapshot = await getDocs(turnsCol);
                turnsSnapshot.docs.forEach(turnDoc => {
                    deletePromises.push(deleteDoc(turnDoc.ref));
                });
                console.log(`[RESET] Deleting ${turnsSnapshot.docs.length} turn documents`);
            } catch (error) {
                // If turns subcollection doesn't exist (old format), continue
                console.log(`[RESET] No turns subcollection found (old format)`);
            }

            await Promise.all(deletePromises);
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

/**
 * Enhanced log entry structure for comprehensive command tracking
 */
export interface EnhancedCommandLog {
  type: 'command';
  commandId: string;
  timestamp: Date;

  // Input stage
  input: {
    raw: string;
    preprocessed: string;
    wasHelpRequest: boolean;
    wasGibberish: boolean;
    preprocessingMs: number;
  };

  // AI interpretation (if used)
  aiInterpretation?: {
    primaryAI: {
      model: string;
      confidence: number;
      commandToExecute: string;
      reasoning?: string;
      latencyMs: number;
      tokens?: { input: number; output: number; };
      costUSD: number;
    };
    safetyAI?: {
      model: string;
      confidence: number;
      commandToExecute: string;
      latencyMs: number;
      tokens?: { input: number; output: number; };
      costUSD: number;
      wasTriggered: boolean;
      helpedImprove: boolean;
    };
    finalDecision: {
      source: 'primary' | 'safety' | 'consensus' | 'unclear';
      confidence: number;
      commandToExecute: string;
      disagreement: boolean;
    };
    totalAICalls: number;
    totalCostUSD: number;
  };

  // Command execution (summary only - full details in uiMessages)
  execution: {
    handler: string;
    targetEntity?: string;
    effectTypes: string[];  // Just the types, not full effects
    effectsApplied: number;
    success: boolean;
    errorMessage?: string;
    executionMs: number;
  };

  // UI messages shown to player during this command
  uiMessages: Message[];

  // State diff for bug reproduction (only changes, not full snapshots)
  stateDiff?: {
    changed: Record<string, any>;
    added: Record<string, any>;
    removed: string[];
  };

  // Token usage
  tokens?: {
    input: number;
    output: number;
    total: number;
  };

  // Performance metrics
  performance: {
    preprocessingMs: number;
    aiInterpretationMs: number;
    executionMs: number;
    totalMs: number;
  };

  // Context
  context: {
    chapterId: string;
    locationId: string;
    turnNumber: number;
  };

  // Quality metrics
  wasSuccessful: boolean;
  wasUnclear: boolean;
}

/**
 * Helper function to create database error log entry
 */
function createDatabaseErrorLog(
  operation: 'READ_STATE' | 'READ_LOGS' | 'WRITE_STATE' | 'WRITE_LOGS' | 'INIT_FIRESTORE' | 'DELETE_DATA',
  error: Error,
  userId: string,
  gameId: string,
  playerInput?: string
): any {
  const errorMessage = error instanceof Error ? error.message : 'An unknown database error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;

  const errorDisplayMessage = createMessage(
    'system',
    '⚠️ Database Error',
    `Sorry, we couldn't ${operation === 'READ_STATE' || operation === 'READ_LOGS' ? 'load' : 'save'} your game data.\n\nError: ${errorMessage}\n\nYour progress may not be saved. Please try again or contact support.`
  );

  return {
    type: 'db_error',
    errorId: `db_error_${Date.now()}`,
    timestamp: Date.now(),

    // What the player prompted (if available)
    playerInput: playerInput || '',

    // Database operation that failed
    operation: operation,
    operationDescription: {
      'READ_STATE': 'Loading player state from database',
      'READ_LOGS': 'Loading message logs from database',
      'WRITE_STATE': 'Saving player state to database',
      'WRITE_LOGS': 'Saving message logs to database',
      'INIT_FIRESTORE': 'Initializing database connection',
      'DELETE_DATA': 'Deleting user data from database',
    }[operation],

    // Error details
    error: {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Error',
    },

    // What the system replied to the player
    systemResponse: `Sorry, we couldn't ${operation.includes('READ') ? 'load' : 'save'} your game data.\n\nError: ${errorMessage}`,

    // Context
    context: {
      userId: userId,
      gameId: gameId,
    },

    // UI Messages (single consolidated error message)
    uiMessages: [errorDisplayMessage]
  };
}

// Write queue to prevent overwhelming Firestore
let writeQueue: Promise<any> = Promise.resolve();
let lastWriteTime = 0;
const MIN_WRITE_INTERVAL_MS = 100; // Minimum 100ms between writes

/**
 * Save player state and logs to Firestore
 *
 * NEW ARCHITECTURE (to prevent 1MB document limit):
 * - Player state: Stored in player_states/{userId}_{gameId} (as before)
 * - Logs: Now stored in subcollection logs/{userId}_{gameId}/turns/{turnNumber}
 *   - Each turn is a separate document (no 1MB limit)
 *   - Summary document at logs/{userId}_{gameId} tracks metadata
 *
 * @param userId - User ID
 * @param gameId - Game ID
 * @param state - Current player state (will be saved with incremented turnCount)
 * @param messages - Messages array to append to logs
 */
export async function logAndSave(
  userId: string,
  gameId: GameId,
  state: PlayerState,
  messages: Message[]
): Promise<{ success: boolean; error?: Error }> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    const error = new Error('Firestore is not initialized');
    console.error('Firestore is not initialized.');
    return { success: false, error };
  }

  const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);

  // NEW: Use subcollections for logs to avoid 1MB document limit
  const logSummaryRef = doc(firestore, 'logs', `${userId}_${gameId}`);

  // Queue writes to prevent overwhelming Firestore write stream
  return new Promise((resolve) => {
    writeQueue = writeQueue.then(async () => {
      // Throttle: Ensure minimum time between writes
      const timeSinceLastWrite = Date.now() - lastWriteTime;
      if (timeSinceLastWrite < MIN_WRITE_INTERVAL_MS) {
        await new Promise(r => setTimeout(r, MIN_WRITE_INTERVAL_MS - timeSinceLastWrite));
      }

      try {
        const { writeBatch, collection } = await import('firebase/firestore');
        const batch = writeBatch(firestore);

        // Increment turn counter (or initialize to 1)
        const turnNumber = (state.turnCount || 0) + 1;
        const updatedState = { ...state, turnCount: turnNumber };

        // Write 1: Update player state with new turnCount
        if (updatedState) {
          batch.set(stateRef, updatedState, { merge: false });
        }

        // Write 2: Append messages to turns subcollection (prevents 1MB limit)
        // Each turn is a separate document: logs/{userId}_{gameId}/turns/{turnNumber}
        const turnRef = doc(collection(firestore, `logs/${userId}_${gameId}/turns`), String(turnNumber));
        batch.set(turnRef, {
          messages: messages,
          timestamp: Date.now(),
          chapterId: updatedState.currentChapterId,
          locationId: updatedState.currentLocationId,
        });

        // Write 3: Update summary document (tracks metadata)
        batch.set(logSummaryRef, {
          totalTurns: turnNumber,
          lastUpdated: Date.now(),
          currentChapter: updatedState.currentChapterId,
          currentLocation: updatedState.currentLocationId,
        }, { merge: true });

        // Commit the batch (single write stream operation for all 3 writes)
        await batch.commit();

        lastWriteTime = Date.now();
        console.log(`✅ Batched write completed for ${userId} (turn ${turnNumber})`);
        resolve({ success: true });
      } catch (error) {
        console.error('Failed to save game state or logs:', error);

        // Handle document size errors
        if (error instanceof Error && error.message.includes('exceeds the maximum allowed size')) {
          console.error('❌ Document too large. This should not happen with subcollections. Check log data.');
          const sizeError = new Error('Log document exceeded size limit. Please contact support.');
          resolve({ success: false, error: sizeError });
          return;
        }

        // Handle RESOURCE_EXHAUSTED with exponential backoff
        if (error instanceof Error && error.message.includes('RESOURCE_EXHAUSTED')) {
          console.warn('⚠️ Firestore write buffer full. Retrying with backoff...');

          // Wait 1 second and retry once
          await new Promise(r => setTimeout(r, 1000));

          try {
            const { writeBatch, collection } = await import('firebase/firestore');
            const retryBatch = writeBatch(firestore);

            const turnNumber = (state.turnCount || 0) + 1;
            const updatedState = { ...state, turnCount: turnNumber };

            if (updatedState) {
              retryBatch.set(stateRef, updatedState, { merge: false });
            }

            const turnRef = doc(collection(firestore, `logs/${userId}_${gameId}/turns`), String(turnNumber));
            retryBatch.set(turnRef, {
              messages: messages,
              timestamp: Date.now(),
              chapterId: updatedState.currentChapterId,
              locationId: updatedState.currentLocationId,
            });

            retryBatch.set(logSummaryRef, {
              totalTurns: turnNumber,
              lastUpdated: Date.now(),
              currentChapter: updatedState.currentChapterId,
              currentLocation: updatedState.currentLocationId,
            }, { merge: true });

            await retryBatch.commit();

            lastWriteTime = Date.now();
            console.log(`✅ Retry succeeded for ${userId}`);
            resolve({ success: true });
          } catch (retryError) {
            console.error('❌ Retry failed:', retryError);
            const dbError = retryError instanceof Error ? retryError : new Error('Unknown database error');
            resolve({ success: false, error: dbError });
          }
        } else {
          const dbError = error instanceof Error ? error : new Error('Unknown database error');
          resolve({ success: false, error: dbError });
        }
      }
    });
  });
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

    const [stateSnap, game] = await Promise.all([
        getDoc(stateRef),
        getGameData(gameId)
    ]);

    if (!stateSnap.exists()) {
        throw new Error("Player state not found. Cannot generate story.");
    }
    if (!game) {
        throw new Error("Game data could not be loaded. Cannot generate story.");
    }

    let playerState = stateSnap.data() as PlayerState;

    // Load logs using new helper that handles both old and new formats
    const allMessages = await getAllLogs(firestore, userId, gameId);
    if (allMessages.length === 0) {
        throw new Error("Logs not found. Cannot generate story.");
    }
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

/**
 * DEV ONLY: Apply checkpoint to skip to specific part of game
 */
export async function applyDevCheckpoint(userId: string, checkpointId: string): Promise<{ newState: PlayerState; messages: Message[] }> {
    // Only allow in development mode
    if (process.env.NEXT_PUBLIC_NODE_ENV !== 'development') {
        throw new Error('Dev checkpoints only available in development mode');
    }

    const game = await getGameData(GAME_ID);
    if (!game) {
        throw new Error("Game data could not be loaded");
    }

    const { firestore } = initializeFirebase();
    const stateRef = doc(firestore, 'player_states', `${userId}_${GAME_ID}`);
    const stateSnap = await getDoc(stateRef);

    let currentState: PlayerState;
    if (stateSnap.exists()) {
        currentState = stateSnap.data() as PlayerState;
    } else {
        currentState = getInitialState(game);
    }

    // Define checkpoints
    const checkpoints: Record<string, Effect[]> = {
        'metal_box_opened': [
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook' as GameObjectId, patch: { currentStateId: 'unlocked_but_closed' } }
        ],
        'sd_card_watched': [
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook' as GameObjectId, patch: { currentStateId: 'sd_card_watched_file_present' } }
        ],
        'confidential_file_read': [
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'read_secret_document' as Flag, value: true },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_brown_notebook' as GameObjectId, patch: { currentStateId: 'all_content_consumed' } }
        ],
        'recip_saw_found': [
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'read_secret_document' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'safe_is_unlocked' as Flag, value: true },
            { type: 'ADD_ITEM', itemId: 'item_recip_saw' as ItemId },
            { type: 'SET_ENTITY_STATE', entityId: 'item_recip_saw' as ItemId, patch: { currentStateId: 'taken', taken: true } }
        ],
        'hidden_door_found': [
            // Set player location to cafe interior
            { type: 'SET_LOCATION', locationId: 'loc_cafe_interior' as LocationId },
            // Progress flags
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'read_secret_document' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'safe_is_unlocked' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'bookshelf_destroyed' as Flag, value: true },
            // Give recip saw
            { type: 'ADD_ITEM', itemId: 'item_recip_saw' as ItemId },
            { type: 'SET_ENTITY_STATE', entityId: 'item_recip_saw' as ItemId, patch: { currentStateId: 'taken', taken: true } },
            // Destroy bookshelf and reveal hidden door
            { type: 'SET_ENTITY_STATE', entityId: 'obj_bookshelf' as GameObjectId, patch: { isBroken: true, isOpen: true } },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_deal' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_fbi' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_justice' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_hidden_door' as GameObjectId, parentId: 'obj_bookshelf' as GameObjectId }
        ],
        'hidden_door_opened': [
            // Set player location to cafe interior
            { type: 'SET_LOCATION', locationId: 'loc_cafe_interior' as LocationId },
            // Progress flags
            { type: 'SET_FLAG', flag: 'has_unlocked_notebook' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_video_watched' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'notebook_article_read' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'read_secret_document' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'safe_is_unlocked' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'bookshelf_destroyed' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'hidden_door_unlocked' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'hidden_door_opened' as Flag, value: true },
            { type: 'SET_FLAG', flag: 'note_dropped_from_book' as Flag, value: true },
            // Give recip saw
            { type: 'ADD_ITEM', itemId: 'item_recip_saw' as ItemId },
            { type: 'SET_ENTITY_STATE', entityId: 'item_recip_saw' as ItemId, patch: { currentStateId: 'taken', taken: true } },
            // Destroy bookshelf and reveal hidden door
            { type: 'SET_ENTITY_STATE', entityId: 'obj_bookshelf' as GameObjectId, patch: { isBroken: true, isOpen: true } },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_deal' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_fbi' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'item_book_justice' as ItemId, parentId: 'obj_bookshelf' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_hidden_door' as GameObjectId, parentId: 'obj_bookshelf' as GameObjectId },
            // Unlock and open hidden door
            { type: 'SET_ENTITY_STATE', entityId: 'obj_hidden_door' as GameObjectId, patch: { isLocked: false, isOpen: true, currentStateId: 'unlocked' } },
            // Reveal Lili and tablet inside
            { type: 'REVEAL_FROM_PARENT', entityId: 'npc_victim_girl' as NpcId, parentId: 'obj_hidden_door' as GameObjectId },
            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_tablet' as GameObjectId, parentId: 'obj_hidden_door' as GameObjectId }
        ]
    };

    const effects = checkpoints[checkpointId];
    if (!effects) {
        throw new Error(`Unknown checkpoint: ${checkpointId}`);
    }

    // Apply effects
    const result = await processEffects(currentState, effects, game);
    const newState = result.newState;

    // Save state
    await setDoc(stateRef, newState);

    // Load all messages
    const allMessages = await getAllLogs(firestore, userId, GAME_ID);

    // Add checkpoint message
    const checkpointMessage = createMessage(
        'system',
        'Dev Checkpoint',
        `✅ Checkpoint applied: ${checkpointId.replace(/_/g, ' ')}`
    );

    const updatedMessages = [...allMessages, checkpointMessage];
    await logAndSave(userId, GAME_ID, newState, [checkpointMessage]);

    return {
        newState,
        messages: normalizeTimestamps(updatedMessages)
    };
}
