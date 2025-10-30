
'use server';

import { processEffects } from "@/lib/game/actions/process-effects";
import type { CommandResult, Game, GameObject, GameObjectState, PlayerState } from "@/lib/game/types";
import { getLiveGameObject } from "@/lib/game/utils/helpers";
import { createMessage, normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function processPassword(state: PlayerState, command: string, game: Game): Promise<CommandResult> {
    const narratorName = "Narrator";
    const agentName = game.narratorName || 'Agent Sharma';
    const location = game.locations[state.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, state, game)).filter(Boolean) as {gameLogic: GameObject, state: GameObjectState}[];
    
    const commandLower = command.toLowerCase();

    let targetObjectResult = objectsInLocation.find(obj => {
        if (!obj.gameLogic.input || obj.gameLogic.input.type !== 'phrase') return false;
        return commandLower.includes(normalizeName(obj.gameLogic.name));
    });

    if (!targetObjectResult) {
        const passwordObjects = objectsInLocation.filter(obj => obj.state.isLocked && obj.gameLogic.input?.type === 'phrase');
        if (passwordObjects.length === 1) {
            targetObjectResult = passwordObjects[0];
        } else {
             return { newState: state, messages: [createMessage('system', 'System', 'You need to be more specific about what you are using the password on.')] };
        }
    }

    const targetObject = targetObjectResult;

    if (!targetObject.state.isLocked) {
        return { 
            newState: state, 
            messages: [createMessage('agent', agentName, `No need, Burt. We already unlocked the ${targetObject.gameLogic.name}.`)]
        };
    }
    
    const targetObjectNameLower = normalizeName(targetObject.gameLogic.name);
    let phrase = command;
    const objectNameIndex = phrase.toLowerCase().indexOf(targetObjectNameLower);
    if (objectNameIndex !== -1) {
        phrase = phrase.substring(objectNameIndex + targetObjectNameLower.length);
    }
    
    phrase = phrase.replace(/^\s*(password|say|enter|for|is)\s*/i, '');
    phrase = normalizeName(phrase);

    if (!phrase) {
        return { newState: state, messages: [createMessage('narrator', narratorName, 'It seems you tried a passphrase. Unfortunately, this is not it.')] };
    }
    
    const expectedPhrase = targetObject.gameLogic.input?.validation;
    const handler = targetObject.gameLogic.handlers.onUnlock;

    if (normalizeName(phrase) === normalizeName(expectedPhrase)) {
        const effects = [
            ...(handler?.success?.effects || []),
            { type: 'SET_OBJECT_STATE' as const, objectId: targetObject.gameLogic.id, state: { isLocked: false, isOpen: true } },
            { type: 'SET_FLAG' as const, flag: examinedObjectFlag(targetObject.gameLogic.id) as any }
        ];

        const result = await processEffects(state, effects, game);
        
        const unlockMessage = createMessage(
            'narrator', 
            narratorName, 
            handler?.success?.message || "It unlocks!",
            'image',
            { id: targetObject.gameLogic.id, game, state: result.newState!, showEvenIfExamined: true }
        );
        result.messages.unshift(unlockMessage);
        
        return result;
    } else {
        const failMessage = handler?.fail?.message || 'That password doesn\'t work.';
        return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
    }
}
