/**
 * handle-goto - NEW ARCHITECTURE
 *
 * Handles goto/moveto/shift commands to change focus without interacting.
 * This allows players to position themselves at objects/NPCs without examining/opening.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, NpcId } from "@/lib/game/types";
import { VisibilityResolver, FocusResolver } from "@/lib/game/engine";

export async function handleGoto(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
    if (!targetName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.needsTarget.goto
        }];
    }

    // Use FocusResolver to find the target entity
    const match = FocusResolver.findEntity(targetName, state, game, {
        searchInventory: false,  // Can't "goto" items in inventory
        searchVisible: true,
        requireFocus: false      // Can goto anything visible
    });

    if (!match) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.notVisible(targetName)
        }];
    }

    // Get entity name for response - this is what the player REQUESTED
    let requestedEntityName: string;
    if (match.type === 'object') {
        const targetObject = game.gameObjects[match.id as GameObjectId];
        requestedEntityName = targetObject?.name || 'it';

        // Personal equipment (phone, badge, etc.) is always with you - can't "goto" it
        if (targetObject?.personal === true) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `${requestedEntityName} is already with you, Burt. You don't need to move to it - just use it directly.`
            }];
        }
    } else if (match.type === 'npc') {
        requestedEntityName = game.npcs?.[match.id as NpcId]?.name || 'them';
    } else {
        // Items can't be "gone to" unless they're placed objects
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.cantDoThat
        }];
    }

    // Check if entity has a parent - if so, focus on parent instead
    // This handles cases like "go to SD Card" or "go to Hidden Door" where we want to focus on the container
    const { GameStateManager } = await import('@/lib/game/engine/GameStateManager');
    const parentId = GameStateManager.getParent(state, match.id);

    let targetFocusId = match.id;
    let targetFocusType = match.type as 'object' | 'npc';

    if (parentId && match.type === 'object') {
        // Child entity - focus on parent instead (for engine purposes)
        // But keep the requested entity name for player messaging
        targetFocusId = parentId;
        targetFocusType = 'object';
    }

    // Already at this focus?
    if (state.currentFocusId === targetFocusId) {
        const messages = [
            `You're already at ${requestedEntityName}, Burt.`,
            `You're standing right there, Burt.`,
            `You're already focused on ${requestedEntityName}.`,
            `You're at ${requestedEntityName} right now.`
        ];
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: messages[Math.floor(Math.random() * messages.length)]
        }];
    }

    // Set focus with transition message
    const effects: Effect[] = [];

    // Add visual indicator for "go to" action from cartridge
    if (game.systemMedia?.move) {
        effects.push({
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: '',
            messageType: 'image',
            imageUrl: game.systemMedia.move.url,
            imageDescription: game.systemMedia.move.description,
            imageHint: game.systemMedia.move.hint
        });
    }

    // Get transition narration - prefer the requested entity's narration if it exists
    let transitionMessage: string | undefined;
    if (parentId && match.type === 'object') {
        // Player requested a child entity - use child's transition narration if available
        const requestedObject = game.gameObjects[match.id as GameObjectId];
        if (requestedObject?.transitionNarration) {
            transitionMessage = requestedObject.transitionNarration;
        } else {
            // Fall back to parent's transition narration
            transitionMessage = FocusResolver.getTransitionNarration(targetFocusId, targetFocusType, state, game) || undefined;
        }
    } else {
        // Normal case - use the target's transition narration
        transitionMessage = FocusResolver.getTransitionNarration(targetFocusId, targetFocusType, state, game) || undefined;
    }

    effects.push({
        type: 'SET_FOCUS',
        focusId: targetFocusId,
        focusType: targetFocusType,
        transitionMessage
    });

    return effects;
}
