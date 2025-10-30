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

    // Get entity name for response
    let entityName: string;
    if (match.type === 'object') {
        entityName = game.gameObjects[match.id as GameObjectId]?.name || 'it';
    } else if (match.type === 'npc') {
        entityName = game.npcs?.[match.id as NpcId]?.name || 'them';
    } else {
        // Items can't be "gone to" unless they're placed objects
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: game.systemMessages.cantDoThat
        }];
    }

    // Already at this focus?
    if (state.currentFocusId === match.id) {
        const messages = [
            `You're already at ${entityName}, Burt.`,
            `You're standing right there, Burt.`,
            `You're already focused on ${entityName}.`,
            `You're at ${entityName} right now.`
        ];
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: messages[Math.floor(Math.random() * messages.length)]
        }];
    }

    // Set focus with transition message
    return [{
        type: 'SET_FOCUS',
        focusId: match.id,
        focusType: match.type as 'object' | 'npc',
        transitionMessage: FocusResolver.getTransitionNarration(match.id, match.type as 'object' | 'npc', state, game) || undefined
    }];
}
