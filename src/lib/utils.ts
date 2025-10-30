import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Game, GameObjectId, ItemId, Message, NpcId, PlayerState, TokenUsage } from '@/lib/game/types';
import { getLiveGameObject, getLiveItem } from "@/lib/game/utils/helpers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, '') // remove leading articles
    .replace(/^"|"$/g, '') // remove surrounding quotes
    .trim();
}

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
        // NEW: flags is now Record<string, boolean> instead of array
        const isAlreadyExamined = !!state.flags?.[examinedObjectFlag(id as string)];

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

                    // Priority order for image resolution:
                    // 1. Broken state (highest priority)
                    if (liveObject.state.isBroken && gameObject.media.images.broken) {
                        image = gameObject.media.images.broken;
                    }
                    // 2. Moved state
                    else if (liveObject.state.isMoved === true && gameObject.media.images.moved) {
                        image = gameObject.media.images.moved;
                    }
                    // 3. Open state (for containers)
                    else if (liveObject.state.isOpen === true && gameObject.media.images.open) {
                        image = gameObject.media.images.open;
                    }
                    // 4. Closed state (for containers)
                    else if (liveObject.state.isOpen === false && gameObject.media.images.closed) {
                        image = gameObject.media.images.closed;
                    }
                    // 5. Custom state from currentStateId (e.g., stateMap)
                    else if (stateImageKey && gameObject.media.images[stateImageKey]) {
                        const resolvedImage = gameObject.media.images[stateImageKey];
                        if (resolvedImage && typeof resolvedImage === 'object' && resolvedImage.url) {
                            image = resolvedImage;
                        } else {
                            console.error('Invalid image for stateKey:', stateImageKey, 'Got:', resolvedImage);
                            image = gameObject.media.images.default;
                        }
                    }
                    // 6. Unlocked state
                    else if (liveObject.state.isLocked === false && gameObject.media.images.unlocked) {
                        image = gameObject.media.images.unlocked;
                    }
                    // 7. Default fallback
                    else {
                        image = gameObject.media.images.default;
                    }
                }
            } else if (item?.media) {
                // Check for new images format (with state support)
                if (item.media.images) {
                    const liveItem = getLiveItem(id as ItemId, state, game);
                    const currentStateId = liveItem?.state.currentStateId || 'default';

                    // Try to get image for current state (e.g., 'opened')
                    if (currentStateId && item.media.images[currentStateId]) {
                        image = item.media.images[currentStateId];
                    } else {
                        // Fallback to default image
                        image = item.media.images.default || item.media.images[Object.keys(item.media.images)[0]];
                    }
                }
                // Legacy format: single image
                else if (item.media.image) {
                    image = item.media.image;
                }
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
