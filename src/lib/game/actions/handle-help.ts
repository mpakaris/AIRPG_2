/**
 * handle-help - HAPPY PATH ARCHITECTURE
 *
 * Handles help requests from the player using the chapter's happy path.
 *
 * Features:
 * 1. Analyzes player progress through happy path steps
 * 2. Generates AI-powered contextual hints for the NEXT step only
 * 3. Supports progressive hints (generic → detailed)
 * 4. Tracks chapter completion
 *
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import { generateContextualHint } from "@/ai";
import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { analyzeHappyPathProgress } from "@/lib/game/utils/happy-path-tracker";

// Constants
const MAX_AI_HELPS_PER_CHAPTER = 10;
const WARNING_THRESHOLD = 3; // Warn when 3 or fewer helps remaining

/**
 * Handles help command - provides contextual hints based on happy path progress
 *
 * Features:
 * - Limited to 10 AI-powered hints per chapter
 * - After limit: falls back to pre-written hints (no AI cost)
 * - Shows remaining help count
 * - Warns when running low
 *
 * @param state - Current player state
 * @param playerQuestion - Optional specific question (e.g., "I don't know how to open the box")
 * @param game - Game data
 */
export async function handleHelp(
    state: PlayerState,
    playerQuestion: string | null,
    game: Game
): Promise<Effect[]> {
    const chapter = game.chapters[state.currentChapterId];

    // Check if chapter has a happy path defined
    if (!chapter.happyPath || chapter.happyPath.length === 0) {
        // Fallback to legacy hint system
        return handleLegacyHelp(state, game);
    }

    // Analyze player's progress through the happy path
    const progress = analyzeHappyPathProgress(state, chapter, game);

    // If chapter is complete, congratulate player
    if (progress.isChapterComplete) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `You've completed all the main objectives! ${chapter.completionVideo ? 'Use the "next" command when you\'re ready to proceed.' : 'Well done!'}`
        }];
    }

    // If no current step (shouldn't happen), provide generic help
    if (!progress.currentStep) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: "You're doing well. Keep exploring and interacting with your surroundings."
        }];
    }

    // Check help counter for this chapter
    const helpCounterKey = `help_requests_${state.currentChapterId}`;
    const currentHelpCount = state.counters?.[helpCounterKey] || 0;
    const helpsRemaining = MAX_AI_HELPS_PER_CHAPTER - currentHelpCount;
    const hasAIHelpsRemaining = helpsRemaining > 0;

    const effects: Effect[] = [];
    let hintContent: string;

    // If no AI helps remaining, use pre-written hint
    if (!hasAIHelpsRemaining) {
        hintContent = progress.currentStep.detailedHint || progress.currentStep.baseHint;

        // Add a note that they're out of AI helps
        hintContent = `💡 ${hintContent}\n\n🔋 You've used all ${MAX_AI_HELPS_PER_CHAPTER} AI-powered hints for this chapter. Think carefully and explore!`;

        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: hintContent
        });

        return effects;
    }

    // Try to generate AI-powered hint
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
        if (playerQuestion) {
            mentionedEntityNames = detectMentionedEntities(playerQuestion, state, game);

            // If player mentioned an entity they're NOT focused on, get its info instead
            if (mentionedEntityNames.length > 0 && (!state.currentFocusId || !mentionedEntityNames.includes(focusedEntityName || ''))) {
                const mentionedEntity = findEntityByName(mentionedEntityNames[0], state, game);
                if (mentionedEntity) {
                    focusedEntityName = mentionedEntity.name;
                    focusedEntityCapabilities = mentionedEntity.capabilities;
                    focusedEntityHandlers = mentionedEntity.handlers;
                }
            }
        }

        // Generate AI-powered contextual hint
        const { output, usage } = await generateContextualHint({
            chapterGoal: chapter.goal,
            currentStepDescription: progress.currentStep.description,
            baseHint: progress.currentStep.baseHint,
            detailedHint: progress.currentStep.detailedHint,
            playerQuestion: playerQuestion || undefined,
            gameContext,
            completedSteps: completedStepDescriptions,
            focusedEntityName,
            focusedEntityCapabilities,
            focusedEntityHandlers,
            mentionedEntityNames,
        });

        hintContent = `💡 ${output.hint}`;

        // Increment help counter
        effects.push({
            type: 'INC_COUNTER',
            key: helpCounterKey,
            by: 1
        });

        // Add remaining count info
        const newHelpsRemaining = helpsRemaining - 1;

        // Show warning if running low
        if (newHelpsRemaining <= WARNING_THRESHOLD && newHelpsRemaining > 0) {
            hintContent += `\n\n⚠️  You have ${newHelpsRemaining} AI-powered hint${newHelpsRemaining === 1 ? '' : 's'} remaining for this chapter. Use them wisely!`;
        } else if (newHelpsRemaining === 0) {
            hintContent += `\n\n⚠️  This was your last AI-powered hint! Future help requests will show basic hints.`;
        } else {
            hintContent += `\n\n💬 AI Hints remaining: ${newHelpsRemaining}/${MAX_AI_HELPS_PER_CHAPTER}`;
        }

        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: hintContent,
            usage
        });

        return effects;

    } catch (error) {
        console.error("Error generating contextual hint:", error);

        // Fallback to the pre-written hint from happy path (don't count against limit if AI failed)
        const fallbackHint = progress.currentStep.detailedHint || progress.currentStep.baseHint;

        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `💡 ${fallbackHint}\n\n🔧 (AI hint generation failed - this didn't count against your limit)`
        });

        return effects;
    }
}

/**
 * Legacy help system for chapters without happy path defined
 */
function handleLegacyHelp(state: PlayerState, game: Game): Effect[] {
    const chapter = game.chapters[state.currentChapterId];

    const nextObjective = chapter.objectives?.find(obj =>
        !state.flags[obj.flag]
    );

    const fallbackHint = chapter.hints?.find(h => h.flag === nextObjective?.flag);
    const fallbackMessage = fallbackHint?.text || "Focus on the current objective. Examine your surroundings and inventory.";

    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: fallbackMessage
    }];
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

    // Check all visible objects
    const location = game.locations[state.currentLocationId];
    if (location?.objects) {
        for (const objId of location.objects) {
            const obj = game.gameObjects[objId];
            if (obj) {
                // Check if object name or any word from name is in the question
                const nameWords = obj.name.toLowerCase().split(' ');
                const matchesName = nameWords.some(word => word.length > 3 && normalizedQuestion.includes(word));

                if (normalizedQuestion.includes(obj.name.toLowerCase()) || matchesName) {
                    mentioned.push(obj.name);
                } else if (obj.alternateNames) {
                    for (const altName of obj.alternateNames) {
                        if (normalizedQuestion.includes(altName.toLowerCase())) {
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
