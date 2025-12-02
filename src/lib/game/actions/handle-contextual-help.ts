/**
 * handle-contextual-help - NATURAL LANGUAGE HELP
 *
 * Handles natural expressions of confusion or frustration from the player.
 * Unlike explicit /help commands, this provides gentle guidance without
 * counting against the player's help limit.
 *
 * Triggered by phrases like:
 * - "I'm stuck"
 * - "I don't know what to do"
 * - "What should I do next?"
 * - "I'm confused"
 * - "Help me"
 *
 * Philosophy:
 * - More encouraging/gentle than explicit help
 * - No help counter tracking (doesn't cost the player)
 * - Uses AI to provide natural, contextual guidance
 * - Maintains narrator voice for immersion
 *
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import { generateContextualHint } from "@/ai";
import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { analyzeHappyPathProgress } from "@/lib/game/utils/happy-path-tracker";

/**
 * Handles natural expressions of confusion/frustration
 *
 * @param state - Current player state
 * @param playerInput - The original player input expressing confusion
 * @param game - Game data
 */
export async function handleContextualHelp(
    state: PlayerState,
    playerInput: string,
    game: Game
): Promise<Effect[]> {
    const chapter = game.chapters[state.currentChapterId];

    // FIRST: Try entity-specific help (even without happy path)
    if (playerInput) {
        const mentionedEntityNames = detectMentionedEntities(playerInput, state, game);
        console.log('[CONTEXTUAL HELP] Detected entities:', mentionedEntityNames);

        if (mentionedEntityNames.length > 0) {
            const mentionedEntity = findEntityByName(mentionedEntityNames[0], state, game);
            console.log('[CONTEXTUAL HELP] Found entity:', mentionedEntity);

            if (mentionedEntity && (mentionedEntity.capabilities || mentionedEntity.handlers)) {
                // Generate entity-specific atmospheric hint
                try {
                    const location = game.locations[state.currentLocationId];
                    const { output, usage } = await generateContextualHint({
                        chapterGoal: chapter.goal || 'Investigate the area',
                        currentStepDescription: 'Explore and interact with objects',
                        baseHint: 'Look around and try different actions',
                        gameContext: `Location: ${location?.name || 'Unknown'}`,
                        completedSteps: [],
                        focusedEntityName: mentionedEntity.name,
                        focusedEntityCapabilities: mentionedEntity.capabilities,
                        focusedEntityHandlers: mentionedEntity.handlers,
                        mentionedEntityNames,
                    });

                    return [{
                        type: 'SHOW_MESSAGE',
                        speaker: 'narrator',
                        content: output.hint,
                        usage
                    }];
                } catch (error) {
                    console.error("Error generating entity hint:", error);
                    // Fall through to happy path system
                }
            }
        }
    }

    // Check if chapter has a happy path defined
    if (!chapter.happyPath || chapter.happyPath.length === 0) {
        // Fallback to generic encouragement
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: "Take your time. Look around, examine objects, and talk to people. The clues are there if you look carefully."
        }];
    }

    // Analyze player's progress through the happy path
    const progress = analyzeHappyPathProgress(state, chapter, game);

    // If chapter is complete, congratulate player
    if (progress.isChapterComplete) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `You've made excellent progress! ${chapter.completionVideo ? 'You can use the "next" command when you\'re ready to continue.' : 'Keep going!'}`
        }];
    }

    // If no current step (shouldn't happen), provide generic encouragement
    if (!progress.currentStep) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: "You're on the right track. Continue exploring and interacting with what you find."
        }];
    }

    // Try to generate AI-powered contextual hint
    try {
        // Build game context for AI
        const location = game.locations[state.currentLocationId];
        const inventoryNames = state.inventory
            .map(id => game.items[id]?.name)
            .filter(Boolean);

        const gameContext = [
            `Location: ${location?.name || 'Unknown'}`,
            inventoryNames.length > 0
                ? `Inventory: ${inventoryNames.join(', ')}`
                : 'Inventory: Empty',
            state.currentFocusId
                ? `Currently examining: ${getEntityName(state.currentFocusId, game)}`
                : null
        ].filter(Boolean).join('\n');

        const completedStepDescriptions = progress.completedSteps.map(s => s.description);

        // Extract entity capabilities and handlers if player is focused on something
        let focusedEntityName: string | undefined;
        let focusedEntityCapabilities: any | undefined;
        let focusedEntityHandlers: string[] | undefined;
        let mentionedEntityNames: string[] = [];

        if (state.currentFocusId) {
            focusedEntityName = getEntityName(state.currentFocusId, game);
            const entityInfo = getEntityInfo(state.currentFocusId, game);
            focusedEntityCapabilities = entityInfo?.capabilities;
            focusedEntityHandlers = entityInfo?.handlers;
        }

        // Detect entities mentioned in player's question
        if (playerInput) {
            mentionedEntityNames = detectMentionedEntities(playerInput, state, game);
            console.log('[CONTEXTUAL HELP] Player input:', playerInput);
            console.log('[CONTEXTUAL HELP] Detected entities:', mentionedEntityNames);

            // If player mentioned an entity they're NOT focused on, get its info instead
            if (mentionedEntityNames.length > 0 && (!state.currentFocusId || !mentionedEntityNames.includes(focusedEntityName || ''))) {
                const mentionedEntity = findEntityByName(mentionedEntityNames[0], state, game);
                console.log('[CONTEXTUAL HELP] Found entity info:', mentionedEntity);
                if (mentionedEntity) {
                    focusedEntityName = mentionedEntity.name;
                    focusedEntityCapabilities = mentionedEntity.capabilities;
                    focusedEntityHandlers = mentionedEntity.handlers;
                    console.log('[CONTEXTUAL HELP] Using entity:', focusedEntityName);
                    console.log('[CONTEXTUAL HELP] Capabilities:', focusedEntityCapabilities);
                    console.log('[CONTEXTUAL HELP] Handlers:', focusedEntityHandlers);
                }
            }
        }

        // Generate AI-powered contextual hint
        // Use the player's original input as their "question" for more personalized response
        const { output, usage } = await generateContextualHint({
            chapterGoal: chapter.goal,
            currentStepDescription: progress.currentStep.description,
            baseHint: progress.currentStep.baseHint,
            detailedHint: progress.currentStep.detailedHint,
            playerQuestion: playerInput, // Use their actual confused expression
            gameContext,
            completedSteps: completedStepDescriptions,
            focusedEntityName,
            focusedEntityCapabilities,
            focusedEntityHandlers,
            mentionedEntityNames,
        });

        // Return the hint with an encouraging tone
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: output.hint,
            usage
        }];

    } catch (error) {
        console.error("Error generating contextual help:", error);

        // Fallback to the pre-written hint from happy path
        const fallbackHint = progress.currentStep.baseHint;

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: fallbackHint
        }];
    }
}

