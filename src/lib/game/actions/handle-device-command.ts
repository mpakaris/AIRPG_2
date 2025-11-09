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

    // PHOTO / CAMERA (future feature)
    if (verb === 'photo' || verb === 'camera' || verb === 'picture') {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: 'Camera feature coming soon.'
      }];
    }

    // HELP - Show available phone commands
    if (verb === 'help' || verb === '?') {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `📱 Phone Commands:\n\n- CALL <number> - Dial a phone number\n- READ SD CARD - View SD card content\n- CONTACTS - View stored contacts\n- PUT PHONE AWAY - Exit phone mode\n- CLOSE PHONE - Exit phone mode`
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
