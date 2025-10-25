import type { CommandResult } from "@/lib/game/types";
import type { Game, PlayerState } from "../types";
import { createMessage } from "./process-effects";

export async function handleHelp(state: PlayerState, game: Game): Promise<CommandResult> {
    const chapter = game.chapters[state.currentChapterId];
    const agentName = game.narratorName || "Agent Sharma";

    if (!chapter.objectives || chapter.objectives.length === 0) {
        return { newState: state, messages: [createMessage('agent', agentName, "Looks like we're just exploring for now. Let's see what we can find.")] };
    }

    const nextObjective = chapter.objectives.find(obj => !state.flags.includes(obj.flag));

    if (!nextObjective) {
        // All objectives for this chapter are complete.
        return { newState: state, messages: [createMessage('agent', agentName, "I think we've done everything we need to do here, Burt. We should be able to move on to the next location.")] };
    }

    const hint = chapter.hints?.find(h => h.flag === nextObjective.flag);

    if (hint) {
        return { newState: state, messages: [createMessage('agent', agentName, hint.text)] };
    }

    // Fallback if a hint is missing for an objective
    return { newState: state, messages: [createMessage('agent', agentName, `Let's focus on figuring out: ${nextObjective.label}. What's our next move?`)] };
}
