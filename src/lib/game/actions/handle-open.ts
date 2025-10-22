import { CommandResult, createMessage } from "@/app/actions";
import type { Game, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { processActions } from "./process-actions";

export function handleOpen(state: PlayerState, targetName: string, game: Game): CommandResult {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const narratorName = game.narratorName || "Narrator";
    const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();

    const targetObjectId = location.objects.find(id =>
        chapter.gameObjects[id]?.name.toLowerCase().includes(normalizedTargetName)
    );

    if (!targetObjectId) {
        return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to open.`)] };
    }

    const liveObject = getLiveGameObject(targetObjectId, state, game);
    if (!liveObject) {
         return { newState: state, messages: [createMessage('system', 'System', `You don't see a "${targetName}" to open.`)] };
    }
    
    if (liveObject.state.isLocked) {
        const lockMessage = liveObject.gameLogic.fallbackMessages?.locked || "It's locked.";
        return { newState: state, messages: [createMessage('narrator', narratorName, lockMessage)] };
    }

    if (liveObject.state.isOpen) {
        const alreadyOpenMessage = liveObject.gameLogic.handlers.onExamine?.alternateMessage || "It's already open.";
        return { newState: state, messages: [createMessage('narrator', narratorName, alreadyOpenMessage)] };
    }
    
    if (!liveObject.gameLogic.capabilities.openable) {
         return { newState: state, messages: [createMessage('narrator', narratorName, `You can't open the ${liveObject.gameLogic.name}.`)] };
    }

    // Open the object
    let newState = JSON.parse(JSON.stringify(state));
    if (!newState.objectStates[liveObject.gameLogic.id]) {
        newState.objectStates[liveObject.gameLogic.id] = {};
    }
    newState.objectStates[liveObject.gameLogic.id].isOpen = true;

    const onOpen = liveObject.gameLogic.handlers.onOpen;
    const messageContent = onOpen?.success.message || `You open the ${liveObject.gameLogic.name}.`;
    const actions = onOpen?.success.actions || [];
    
    let actionResult = processActions(newState, actions, game);
    
    const mainMessage = createMessage(
        'narrator',
        narratorName,
        messageContent,
        'image',
        { id: liveObject.gameLogic.id, game, state: actionResult.newState!, showEvenIfExamined: true }
    );
    actionResult.messages.unshift(mainMessage);

    return actionResult;
}
