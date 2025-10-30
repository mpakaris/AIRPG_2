
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
            case 'ADD_ITEM':
                if (!newState.inventory.includes(effect.itemId)) {
                    newState.inventory.push(effect.itemId);
                }
                break;
            case 'REMOVE_ITEM_FROM_CONTAINER':
                 if (effect.containerId && newState.objectStates[effect.containerId]?.items) {
                    newState.objectStates[effect.containerId].items = newState.objectStates[effect.containerId].items!.filter((id: ItemId) => id !== effect.itemId);
                }
                break;
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
            case 'SHOW_MESSAGE':
                const messageImageId = effect.imageId;
                const message = createMessage(
                    'narrator',
                    narratorName,
                    effect.content,
                    effect.messageType,
                    messageImageId ? { id: messageImageId, game, state: newState, showEvenIfExamined: true } : undefined
                );
                messages.push(message);

                 if (messageImageId && !newState.flags.includes(examinedObjectFlag(messageImageId as string))) {
                     newState.flags.push(examinedObjectFlag(messageImageId as string));
                 }
                break;
            case 'START_CONVERSATION':
                newState.activeConversationWith = effect.npcId;
                newState.interactingWithObject = null;
                break;
            case 'END_CONVERSATION':
                 if (newState.activeConversationWith) {
                    const npc = game.npcs[newState.activeConversationWith];
                    messages.push(createMessage('system', 'System', `You ended the conversation with ${npc.name}.`));
                    if (npc.goodbyeMessage) {
                        messages.push(createMessage(npc.id as any, npc.name, `"${npc.goodbyeMessage}"`));
                    }
                    newState.activeConversationWith = null;
                }
                break;
            case 'START_INTERACTION':
                newState.interactingWithObject = effect.objectId;
                // Update state if provided
                if (effect.interactionStateId && newState.interactingWithObject) {
                    if (!newState.objectStates[newState.interactingWithObject]) {
                        newState.objectStates[newState.interactingWithObject] = {};
                    }
                    newState.objectStates[newState.interactingWithObject].currentStateId = effect.interactionStateId;
                }
                break;
            case 'END_INTERACTION':
                if (newState.interactingWithObject) {
                    const object = game.gameObjects[newState.interactingWithObject];
                    messages.push(createMessage('narrator', narratorName, `You step back from the ${object.name}.`));
                    newState.interactingWithObject = null;
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
            case 'SHOW_MESSAGE': {
                // Type narrow to SHOW_MESSAGE effect
                if (effect.type !== 'SHOW_MESSAGE') break;

                // Remove the message created by GameStateManager (it doesn't have image resolution)
                // Keep only messages that DON'T have the same content as this effect
                messages = messages.filter(m => m.content !== effect.content);

                const messageImageId = effect.imageId;
                const messageImageUrl = effect.imageUrl;
                const speaker = effect.speaker || 'narrator';
                const senderName = speaker === 'agent' ? game.narratorName || 'Narrator' : speaker === 'system' ? 'System' : narratorName;

                let enhancedMessage: any;

                // If direct imageUrl is provided (e.g., for location wide shots)
                if (messageImageUrl) {
                    enhancedMessage = createMessage(
                        speaker as any,
                        senderName,
                        effect.content,
                        effect.messageType || 'image',
                        undefined  // No imageDetails needed
                    );
                    // Add image directly
                    enhancedMessage.image = {
                        url: messageImageUrl,
                        description: 'Location view',
                        hint: 'wide shot'
                    };
                 }
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
