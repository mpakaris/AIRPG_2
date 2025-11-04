
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

    for (const effect of effects) {
        switch (effect.type) {
            case 'REMOVE_ITEM_FROM_CONTAINER':
                 if (effect.containerId && newState.objectStates[effect.containerId]?.items) {
                    newState.objectStates[effect.containerId].items = newState.objectStates[effect.containerId].items!.filter((id: ItemId) => id !== effect.itemId);
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

            case 'INCREMENT_ITEM_READ_COUNT':
                if (!newState.itemStates[effect.itemId]) {
                    newState.itemStates[effect.itemId] = { readCount: 0 };
                }
                newState.itemStates[effect.itemId].readCount = (newState.itemStates[effect.itemId].readCount || 0) + 1;
                break;
            case 'INCREMENT_NPC_INTERACTION':
                 if (!newState.npcStates[effect.npcId]) {
                    // This should not happen if state is initialized correctly
                    const baseNpc = game.npcs[effect.npcId];
                    newState.npcStates[effect.npcId] = { 
                        stage: baseNpc.initialState.stage,
                        importance: baseNpc.importance,
                        trust: baseNpc.initialState.trust,
                        attitude: baseNpc.initialState.attitude,
                        completedTopics: [],
                        interactionCount: 0
                    };
                 }
                 newState.npcStates[effect.npcId].interactionCount = (newState.npcStates[effect.npcId].interactionCount || 0) + 1;
                 break;
            case 'COMPLETE_NPC_TOPIC':
                if (newState.npcStates[effect.npcId] && !newState.npcStates[effect.npcId].completedTopics.includes(effect.topicId)) {
                    newState.npcStates[effect.npcId].completedTopics.push(effect.topicId);
                }
                break;
            case 'SET_STORY':
                if (effect.story) {
                    newState.stories[effect.story.chapterId] = effect.story;
                }
                break;
        }
    }

    return { newState, messages };
}
