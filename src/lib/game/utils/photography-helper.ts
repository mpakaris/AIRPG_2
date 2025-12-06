/**
 * photography-helper.ts
 *
 * Utilities for the photography system.
 * Allows players to take photos of objects/NPCs with camera devices (phone, camera).
 *
 * Features:
 * - Auto-generates photo items when photographing
 * - Reuses original entity's media
 * - Supports photographing GameObjects and NPCs
 */

import type { Effect, Game, GameObject, GameObjectId, Item, ItemId, NPC, NpcId, PlayerState } from "@/lib/game/types";
import { GameStateManager } from "@/lib/game/engine/GameStateManager";

export type PhotographyResult = {
  canPhotograph: boolean;
  reason?: string;
  effects?: Effect[];
};

/**
 * Attempts to photograph a target with a camera device
 *
 * @param cameraItem - The item being used (must have camera capability)
 * @param targetId - ID of the target (GameObject, Item, or NPC)
 * @param targetType - Type of target
 * @param state - Current player state
 * @param game - Game data
 * @returns Result with effects if successful
 */
export function attemptPhotograph(
  cameraItem: Item,
  targetId: string,
  targetType: 'object' | 'item' | 'npc',
  state: PlayerState,
  game: Game
): PhotographyResult {
  // Check if camera has camera capability
  if (!cameraItem.capabilities.isCamera && !(cameraItem as any).capabilities?.camera) {
    return {
      canPhotograph: false,
      reason: `The ${cameraItem.name} can't take photos.`
    };
  }

  // Get the target entity
  let target: GameObject | Item | NPC | undefined;
  let targetName: string;

  if (targetType === 'object') {
    target = game.gameObjects[targetId as GameObjectId];
    targetName = target?.name || 'object';
  } else if (targetType === 'item') {
    target = game.items[targetId as ItemId];
    targetName = target?.name || 'item';
  } else {
    target = game.npcs[targetId as NpcId];
    targetName = target?.name || 'NPC';
  }

  if (!target) {
    return {
      canPhotograph: false,
      reason: `You can't find that to photograph.`
    };
  }

  // Check if target is photographable
  const isPhotographable = checkIfPhotographable(target);

  if (!isPhotographable) {
    return {
      canPhotograph: false,
      reason: `You can't take a photo of the ${targetName}.`
    };
  }

  // Check if already photographed
  const photoFlag = `photographed_${targetId}` as any;
  if (GameStateManager.hasFlag(state, photoFlag)) {
    return {
      canPhotograph: false,
      reason: `You already have a photo of the ${targetName}.`
    };
  }

  // Generate photo item
  const photoItem = generatePhotoItem(target, targetId, targetType);
  const photoItemId = photoItem.id;

  // Extract media for explicit display
  let imageUrl: string | undefined;
  let imageDescription: string | undefined;
  let imageHint: string | undefined;

  if (photoItem.media?.image) {
    const media = photoItem.media.image as any;
    imageUrl = media.url;
    imageDescription = media.description;
    imageHint = media.hint;
  }

  // Create effects
  const effects: Effect[] = [
    // Create item FIRST so it exists when UI tries to display it
    {
      type: 'CREATE_DYNAMIC_ITEM',
      item: photoItem
    },
    {
      type: 'SET_FLAG',
      flag: photoFlag,
      value: true
    },
    // Now show the photo with explicit media (not relying on item lookup)
    {
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `The viewfinder frames it—sharp edges, faded ink, secrets pressed into fibrous paper. You press the shutter. The phone chirps. Another piece of evidence, digitized and filed, another shadow captured for the case file. The ${targetName} is now cataloged in your phone's evidence gallery, ready to haunt you later when the pieces finally connect.`,
      messageType: 'image',
      imageUrl,
      imageDescription,
      imageHint
    },
    // Automatically exit phone mode after taking photo
    {
      type: 'CLEAR_DEVICE_FOCUS'
    },
    // Automatically end any active conversation
    {
      type: 'END_CONVERSATION'
    },
    {
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You pocket your phone and step back. Another piece of the puzzle, cataloged and filed. Your instincts led you here—they always do. The city's shadows whisper their secrets to those who know how to listen. What do you do next, Agent Burt?`
    }
  ];

  return {
    canPhotograph: true,
    effects
  };
}

/**
 * Checks if an entity can be photographed
 */
function checkIfPhotographable(entity: GameObject | Item | NPC): boolean {
  // Check Item capabilities
  if ('capabilities' in entity && typeof entity.capabilities === 'object') {
    if ('isPhotographable' in entity.capabilities) {
      return entity.capabilities.isPhotographable === true;
    }
    if ('photographable' in entity.capabilities) {
      return (entity.capabilities as any).photographable === true;
    }
  }

  // NPCs are always photographable by default
  if ('personality' in entity) {
    return true;
  }

  return false;
}

/**
 * Generates a photo item based on the photographed entity
 *
 * The photo item:
 * - Reuses the original entity's media
 * - Has a descriptive name "Photo of X"
 * - Is readable to view the photo
 */
function generatePhotoItem(
  entity: GameObject | Item | NPC,
  entityId: string,
  entityType: 'object' | 'item' | 'npc'
): Item {
  const photoId = `photo_of_${entityId}` as ItemId;
  const entityName = entity.name;

  // Extract media from the entity
  let mediaImage = undefined;

  if ('media' in entity && entity.media) {
    if ('image' in entity.media && entity.media.image) {
      mediaImage = entity.media.image;
    } else if ('images' in entity.media && entity.media.images) {
      // Use default image if available
      const images = entity.media.images as Record<string, any>;
      mediaImage = images.default || images[Object.keys(images)[0]];
    }
  }

  // Create photo item
  const photoItem: Item = {
    id: photoId,
    name: `Photo of ${entityName}`,
    archetype: 'Image' as any,
    description: `A photo you took of ${entityName}.`,
    capabilities: {
      isTakable: false, // Already in inventory
      isReadable: true,
      isUsable: false,
      isCombinable: false,
      isConsumable: false,
      isScannable: false,
      isAnalyzable: false,
      isPhotographable: false // Can't photograph a photo
    },
    handlers: {
      onExamine: {
        success: {
          message: `You review the photo of ${entityName}.${mediaImage ? '' : ' The image quality is clear.'}`
        }
      },
      onRead: {
        success: {
          message: `You look closely at the photo of ${entityName}.${mediaImage ? '' : ' You can make out the details.'}`
        }
      }
    }
  };

  // Add media if available
  if (mediaImage) {
    photoItem.media = {
      image: mediaImage
    };
  }

  return photoItem;
}

/**
 * Checks if an item has camera capability
 */
export function isCameraDevice(item: Item): boolean {
  return item.capabilities.isCamera === true || (item as any).capabilities?.camera === true;
}
