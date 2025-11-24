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
import { logEntityDebug } from "@/lib/game/utils/debug-helpers";
import { MessageExpander } from "@/lib/game/utils/message-expansion";

export async function handlePassword(
    state: PlayerState,
    command: string,
    game: Game
): Promise<Effect[]> {
    const commandLower = command.toLowerCase();

    // CRITICAL: Password input REQUIRES focus on an inputtable object
    // This solves the "justice" ambiguity issue
    if (!state.currentFocusId || state.focusType !== 'object') {
        const message = await MessageExpander.static(game.systemMessages.needsFocus);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Get the focused object
    const focusedObjectId = state.currentFocusId as GameObjectId;
    const focusedObject = game.gameObjects[focusedObjectId];

    if (!focusedObject) {
        const message = await MessageExpander.static(game.systemMessages.focusSystemError);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: message
        }];
    }

    // Debug logging for bookshelf/door
    logEntityDebug('PASSWORD START', focusedObjectId, state, game);

    // Verify the focused object accepts password input
    if (!focusedObject.input || focusedObject.input.type !== 'phrase') {
        const message = await MessageExpander.static(game.systemMessages.noPasswordInput(focusedObject.name));
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    // Check if object is still locked
    const validation = Validator.validate('unlock', focusedObjectId, state, game);
    if (!validation.valid) {
        // Already unlocked (validation.valid is false when object is not locked)
        const message = await MessageExpander.static(game.systemMessages.alreadyUnlocked(focusedObject.name));
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
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
        const message = await MessageExpander.static(game.systemMessages.wrongPassword);
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: message
        }];
    }

    // Check if password matches
    const expectedPhrase = focusedObject.input.validation;
    // Check for onPasswordSubmit first (new pattern), fallback to onUnlock (legacy)
    const handler = (focusedObject.handlers as any)?.onPasswordSubmit || focusedObject.handlers?.onUnlock;

    if (normalizeName(phrase) === normalizeName(expectedPhrase)) {
        // SUCCESS: Password correct
        // Start with handler effects (which may include state changes)
        const effects: Effect[] = [...(handler?.success?.effects || [])];

        // Only add SET_ENTITY_STATE if handler didn't already set it
        // This allows handlers full control over unlock/open behavior
        const hasStateChange = handler?.success?.effects?.some((e: any) =>
            e.type === 'SET_ENTITY_STATE' && e.entityId === focusedObjectId
        );

        if (!hasStateChange) {
            // Default behavior: unlock only (NOT open - let handler control that)
            effects.unshift({
                type: 'SET_ENTITY_STATE',
                entityId: focusedObjectId,
                patch: { isLocked: false }
            });
        }

        // Add success message with media support
        const successMessage = handler?.success?.message || "It unlocks!";
        const successMedia = handler?.success?.media;

        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: successMessage,
            messageType: successMedia ? 'image' : 'image',
            imageId: successMedia ? undefined : focusedObjectId,
            imageUrl: successMedia?.url,
            imageDescription: successMedia?.description,
            imageHint: successMedia?.hint
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
        const failMedia = handler?.fail?.media;

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: failMessage,
            messageType: failMedia ? 'image' : 'text',
            imageUrl: failMedia?.url,
            imageDescription: failMedia?.description,
            imageHint: failMedia?.hint
        }];
    }
}
