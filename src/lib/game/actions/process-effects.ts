

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
                    if (liveObject.state.isBroken && gameObject.media.images.broken) {
                        image = gameObject.media.images.broken;
                    } else if (liveObject.state.isLocked === false && gameObject.media.images.unlocked) {
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
                const location = game.locations[effect.locationId];
                if (location) {
                    const item = game.items[effect.itemId];
                    if (item && !location.objects.some(objId => newState.objectStates[objId]?.items?.includes(item.id))) {
                         // A bit of a hack: we create a temporary "container" object to hold the spawned item
                         // This makes it discoverable by `findItemInContext` and `handleTake`
                         const containerId = `spawn_container_${item.id}` as GameObjectId;
                         if (!game.gameObjects[containerId]) {
                             game.gameObjects[containerId] = {
                                 id: containerId, name: `shards of a broken vase`, archetype: 'Prop', description: '',
                                 capabilities: { openable: false, lockable: false, breakable: false, movable: false, powerable: false, container: true, readable: false, inputtable: false },
                                 state: { isOpen: true, isLocked: false, isBroken: true, isPoweredOn: false, currentStateId: 'default' },
                                 inventory: { items: [item.id], capacity: 1},
                                 handlers: {}
                             } as any;
                             location.objects.push(containerId);
                             newState.objectStates[containerId] = { isOpen: true, items: [item.id] };
                         }
                    }
                }
                break;
            case 'SET_FLAG':
                if (!newState.flags.includes(effect.flag)) {
                    newState.flags.push(effect.flag);
                }
                break;
            case 'SHOW_MESSAGE':
                const messageImageId = effect.imageId;
                const message = createMessage(
                    effect.sender,
                    effect.senderName || narratorName,
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
