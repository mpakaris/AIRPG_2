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

        // Generate AI-powered contextual hint
        // Use the player's original input as their "question" for more personalized response
        const { hint } = await generateContextualHint({
            chapterGoal: chapter.goal,
            currentStepDescription: progress.currentStep.description,
            baseHint: progress.currentStep.baseHint,
            detailedHint: progress.currentStep.detailedHint,
            playerQuestion: playerInput, // Use their actual confused expression
            gameContext,
            completedSteps: completedStepDescriptions,
        });

        // Return the hint with an encouraging tone
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: hint
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
