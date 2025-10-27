/**
 * handle-help - NEW ARCHITECTURE
 *
 * Handles help requests from the player.
 * Uses AI to provide contextual hints.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import { guidePlayerWithNarrator } from "@/ai";
import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { GameStateManager, VisibilityResolver } from "@/lib/game/engine";
import { AVAILABLE_COMMANDS } from "../commands";

export async function handleHelp(state: PlayerState, game: Game): Promise<Effect[]> {
    const agentName = game.narratorName || "Agent Sharma";
    const chapter = game.chapters[state.currentChapterId];

    // Fallback in case AI fails or for testing
    const nextObjective = chapter.objectives?.find(obj => !GameStateManager.hasFlag(state, obj.flag));
    const fallbackHint = chapter.hints?.find(h => h.flag === nextObjective?.flag);
    const fallbackMessage = fallbackHint?.text || "Let's focus on the mission. What's our next move?";

    try {
        const location = game.locations[state.currentLocationId];
        const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

        // Build visible object names
        const visibleObjectNames = visibleEntities.objects
            .map(id => game.gameObjects[id as any]?.name)
            .filter(Boolean) as string[];

        // Add visible items
        const visibleItemNames = visibleEntities.items
            .map(id => game.items[id as any]?.name)
            .filter(Boolean) as string[];
        visibleObjectNames.push(...visibleItemNames);

        const visibleNpcNames = visibleEntities.npcs
            .map(id => game.npcs[id as any]?.name)
            .filter(Boolean) as string[];

        const { output: aiResponse, usage } = await guidePlayerWithNarrator({
            promptContext: `You are Agent Sharma. The player, Burt, has asked for help. Your task is to provide a subtle, in-character hint based on the current Game State. Analyze the incomplete objectives and the visible items/NPCs. Guide Burt towards the next logical step without giving away the answer directly. Your response should be conversational and encouraging. Your commandToExecute MUST be "invalid".`,
            gameState: JSON.stringify({
                chapterGoal: chapter.goal,
                currentLocation: location.name,
                inventory: state.inventory.map(id => game.items[id]?.name),
                flags: Object.keys(state.flags || {}).filter(key => state.flags[key]),
                currentObjectives: chapter.objectives,
            }, null, 2),
            playerCommand: "help",
            availableCommands: AVAILABLE_COMMANDS.join(', '),
            visibleObjectNames: visibleObjectNames,
            visibleNpcNames: visibleNpcNames,
        });

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'agent',
            content: aiResponse.agentResponse
            // Note: Usage tracking would need to be handled separately
        }];

    } catch (error) {
        console.error("Error in AI-powered handleHelp:", error);
        // If AI fails, provide the deterministic, pre-written hint
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'agent',
            content: fallbackMessage
        }];
    }
}
