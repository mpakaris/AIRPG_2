
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
    const result = GameStateManager.applyAll(effects, initialState, []);
    let newState = result.state;
    let messages = result.messages;

    // Handle legacy/special effects that need custom processing
    const examinedObjectFlag = (id: string) => `examined_${id}`;
    const narratorName = "Narrator";

    for (const effect of effects) {
        const effectType = (effect as any).type;
        switch (effectType) {
            // ================================================================
            // LEGACY EFFECTS (for backward compatibility during migration)
            // ================================================================
            case 'SPAWN_ITEM':
                // LEGACY: Use ADD_TO_CONTAINER instead
                const containerId = (effect as any).containerId;
                if (containerId) {
                    if (!newState.objectStates) newState.objectStates = {};
                    if (!newState.objectStates[containerId]) {
                        newState.objectStates[containerId] = {};
                    }
                    if (!newState.objectStates[containerId].items) {
                        newState.objectStates[containerId].items = [];
                    }
                    if (!newState.objectStates[containerId].items!.includes((effect as any).itemId)) {
                        const newItems = [...newState.objectStates[containerId].items!, (effect as any).itemId];
                        newState.objectStates[containerId].items = newItems;
                    }
                } else {
                    console.error(`SPAWN_ITEM effect for ${(effect as any).itemId} is missing a containerId.`);
                }
                break;

            case 'DESTROY_ITEM':
                // LEGACY: Remove item from world entirely
                // TODO: Implement proper removal from world state
                break;

            case 'REVEAL_OBJECT':
                // LEGACY: Use REVEAL_ENTITY instead
                const revealLocationId = newState.currentLocationId;
                if (!newState.locationStates) newState.locationStates = {};
                if (newState.locationStates[revealLocationId] && !newState.locationStates[revealLocationId].objects.includes((effect as any).objectId)) {
                    const newObjects = [...newState.locationStates[revealLocationId].objects, (effect as any).objectId];
                    newState.locationStates[revealLocationId] = {
                        ...newState.locationStates[revealLocationId],
                        objects: newObjects
                    };
                }
                break;

            case 'SET_STATE':
                // LEGACY: Use SET_STATE_ID instead
                const { targetId, to } = effect as any;
                if (!newState.itemStates) newState.itemStates = {};
                if (!newState.objectStates) newState.objectStates = {};

                if (game.items[targetId as ItemId]) {
                    if (!newState.itemStates[targetId as ItemId]) newState.itemStates[targetId as ItemId] = {} as any;
                    newState.itemStates[targetId as ItemId].currentStateId = to;
                } else if (game.gameObjects[targetId as GameObjectId]) {
                    if (!newState.objectStates[targetId as GameObjectId]) newState.objectStates[targetId as GameObjectId] = {} as any;
                    newState.objectStates[targetId as GameObjectId].currentStateId = to;
                }
                break;

            case 'SET_OBJECT_STATE':
                // LEGACY: Use SET_ENTITY_STATE instead
                if (!newState.objectStates) newState.objectStates = {};
                if (!newState.objectStates[(effect as any).objectId]) {
                    newState.objectStates[(effect as any).objectId] = {};
                }
                newState.objectStates[(effect as any).objectId] = {
                    ...newState.objectStates[(effect as any).objectId],
                    ...(effect as any).state
                };
                break;

            // ================================================================
            // ENHANCED MESSAGE HANDLING (with image resolution)
            // ================================================================
            case 'SHOW_MESSAGE':
                // Remove the message created by GameStateManager (it doesn't have image resolution)
                messages = messages.filter(m => m.content !== effect.content || m.timestamp !== messages[messages.length - 1]?.timestamp);

                const messageImageId = effect.imageId;
                const speaker = effect.speaker || 'narrator';
                const senderName = speaker === 'agent' ? 'Agent' : speaker === 'system' ? 'System' : narratorName;
                const enhancedMessage = createMessage(
                    speaker as any,
                    senderName,
                    effect.content,
                    effect.messageType,
                    messageImageId ? { id: messageImageId, game, state: newState, showEvenIfExamined: true } : undefined
                );

                messages.push(enhancedMessage);

                // Mark entity as examined (for image display logic)
                if (messageImageId) {
                    const flag = examinedObjectFlag(messageImageId as string);
                    if (!newState.flags) newState.flags = {};
                    if (!newState.flags[flag]) {
                        newState.flags[flag] = true;
                    }
                }
                break;

            // All other effects are handled by GameStateManager
            default:
                // No additional processing needed
                break;
        }
    }

    return { newState, messages };
}
