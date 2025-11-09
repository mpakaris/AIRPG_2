/**
 * handle-call - NEW ARCHITECTURE
 *
 * Handles calling phone numbers using the player's phone.
 * Supports patterns like "call 555-1234" or "dial 555-1234 on phone".
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect, GameObjectId, ItemId } from "@/lib/game/types";
import { Validator, GameStateManager, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";
import { buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
import { findBestMatch } from "@/lib/game/utils/name-matching";

/**
 * Normalize phone number for comparison (remove spaces, dashes, parentheses)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
}

/**
 * Handle calling a phone number
 * @param state - Current player state
 * @param commandRest - The rest of the command after "call" or "dial"
 * @param game - Game data
 */
export async function handleCall(state: PlayerState, commandRest: string, game: Game): Promise<Effect[]> {
  if (!commandRest) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: "Call what number? Try: CALL 555-1234"
    }];
  }

  // Parse patterns:
  // "call 555-1234" -> number: "555-1234", device: null
  // "call 555-1234 on phone" -> number: "555-1234", device: "phone"
  // "call 555-1234 with phone" -> number: "555-1234", device: "phone"
  const withDeviceMatch = commandRest.match(/^(.+?)\s+(?:on|with|using)\s+(?:the|a|an\s+)?(.+)$/i);

  let phoneNumber: string;
  let deviceName: string | null = null;

  if (withDeviceMatch && withDeviceMatch[1].trim() && withDeviceMatch[2].trim()) {
    phoneNumber = withDeviceMatch[1].trim().replace(/"/g, ''); // Strip quotes
    deviceName = withDeviceMatch[2].trim().replace(/"/g, ''); // Strip quotes
  } else {
    phoneNumber = commandRest.trim().replace(/"/g, ''); // Strip quotes
  }

  // Find the phone device (default to item_player_phone if not specified)
  let phoneDevice: GameObjectId | ItemId | null = null;

  if (deviceName) {
    // Player specified a device - find it
    const normalizedDevice = normalizeName(deviceName);
    const deviceMatch = findBestMatch(normalizedDevice, state, game, {
      searchInventory: true,
      searchVisibleItems: true,
      searchObjects: true,
      requireFocus: false
    });

    if (!deviceMatch) {
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You don't have a "${deviceName}" to make calls with.`
      }];
    }

    phoneDevice = deviceMatch.id as GameObjectId | ItemId;
  } else {
    // No device specified - use the device in focus if available, otherwise look for phone
    if (state.activeDeviceFocus) {
      phoneDevice = state.activeDeviceFocus;
    } else {
      // Look for phone in inventory (item_player_phone)
      phoneDevice = 'item_player_phone' as ItemId;
      const phone = game.items[phoneDevice];

      if (!phone) {
        return [{
          type: 'SHOW_MESSAGE',
          speaker: 'narrator',
          content: "You need a phone to make calls."
        }];
      }
    }
  }

  // Get phone device (could be object or item)
  const phone = game.gameObjects[phoneDevice as GameObjectId] || game.items[phoneDevice as ItemId];
  if (!phone) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: "That's not a device you can call with."
    }];
  }

  // Check if phone has onCall handlers
  const callHandlers = (phone.handlers as any)?.onCall;

  if (!callHandlers) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `The ${phone.name} doesn't have calling functionality.`
    }];
  }

  // Normalize the phone number for comparison
  const normalizedNumber = normalizePhoneNumber(phoneNumber);

  console.log('[handleCall] Player dialed:', phoneNumber);
  console.log('[handleCall] Normalized:', normalizedNumber);

  // Handle array of conditional handlers
  if (Array.isArray(callHandlers)) {
    console.log('[handleCall] Total handlers:', callHandlers.length);

    // Find matching handlers by phone number
    const matchingHandlers = callHandlers.filter(h => {
      const normalizedHandlerNumber = normalizePhoneNumber(h.phoneNumber || '');
      console.log('[handleCall] Checking handler:', h.phoneNumber, '→', normalizedHandlerNumber);
      return normalizedHandlerNumber === normalizedNumber;
    });

    console.log('[handleCall] Matching handlers found:', matchingHandlers.length);

    if (matchingHandlers.length > 0) {
      // Evaluate conditions for each matching handler
      for (const handler of matchingHandlers) {
        const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
        const outcome = conditionsMet ? handler.success : handler.fail;
        const isFail = !conditionsMet;

        if (outcome) {
          // Build effects with media support
          const effects: Effect[] = [];

          // Don't set focus - we're already in device focus mode
          // Just build effects from outcome (handles media, messages, effects)
          const entityType = game.items[phoneDevice as ItemId] ? 'item' : 'object';
          effects.push(...buildEffectsFromOutcome(outcome, phoneDevice, entityType, game, isFail));

          return effects;
        }
      }

      // No handler had outcome
      return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: `You dial ${phoneNumber}. The line is busy.`
      }];
    }

    // No matching number - check for default/fallback handler
    const defaultHandler = callHandlers.find(h => !h.phoneNumber || h.phoneNumber === '*');
    if (defaultHandler) {
      const conditionsMet = Validator.evaluateConditions(defaultHandler.conditions, state, game);
      const outcome = conditionsMet ? defaultHandler.success : defaultHandler.fail;
      const isFail = !conditionsMet;

      if (outcome) {
        const effects: Effect[] = [];
        effects.push(...buildEffectsFromOutcome(outcome, phoneDevice, 'object', game, isFail));
        return effects;
      }
    }

    // No matching handler at all
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `You dial ${phoneNumber}. No answer. The line goes dead.`
    }];
  }

  // Single handler (not conditional)
  const handler = callHandlers as any;
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;
  const isFail = !conditionsMet;

  if (outcome) {
    const effects: Effect[] = [];
    const entityType = game.items[phoneDevice as ItemId] ? 'item' : 'object';
    effects.push(...buildEffectsFromOutcome(outcome, phoneDevice, entityType, game, isFail));
    return effects;
  }

  // Fallback
  return [{
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: `You dial ${phoneNumber}, but nothing happens.`
  }];
}
