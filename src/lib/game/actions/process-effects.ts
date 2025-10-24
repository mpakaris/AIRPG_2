

import type { Effect, Game, GameObjectId, ItemId, Message, NpcId, PlayerState, TokenUsage, LocationId } from '../types';
import { getLiveGameObject } from './helpers';

const examinedObjectFlag = (id: string) => `examined_${id}`;

export function createMessage(
  sender: Message['sender'],
  senderName: string,
  content: string,
  type: Message['type'] = 'text',
  imageDetails?: { id: ItemId | NpcId | GameObjectId, game: Game, state: PlayerState, showEvenIfExamined?: boolean },
  usage?: TokenUsage
): Message {
    let image: Message['image'];
    
    if (imageDetails) {
        const { id, game, state, showEvenIfExamined } = imageDetails;
        const isAlreadyExamined = state.flags.includes(examinedObjectFlag(id as string));
        
        let shouldShowImage = true;
        
        if (showEvenIfExamined !== true) {
            if (isAlreadyExamined) {
                shouldShowImage = false;
            }
        }

        if (shouldShowImage) {
            const item = game.items[id as ItemId];
            const npc = game.npcs[id as NpcId];
            const gameObject = game.gameObjects[id as GameObjectId];
            
            if (gameObject?.media?.images) {
                const liveObject = getLiveGameObject(gameObject.id, state, game);
                if (liveObject) {
                    const currentStateId = liveObject.state.currentStateId;
                    const stateImageKey = currentStateId?.replace('unlocked_', '');

                    if (liveObject.state.isBroken && gameObject.media.images.broken) {
                        image = gameObject.media.images.broken;
                    } else if (stateImageKey && gameObject.media.images[stateImageKey]) {
                        image = gameObject.media.images[stateImageKey];
                    }
                    else if (liveObject.state.isLocked === false && gameObject.media.images.unlocked) {
                        image = gameObject.media.images.unlocked;
                    } else {
                        image = gameObject.media.images.default;
                    }
                }
            } else if (item?.media?.image) {
                image = item.media.image;
            } else if (npc?.image) {
                image = npc.image;
            }
        }
    }


  return {
    id: crypto.randomUUID(),
    sender,
    senderName,
    content,
    type,
    image,
    timestamp: Date.now(),
    usage,
  };
}

export function processEffects(initialState: PlayerState, effects: Effect[], game: Game): { newState: PlayerState, messages: Message[] } {
    let newState = JSON.parse(JSON.stringify(initialState)); // Deep copy to avoid mutation issues
    const messages: Message[] = [];
    const narratorName = "Narrator";

    for (const effect of effects) {
        switch (effect.type) {
            case 'ADD_ITEM':
                if (!newState.inventory.includes(effect.itemId)) {
                    newState.inventory.push(effect.itemId);
                }
                break;
            case 'SPAWN_ITEM':
                 // When an item spawns from a broken object, it should be placed inside that object's inventory.
                 // We find the object that was just broken (the coffee machine) and add the key to it.
                const brokenMachineId = 'obj_coffee_machine' as GameObjectId;
                const brokenMachineState = newState.objectStates[brokenMachineId];
                if (brokenMachineState) {
                    if (!brokenMachineState.items) {
                        brokenMachineState.items = [];
                    }
                    if (!brokenMachineState.items.includes(effect.itemId)) {
                        brokenMachineState.items.push(effect.itemId);
                    }
                    // Ensure the broken container is "open" so its contents can be seen/taken.
                    brokenMachineState.isOpen = true; 
                }
                break;
            case 'SET_FLAG':
                if (!newState.flags.includes(effect.flag)) {
                    newState.flags.push(effect.flag);
                }
                break;
            case 'REVEAL_OBJECT':
                const locationState = newState.locationStates[newState.currentLocationId];
                if (locationState && !locationState.objects.includes(effect.objectId)) {
                    locationState.objects.push(effect.objectId);
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
                    if (!newState.itemStates[targetId as ItemId]) newState.itemStates[targetId as ItemId] = {};
                    newState.itemStates[targetId as ItemId].currentStateId = to;
                } else if (game.gameObjects[targetId as GameObjectId]) {
                    if (!newState.objectStates[targetId as GameObjectId]) newState.objectStates[targetId as GameObjectId] = {};
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
