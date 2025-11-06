
'use server';

import type { Effect, Game, GameObjectId, ItemId, Message, NpcId, PlayerState, TokenUsage, LocationId, CommandResult } from '@/lib/game/types';
import { createMessage } from '@/lib/utils';
import { getLiveGameObject } from '../utils/helpers';
import { GameStateManager } from '../engine/GameStateManager';

/**
 * Process effects using GameStateManager (new architecture)
 * with backward compatibility for legacy effect types
 */
export async function processEffects(initialState: PlayerState, effects: Effect[], game: Game): Promise<CommandResult> {
    // Use GameStateManager for all standard effects
    const result = GameStateManager.applyAll(effects, initialState, [], game);
    let newState = result.state;
    let messages = result.messages;

    // Handle legacy/special effects that need custom processing
    const examinedObjectFlag = (id: string) => `examined_${id}`;
    const narratorName = "Narrator";

    // Legacy effects are now handled by GameStateManager
    // Keep only special case handling that doesn't fit the standard effect system
    for (const effect of effects) {
        switch (effect.type) {
            case 'INCREMENT_ITEM_READ_COUNT':
                // Still needed: readCount tracking
                if (!newState.world[effect.itemId]) {
                    newState.world[effect.itemId] = {};
                }
                newState.world[effect.itemId].readCount = (newState.world[effect.itemId].readCount || 0) + 1;
                console.log('[INCREMENT_ITEM_READ_COUNT]', effect.itemId, 'readCount now:', newState.world[effect.itemId].readCount);
                break;

            case 'SET_STORY':
                // Still needed: Story/chapter tracking
                if (effect.story) {
                    newState.stories[effect.story.chapterId] = effect.story;
                }
                break;

            // All other effects are handled by GameStateManager
            default:
                // No-op: GameStateManager already processed these
                break;
        }
    }

    return { newState, messages };
}
