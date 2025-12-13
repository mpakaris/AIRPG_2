/**
 * handle-device-command - Device Focus Mode Handler
 *
 * When player is using a device (phone, laptop, terminal, etc.),
 * this handler routes device-specific commands.
 *
 * Similar to conversation mode, but for interactive devices.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { normalizeName } from "@/lib/utils";
import { handleCall } from "./handle-call";
import { handleRead } from "./handle-read";
import { handleOpen } from "./handle-open";
import { attemptPhotograph } from "@/lib/game/utils/photography-helper";
import { VisibilityResolver } from "@/lib/game/engine";
import { matchesName } from "@/lib/game/utils/name-matching";

/**
 * Handle commands while in device focus mode
 * @param state - Current player state
 * @param command - Full command from player
 * @param game - Game data
 */
export async function handleDeviceCommand(
  state: PlayerState,
  command: string,
  game: Game
): Promise<Effect[]> {
  if (!state.activeDeviceFocus) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: 'You are not currently using any device.'
    }];
  }

  const deviceId = state.activeDeviceFocus;

  // Get device (could be object or item)
  const device = game.gameObjects[deviceId as GameObjectId] || game.items[deviceId as ItemId];

  if (!device) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'system',
      content: 'Device not found.'
    }];
  }

  // Parse command
  const normalizedCommand = command.toLowerCase().trim();
  const [verb, ...restParts] = normalizedCommand.split(' ');
  const restOfCommand = restParts.join(' ');

  // ============================================================================
  // EXIT COMMANDS - Put device away / close device
  // ============================================================================
  const exitCommands = ['put', 'close', 'exit', 'stop', 'quit', 'goodbye', 'bye', 'done'];
  if (exitCommands.includes(verb)) {
    // Check for "put away", "close phone", etc.
    const isExitCommand =
      verb === 'exit' ||
      verb === 'stop' ||
      verb === 'quit' ||
      verb === 'goodbye' ||
      verb === 'bye' ||
      verb === 'done' ||
      (verb === 'put' && (restOfCommand.includes('away') || restOfCommand.includes('phone') || restOfCommand.includes('device'))) ||
      (verb === 'close' && (restOfCommand.includes('phone') || restOfCommand.includes('device') || restOfCommand === ''));

    if (isExitCommand) {
      return [
        {
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: `You pocket your ${device.name}.`
        },
        {
          type: 'CLEAR_DEVICE_FOCUS'
        }
      ];
    }
  }

  // ============================================================================
  // DEVICE-SPECIFIC COMMANDS
  // ============================================================================

  // PHONE-SPECIFIC COMMANDS
  if (deviceId === 'item_player_phone') {
    // CHECK MESSAGES / VOICEMAIL
    if ((verb === 'check' && (restOfCommand.includes('message') || restOfCommand.includes('voicemail'))) ||
        verb === 'messages' || verb === 'voicemail') {
      const phone = game.items[deviceId as ItemId];
      if (phone && phone.handlers?.onCheckMessages) {
        // Find matching handler based on conditions
        const handlers = Array.isArray(phone.handlers.onCheckMessages)
          ? phone.handlers.onCheckMessages
          : [phone.handlers.onCheckMessages];

        for (const handler of handlers) {
          // Check conditions
          const conditions = handler.conditions || [];
          const conditionsMet = conditions.every(cond => {
            if (cond.type === 'HAS_ITEM') {
              return state.inventory?.includes(cond.itemId as ItemId);
            }
            return true;
          });

          if (conditionsMet) {
            const effects: Effect[] = [];
            if (handler.success?.message) {
              effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: handler.success.message
              });
            }
            if (handler.success?.effects) {
              effects.push(...handler.success.effects);
            }
            return effects;
          }
        }
      }
    }

    // CHECK EMAILS
    if ((verb === 'check' && (restOfCommand.includes('email') || restOfCommand.includes('mail'))) ||
        verb === 'emails' || verb === 'email' || verb === 'mail') {
      const phone = game.items[deviceId as ItemId];
      if (phone && phone.handlers?.onCheckEmails) {
        // Find matching handler based on conditions
        const handlers = Array.isArray(phone.handlers.onCheckEmails)
          ? phone.handlers.onCheckEmails
          : [phone.handlers.onCheckEmails];

        for (const handler of handlers) {
          // Check conditions
          const conditions = handler.conditions || [];
          const conditionsMet = conditions.every(cond => {
            if (cond.type === 'HAS_ITEM') {
              return state.inventory?.includes(cond.itemId as ItemId);
            }
            return true;
          });

          if (conditionsMet) {
            const effects: Effect[] = [];
            if (handler.success?.message) {
              effects.push({
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: handler.success.message
              });
            }
            if (handler.success?.effects) {
              effects.push(...handler.success.effects);
            }
            return effects;
          }
        }
      }
    }

    // CALL / DIAL
    if (verb === 'call' || verb === 'dial') {
      return handleCall(state, restOfCommand, game);
    }

    // READ - SD card or other readable items
    if (verb === 'read') {
      // Check if they're trying to read SD card
      if (restOfCommand.includes('sd') || restOfCommand.includes('card')) {
        return handleRead(state, 'sd card', game);
      }
      return handleRead(state, restOfCommand, game);
    }

    // OPEN - SD card or other openable items
    if (verb === 'open') {
      // Check if they're trying to open SD card
      if (restOfCommand.includes('sd') || restOfCommand.includes('card')) {
        return handleOpen(state, 'sd card', game);
      }
      return handleOpen(state, restOfCommand, game);
    }

    // CONTACTS
    if (verb === 'contacts' || normalizedCommand === 'show contacts' || normalizedCommand === 'view contacts') {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: 'Your FBI phone shows:\n\n📞 Contacts:\n- HQ Emergency: 911\n- Field Office: 555-FBI-1000\n\nNo personal contacts stored.'
      }];
    }

    // MESSAGE (future feature)
    if (verb === 'message' || verb === 'text' || verb === 'sms') {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: 'Messaging feature coming soon. For now, you can only make calls.'
      }];
    }

    // PHOTO / CAMERA - Take pictures
    if (verb === 'photo' || verb === 'camera' || verb === 'picture' || verb === 'photograph' || verb === 'take') {
      // Parse target from commands like:
      // "take picture of business card"
      // "take photo of business card"
      // "photograph business card"
      // "picture business card"
      let targetName = restOfCommand;

      // Remove "picture of", "photo of", etc.
      targetName = targetName
        .replace(/^picture\s+of\s+/i, '')
        .replace(/^photo\s+of\s+/i, '')
        .replace(/^photograph\s+of\s+/i, '')
        .replace(/^of\s+/i, '')
        .trim();

      if (!targetName) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: 'What do you want to photograph?\n\nUsage: TAKE PICTURE OF <object>'
        }];
      }

      // Find the target object using VisibilityResolver + smart name matching
      // VisibilityResolver ensures we find revealed objects (like business card)

      // IMPORTANT: Strip location descriptors from the search term
      // "business card on the counter" → "business card"
      // "phone in my pocket" → "phone"
      let cleanedTarget = targetName
        .replace(/\s+(on|in|under|behind|inside|next to|beside|near|by|at)\s+the\s+\w+$/i, '')
        .replace(/\s+(on|in|under|behind|inside|next to|beside|near|by|at)\s+\w+$/i, '')
        .trim();

      const normalizedTarget = normalizeName(cleanedTarget);
      const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

      console.log(`[PHOTOGRAPHY] Original: "${targetName}", Cleaned: "${cleanedTarget}", Looking in ${visibleEntities.objects.length} visible objects`);

      // Use matchesName scoring to find the best match
      let bestMatch: { id: GameObjectId; score: number } | null = null;

      for (const objId of visibleEntities.objects) {
        const obj = game.gameObjects[objId as GameObjectId];
        if (obj) {
          const matchResult = matchesName(obj, normalizedTarget);
          if (matchResult.matches) {
            if (!bestMatch || matchResult.score > bestMatch.score) {
              bestMatch = { id: objId as GameObjectId, score: matchResult.score };
            }
          }
        }
      }

      if (!bestMatch) {
        console.log(`[PHOTOGRAPHY] No match found for "${cleanedTarget}"`);

        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: `You don't see any "${targetName}" here to photograph.`
        }];
      }

      const targetObjectId = bestMatch.id;
      const targetObject = game.gameObjects[targetObjectId];

      console.log(`[PHOTOGRAPHY] Matched object: "${targetObject?.name}" (score: ${bestMatch.score})`);

      if (!targetObject) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: `You don't see any "${targetName}" here to photograph.`
        }];
      }

      // Get the phone item
      const phone = game.items[deviceId as ItemId];
      if (!phone) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'system',
          content: 'Error: Phone not found.'
        }];
      }

      // Attempt to photograph
      const photoResult = attemptPhotograph(
        phone,
        targetObjectId as string,
        'object',
        state,
        game
      );

      if (photoResult.canPhotograph && photoResult.effects) {
        return photoResult.effects;
      } else {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: photoResult.reason || `You can't photograph the ${targetObject.name}.`
        }];
      }
    }

    // HELP - Show available phone commands
    if (verb === 'help' || verb === '?') {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `📱 Phone Commands:\n\n- CHECK MESSAGES - Listen to voicemails\n- CHECK EMAILS - Read your emails\n- CALL <number> - Dial a phone number\n- TAKE PICTURE OF <object> - Photograph something\n- READ SD CARD - View SD card content\n- CONTACTS - View stored contacts\n- PUT PHONE AWAY - Exit phone mode\n- CLOSE PHONE - Exit phone mode`
      }];
    }
  }

  // ============================================================================
  // GENERIC DEVICE COMMANDS
  // ============================================================================

  // HELP
  if (verb === 'help' || verb === '?') {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You are using the ${device.name}.\n\nType PUT AWAY or CLOSE to stop using it.`
    }];
  }

  // ============================================================================
  // FALLBACK - Invalid command while in device mode
  // ============================================================================
  return [{
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: `You're currently using your ${device.name}. Type HELP for available commands, or PUT AWAY to stop using it.`
  }];
}
