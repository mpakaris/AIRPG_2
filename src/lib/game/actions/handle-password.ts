/**
 * handle-password - NEW ARCHITECTURE
 *
 * Handles password/passphrase input for locked objects with input.type === 'phrase'.
 * REQUIRES FOCUS: Player must be focused on the object to input a password.
 * This prevents ambiguity (e.g., "justice" matching book title vs notebook password).
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { FocusResolver, Validator } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handlePassword(
    state: PlayerState,
    command: string,
    game: Game
): Promise<Effect[]> {
    const commandLower = command.toLowerCase();

    // CRITICAL: Password input REQUIRES focus on an inputtable object
    // This solves the "justice" ambiguity issue
    if (!state.currentFocusId || state.focusType !== 'object') {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'You need to focus on something first. Try examining or opening the object you want to interact with.'
        }];
    }

    // Get the focused object
    const focusedObjectId = state.currentFocusId as GameObjectId;
    const focusedObject = game.gameObjects[focusedObjectId];

    if (!focusedObject) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'Something went wrong with the focus system.'
        }];
    }

    // Verify the focused object accepts password input
    if (!focusedObject.input || focusedObject.input.type !== 'phrase') {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `The ${focusedObject.name} doesn't accept password input.`
        }];
    }

    // Check if object is still locked
    const validation = Validator.validate('unlock', focusedObjectId, state, game);
    if (!validation.valid) {
        // Already unlocked (validation.valid is false when object is not locked)
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `No need, Burt. We already unlocked the ${focusedObject.name}.`
        }];
    }

    // Extract the password/passphrase from the command
    // Remove the object name if it's in the command
    let phrase = command;
    const objectNameIndex = commandLower.indexOf(normalizeName(focusedObject.name));
    if (objectNameIndex !== -1) {
        phrase = phrase.substring(objectNameIndex + focusedObject.name.length);
    }

    // Remove common password command prefixes
    phrase = phrase.replace(/^\s*(password|say|enter|for|is|the)\s*/i, '');
    phrase = normalizeName(phrase);

    if (!phrase) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: 'It seems you tried a passphrase. Unfortunately, this is not it.'
        }];
    }

    // Check if password matches
    const expectedPhrase = focusedObject.input.validation;
    const handler = focusedObject.handlers?.onUnlock;

    if (normalizeName(phrase) === normalizeName(expectedPhrase)) {
        // SUCCESS: Password correct
        const effects: Effect[] = [
            {
                type: 'SET_ENTITY_STATE',
                entityId: focusedObjectId,
                patch: { isLocked: false, isOpen: true }
            }
        ];

        // Add handler success effects if they exist
        if (handler?.success?.effects) {
            effects.push(...handler.success.effects);
        }

        // Add success message
        const successMessage = handler?.success?.message || "It unlocks!";
        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: successMessage,
            messageType: 'image',
            imageId: focusedObjectId
        });

        // Mark as examined
        effects.push({
            type: 'SET_FLAG',
            flag: `examined_${focusedObjectId}`,
            value: true
        });

        return effects;
    } else {
        // FAILURE: Wrong password
        const failMessage = handler?.fail?.message || 'That password doesn\'t work.';
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: failMessage
        }];
    }
}
