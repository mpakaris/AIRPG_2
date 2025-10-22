import { CommandResult, createMessage } from "@/app/actions";
import type { Game, Location, PlayerState, ChapterId, Flag } from "../types";

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;

function checkChapterCompletion(state: PlayerState, game: Game): { isComplete: boolean; messages: any[] } {
    const chapter = game.chapters[state.currentChapterId];
    const isAlreadyComplete = state.flags.includes(chapterCompletionFlag(state.currentChapterId));

    if (isAlreadyComplete || !chapter.objectives || chapter.objectives.length === 0) {
        return { isComplete: isAlreadyComplete, messages: [] };
    }
    
    const allObjectivesMet = chapter.objectives.every(obj => state.flags.includes(obj.flag));

    if (allObjectivesMet) {
        // Messages are handled by the main processCommand loop now
        return { isComplete: true, messages: [] };
    }
    
    return { isComplete: false, messages: [] };
}


export function handleGo(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const currentLocation = chapter.locations[state.currentLocationId];
    targetName = targetName.toLowerCase();
    const narratorName = game.narratorName || "Narrator";

    if (targetName === 'next_chapter') {
        const completion = checkChapterCompletion(state, game);
        if (completion.isComplete) {
            const nextChapterId = chapter.nextChapter?.id;
            if (nextChapterId && game.chapters[nextChapterId]) {
                const nextChapter = game.chapters[nextChapterId];
                const newState: PlayerState = {
                    ...state,
                    currentChapterId: nextChapterId,
                    currentLocationId: nextChapter.startLocationId,
                    activeConversationWith: null,
                    interactingWithObject: null,
                };
                const newLocation = nextChapter.locations[newState.currentLocationId];
                return {
                    newState,
                    messages: [
                        createMessage('system', 'System', `You are now in Chapter: ${nextChapter.title}.`),
                        createMessage('narrator', narratorName, newLocation.description),
                    ]
                };
            } else {
                 return { newState: state, messages: [createMessage('system', 'System', `There is no next chapter defined.`)] };
            }
        } else {
            return { newState: state, messages: [createMessage('agent', narratorName, `Wait a second. We still need to ${chapter.goal.toLowerCase()} here in ${currentLocation.name}. We can't move on until we've figured that out.`)] };
        }
    }

    let targetLocation: Location | undefined;
    targetLocation = Object.values(chapter.locations).find(loc => loc.name.toLowerCase() === targetName);

    if (!targetLocation) {
        const { x, y } = currentLocation.gridPosition;
        let nextPos = { x, y };
        switch (targetName) {
            case 'north': nextPos.y -= 1; break;
            case 'south': nextPos.y += 1; break;
            case 'east': nextPos.x += 1; break;
            case 'west': nextPos.x -= 1; break;
        }
        targetLocation = Object.values(chapter.locations).find(loc => loc.gridPosition.x === nextPos.x && loc.gridPosition.y === nextPos.y);
    }
    
    if (targetLocation) {
        const newState = { ...state, currentLocationId: targetLocation.id, activeConversationWith: null, interactingWithObject: null };
        return {
            newState,
            messages: [
                createMessage('system', 'System', `You go to the ${targetLocation.name}.`),
                createMessage('narrator', narratorName, targetLocation.description)
            ]
        };
    }

    return { newState: state, messages: [createMessage('system', 'System', `You can't go there.`)] };
}
