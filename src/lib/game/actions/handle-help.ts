
'use server';

import { guidePlayerWithNarrator } from "@/ai";
import type { CommandResult, Game, PlayerState, LocationState, GameObject, GameObjectState } from "@/lib/game/types";
import { createMessage } from "@/lib/utils";
import { getLiveGameObject } from "../utils/helpers";
import { AVAILABLE_COMMANDS } from "../commands";

export async function handleHelp(state: PlayerState, game: Game): Promise<CommandResult> {
    const agentName = game.narratorName || "Agent Sharma";
    const chapter = game.chapters[state.currentChapterId];
    
    // Fallback in case AI fails or for testing
    const nextObjective = chapter.objectives?.find(obj => !state.flags.includes(obj.flag));
    const fallbackHint = chapter.hints?.find(h => h.flag === nextObjective?.flag);
    const fallbackMessage = fallbackHint?.text || "Let's focus on the mission. What's our next move?";

    try {
        const location = game.locations[state.currentLocationId];
        const examinedObjectFlag = (id: string) => `examined_${id}`;
        
        const locationState: LocationState = state.locationStates[state.currentLocationId] || { objects: location.objects };
        const visibleObjects = locationState.objects.map(id => getLiveGameObject(id, state, game)).filter(Boolean) as {gameLogic: GameObject, state: GameObjectState}[];
        const visibleObjectNames = visibleObjects.map(obj => obj.gameLogic.name);

        for (const obj of visibleObjects) {
            const hasBeenExamined = state.flags.includes(examinedObjectFlag(obj.gameLogic.id));
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

        const { output: aiResponse, usage } = await guidePlayerWithNarrator({
            promptContext: `You are Agent Sharma. The player, Burt, has asked for help. Your task is to provide a subtle, in-character hint based on the current Game State. Analyze the incomplete objectives and the visible items/NPCs. Guide Burt towards the next logical step without giving away the answer directly. Your response should be conversational and encouraging. Your commandToExecute MUST be "invalid".`,
            gameState: JSON.stringify({
                chapterGoal: chapter.goal,
                currentLocation: location.name,
                inventory: state.inventory.map(id => game.items[id]?.name),
                flags: state.flags,
                currentObjectives: chapter.objectives,
            }, null, 2),
            playerCommand: "help",
            availableCommands: AVAILABLE_COMMANDS.join(', '),
            visibleObjectNames: visibleObjectNames,
            visibleNpcNames: visibleNpcNames,
        });

        const agentMessage = createMessage('agent', agentName, aiResponse.agentResponse, 'text', undefined, usage);
        return { newState: state, messages: [agentMessage] };

    } catch (error) {
        console.error("Error in AI-powered handleHelp:", error);
        // If AI fails, provide the deterministic, pre-written hint
        return { newState: state, messages: [createMessage('agent', agentName, fallbackMessage)] };
    }
}