/**
 * Helper to get entity name by ID
 */
function getEntityName(entityId: string, game: Game): string {
    return (
        game.gameObjects[entityId as any]?.name ||
        game.items[entityId as any]?.name ||
        game.npcs[entityId as any]?.name ||
        'something'
    );
}

/**
 * Helper to extract capabilities and handlers from an entity
 */
function getEntityInfo(entityId: string, game: Game): { capabilities?: any; handlers?: string[] } | undefined {
    const entity = game.gameObjects[entityId as any] || game.items[entityId as any] || game.npcs[entityId as any];

    if (!entity) {
        return undefined;
    }

    return {
        capabilities: entity.capabilities,
        handlers: entity.handlers ? Object.keys(entity.handlers) : []
    };
}

/**
 * Detect entity names mentioned in player's question
 * Returns array of normalized entity names found in the question
 */
function detectMentionedEntities(question: string, state: PlayerState, game: Game): string[] {
    const normalizedQuestion = question.toLowerCase();
    const mentioned: string[] = [];

    console.log('[detectMentionedEntities] Question:', normalizedQuestion);
    console.log('[detectMentionedEntities] Current location:', state.currentLocationId);

    // Check all visible objects
    const location = game.locations[state.currentLocationId];
    console.log('[detectMentionedEntities] Location objects:', location?.objects);

    if (location?.objects) {
        for (const objId of location.objects) {
            const obj = game.gameObjects[objId];
            if (obj) {
                // Check if object name or any word from name is in the question
                const nameWords = obj.name.toLowerCase().split(' ');
                const matchesName = nameWords.some(word => word.length > 3 && normalizedQuestion.includes(word));

                console.log(`[detectMentionedEntities] Checking object: ${obj.name}, words: ${nameWords}, matches: ${matchesName}`);

                if (normalizedQuestion.includes(obj.name.toLowerCase()) || matchesName) {
                    console.log(`[detectMentionedEntities] MATCHED: ${obj.name}`);
                    mentioned.push(obj.name);
                } else if (obj.alternateNames) {
                    for (const altName of obj.alternateNames) {
                        if (normalizedQuestion.includes(altName.toLowerCase())) {
                            console.log(`[detectMentionedEntities] MATCHED via alternate name: ${obj.name}`);
                            mentioned.push(obj.name);
                            break;
                        }
                    }
                }
            }
        }
    }

    // Check all visible items
    for (const itemId in game.items) {
        const item = game.items[itemId as any];
        if (item) {
            // Check if item name or any word from name is in the question
            const nameWords = item.name.toLowerCase().split(' ');
            const matchesName = nameWords.some(word => word.length > 3 && normalizedQuestion.includes(word));

            if (normalizedQuestion.includes(item.name.toLowerCase()) || matchesName) {
                mentioned.push(item.name);
            } else if (item.alternateNames) {
                for (const altName of item.alternateNames) {
                    if (normalizedQuestion.includes(altName.toLowerCase())) {
                        mentioned.push(item.name);
                        break;
                    }
                }
            }
        }
    }

    // Check NPCs
    if (location?.npcs) {
        for (const npcId of location.npcs) {
            const npc = game.npcs[npcId];
            if (npc) {
                if (normalizedQuestion.includes(npc.name.toLowerCase())) {
                    mentioned.push(npc.name);
                }
            }
        }
    }

    return mentioned;
}

/**
 * Find entity by name and return its info (capabilities and handlers)
 */
function findEntityByName(entityName: string, state: PlayerState, game: Game): { name: string; capabilities?: any; handlers?: string[] } | null {
    const normalizedName = entityName.toLowerCase();

    // Search objects
    for (const objId in game.gameObjects) {
        const obj = game.gameObjects[objId as any];
        if (obj && obj.name.toLowerCase() === normalizedName) {
            return {
                name: obj.name,
                capabilities: obj.capabilities,
                handlers: obj.handlers ? Object.keys(obj.handlers) : []
            };
        }
    }

    // Search items
    for (const itemId in game.items) {
        const item = game.items[itemId as any];
        if (item && item.name.toLowerCase() === normalizedName) {
            return {
                name: item.name,
                capabilities: item.capabilities,
                handlers: item.handlers ? Object.keys(item.handlers) : []
            };
        }
    }

    // Search NPCs
    for (const npcId in game.npcs) {
        const npc = game.npcs[npcId as any];
        if (npc && npc.name.toLowerCase() === normalizedName) {
            return {
                name: npc.name,
                capabilities: undefined, // NPCs don't have capabilities
                handlers: npc.handlers ? Object.keys(npc.handlers) : []
            };
        }
    }

    return null;
}
