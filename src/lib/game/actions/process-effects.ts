
'use server';

import type { Effect, Game, GameObjectId, ItemId, Message, NpcId, PlayerState, TokenUsage, LocationId, CommandResult } from '@/lib/game/types';
import { createMessage } from '@/lib/utils';
import { getLiveGameObject } from '../utils/helpers';


export async function processEffects(initialState: PlayerState, effects: Effect[], game: Game): Promise<CommandResult> {
    let newState = JSON.parse(JSON.stringify(initialState)); // Deep copy to avoid mutation issues
    const messages: Message[] = [];
    const narratorName = "Narrator";
    const examinedObjectFlag = (id: string) => `examined_${id}`;

    for (const effect of effects) {
        switch (effect.type) {
            case 'ADD_ITEM':
                if (!newState.inventory.includes(effect.itemId)) {
                    newState.inventory.push(effect.itemId);
                }
                break;
            case 'SPAWN_ITEM':
                const containerId = effect.containerId;
                if (containerId) {
                    if (!newState.objectStates[containerId]) {
                        newState.objectStates[containerId] = {};
                    }
                    if (!newState.objectStates[containerId].items) {
                        newState.objectStates[containerId].items = [];
                    }
                    if (!newState.objectStates[containerId].items!.includes(effect.itemId)) {
                        const newItems = [...newState.objectStates[containerId].items!, effect.itemId];
                        newState.objectStates[containerId].items = newItems;
                    }
                } else {
                    console.error(`SPAWN_ITEM effect for ${effect.itemId} is missing a containerId.`);
                }
                break;
            case 'REMOVE_ITEM':
                if (newState.inventory.includes(effect.itemId)) {
                    newState.inventory = newState.inventory.filter((i: ItemId) => i !== effect.itemId);
                }
                break;
            case 'DESTROY_ITEM':
                // Logic to remove item from world/game state entirely would go here.
                break;
            case 'SET_FLAG':
                if (!newState.flags.includes(effect.flag)) {
                    newState.flags.push(effect.flag);
                }
                break;
            case 'REVEAL_OBJECT':
                const revealLocationId = newState.currentLocationId;
                if (newState.locationStates[revealLocationId] && !newState.locationStates[revealLocationId].objects.includes(effect.objectId)) {
                    const newObjects = [...newState.locationStates[revealLocationId].objects, effect.objectId];
                    newState.locationStates[revealLocationId] = {
                        ...newState.locationStates[revealLocationId],
                        objects: newObjects
                    };
                }
                break;
            case 'SHOW_MESSAGE':
                const messageImageId = effect.imageId;

                const message = createMessage(
                    effect.speaker || 'narrator',
                    narratorName,
                    effect.content,
                    effect.messageType,
                    messageImageId ? { id: messageImageId, game, state: newState, showEvenIfExamined: true } : undefined
                );

                messages.push(message);

                 if (messageImageId) {
                     const flag = examinedObjectFlag(messageImageId as string);
                     // NEW: flags is now Record<string, boolean> instead of array
                     if (!newState.flags) newState.flags = {};
                     if (!newState.flags[flag]) {
                         newState.flags[flag] = true;
                     }
                 }
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
                const { targetId, to } = effect;
                if (game.items[targetId as ItemId]) {
                    if (!newState.itemStates[targetId as ItemId]) newState.itemStates[targetId as ItemId] = {} as any;
                    newState.itemStates[targetId as ItemId].currentStateId = to;
                } else if (game.gameObjects[targetId as GameObjectId]) {
                    if (!newState.objectStates[targetId as GameObjectId]) newState.objectStates[targetId as GameObjectId] = {} as any;
                    newState.objectStates[targetId as GameObjectId].currentStateId = to;
                }
                break;
             case 'SET_OBJECT_STATE':
                if (!newState.objectStates[effect.objectId]) {
                    newState.objectStates[effect.objectId] = {};
                }
                newState.objectStates[effect.objectId] = {
                    ...newState.objectStates[effect.objectId],
                    ...effect.state
                };
                break;
            case 'DEMOTE_NPC':
                 const npcToDemote = game.npcs[effect.npcId];
                 if (npcToDemote?.demoteRules?.then) {
                    newState.npcStates[effect.npcId] = {
                        ...newState.npcStates[effect.npcId],
                        stage: npcToDemote.demoteRules.then.setStage,
                        importance: npcToDemote.demoteRules.then.setImportance,
                    };
                 }
                 break;
        }
    }

    return { newState, messages };
}
