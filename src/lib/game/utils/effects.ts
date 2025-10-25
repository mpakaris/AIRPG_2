'use client';

import type { Effect, Game, GameObjectId, ItemId, Message, NpcId, PlayerState, TokenUsage, LocationId, CommandResult } from '@/lib/game/types';
import { getLiveGameObject } from "@/lib/game/utils/helpers";

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