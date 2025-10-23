

import { CommandResult } from "@/app/actions";
import type { Game, GameObject, GameObjectState, PlayerState } from "../types";
import { getLiveGameObject } from "./helpers";
import { createMessage, processEffects } from "./process-effects";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export function processPassword(state: PlayerState, command: string, game: Game): CommandResult {
    const narratorName = game.narratorName || "Narrator";
    const location = game.locations[state.currentLocationId];
    const objectsInLocation = location.objects.map(id => getLiveGameObject(id, state, game)).filter(Boolean) as {gameLogic: GameObject, state: GameObjectState}[];
    
    const commandLower = command.toLowerCase();

    // Find the target object
    let targetObjectResult = objectsInLocation.find(obj => {
        if (!obj.gameLogic.input || obj.gameLogic.input.type !== 'phrase') return false;
        // Prioritize object names that appear in the command
        return commandLower.includes(obj.gameLogic.name.toLowerCase());
    });

    // If no object is explicitly mentioned, find the single, implicitly targeted object
    if (!targetObjectResult) {
        const passwordObjects = objectsInLocation.filter(obj => obj.state.isLocked && obj.gameLogic.input?.type === 'phrase');
        if (passwordObjects.length === 1) {
            targetObjectResult = passwordObjects[0];
        } else {
             return { newState: state, messages: [createMessage('system', 'System', 'You need to be more specific about what you are using the password on.')] };
        }
    }

    const targetObject = targetObjectResult;

    // Check if the object is already unlocked
    if (!targetObject.state.isLocked) {
        return { 
            newState: state, 
            messages: [],
            resultType: 'ALREADY_UNLOCKED',
            targetObjectName: targetObject.gameLogic.name
        };
    }
    
    // Extract the phrase
    const targetObjectNameLower = targetObject.gameLogic.name.toLowerCase();
    let phrase = command;
    const objectNameIndex = phrase.toLowerCase().indexOf(targetObjectNameLower);
    if (objectNameIndex !== -1) {
        phrase = phrase.substring(objectNameIndex + targetObjectNameLower.length);
    }
    
    // Remove initial command verb if present
    phrase = phrase.replace(/^\s*(password|say|enter|for|is)\s*/i, '');
    // Clean up quotes and trim
    phrase = phrase.replace(/^"|"$/g, '').trim();

    if (!phrase) {
        return { newState: state, messages: [createMessage('narrator', narratorName, 'You need to specify a password phrase.')] };
    }
    
    const expectedPhrase = targetObject.gameLogic.input?.validation;
    const handler = targetObject.gameLogic.handlers.onUnlock;

    if (phrase.toLowerCase() === expectedPhrase?.toLowerCase()) {
        let newState = { ...state, objectStates: { ...state.objectStates }};
        if (!newState.objectStates[targetObject.gameLogic.id]) newState.objectStates[targetObject.gameLogic.id] = {} as any;
        newState.objectStates[targetObject.gameLogic.id].isLocked = false;
        newState.objectStates[targetObject.gameLogic.id].isOpen = true; // Also open it
        
        const effects = handler?.success?.effects || [];
        const result = processEffects(newState, effects, game);
        
        const unlockMessage = createMessage(
            'narrator', 
            narratorName, 
            handler?.success?.message || "It unlocks!",
            'image',
            { id: targetObject.gameLogic.id, game, state: result.newState!, showEvenIfExamined: true }
        );
        result.messages.unshift(unlockMessage);

        const flag = examinedObjectFlag(targetObject.gameLogic.id);
        if (result.newState! && !result.newState!.flags.includes(flag as any)) {
            result.newState!.flags.push(flag as any);
        }
        
        return result;
    } else {
        const failMessage = handler?.fail?.message || 'That password doesn\'t work.';
        return { newState: state, messages: [createMessage('narrator', narratorName, failMessage)] };
    }
}
