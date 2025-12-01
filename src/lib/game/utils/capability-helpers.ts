/**
 * capability-helpers.ts
 *
 * Helper functions for capability-based verb mapping.
 * Auto-generates fail messages based on what actions an entity supports.
 */

import type { GameObject, Item, Capabilities } from "@/lib/game/types";

/**
 * Maps capabilities to their corresponding verbs.
 * When a capability is true, the entity supports that verb.
 */
const CAPABILITY_TO_VERBS: Record<string, string[]> = {
  isTakable: ['TAKE', 'PICK UP', 'GRAB'],
  openable: ['OPEN', 'CLOSE'],
  movable: ['MOVE', 'PUSH', 'PULL'],
  breakable: ['BREAK', 'SMASH', 'DESTROY'],
  readable: ['READ'],
  isReadable: ['READ'],
  searchable: ['SEARCH', 'LOOK INSIDE', 'CHECK BEHIND'],
  usable: ['USE'],
};

/**
 * Core verbs that are ALWAYS available (can't be disabled).
 */
const ALWAYS_AVAILABLE_VERBS = ['EXAMINE', 'LOOK AT'];

/**
 * Generates a list of applicable verbs based on entity capabilities.
 *
 * @param capabilities - The entity's capabilities object (GameObject or Item)
 * @returns Array of verb strings the entity supports
 */
export function getApplicableVerbs(capabilities?: Capabilities | Item['capabilities']): string[] {
  const verbs = new Set<string>(ALWAYS_AVAILABLE_VERBS);

  if (!capabilities) {
    return Array.from(verbs);
  }

  // Add verbs based on true capabilities
  for (const [capability, verbList] of Object.entries(CAPABILITY_TO_VERBS)) {
    const capValue = (capabilities as any)[capability];
    if (capValue === true) {
      verbList.forEach(verb => verbs.add(verb));
    }
  }

  return Array.from(verbs);
}

/**
 * Checks if an entity supports a specific verb based on capabilities.
 *
 * @param entity - GameObject or Item
 * @param verb - The verb to check (e.g., 'take', 'open', 'break')
 * @returns true if entity supports the verb
 */
export function supportsVerb(
  entity: GameObject | Item,
  verb: 'take' | 'open' | 'close' | 'move' | 'break' | 'read' | 'search' | 'use' | 'drop' | 'combine' | 'examine' | 'talk'
): boolean {
  // EXAMINE is always supported
  if (verb === 'examine') return true;

  const caps = entity.capabilities;
  if (!caps) return false;

  // Check if this is an Item (has isTakable) or GameObject (has takable)
  const isItem = 'isTakable' in caps;

  switch (verb) {
    case 'take':
      return isItem ? (caps as any).isTakable === true : (caps as any).takable === true;
    case 'open':
    case 'close':
      return (caps as any).openable === true;
    case 'move':
      return (caps as any).movable === true;
    case 'break':
      return (caps as any).breakable === true;
    case 'read':
      return isItem ? (caps as any).isReadable === true : (caps as any).readable === true;
    case 'search':
      return (caps as any).searchable === true;
    case 'use':
      return isItem ? (caps as any).isUsable === true : (caps as any).usable === true;
    // drop and combine are item-specific, always allowed if in inventory
    case 'drop':
    case 'combine':
      return true;
    case 'talk':
      // Only NPCs support talk (not objects/items)
      return false;
    default:
      return false;
  }
}

/**
 * Generates a helpful fail message that suggests applicable actions.
 *
 * Example: "You can't break the desk. Try: EXAMINE, MOVE, or SEARCH it."
 *
 * @param entity - GameObject or Item
 * @param attemptedVerb - The verb that failed (e.g., "break")
 * @param customMessage - Optional custom fail message to prepend
 * @returns Formatted fail message with suggestions
 */
export function generateCapabilityFailMessage(
  entity: GameObject | Item,
  attemptedVerb: string,
  customMessage?: string
): string {
  const verbs = getApplicableVerbs(entity.capabilities);

  // Build first part (what failed)
  const verbDisplay = attemptedVerb.toUpperCase();
  const failedAction = customMessage || `You can't ${attemptedVerb} the ${entity.name}.`;

  // Build suggestion part
  if (verbs.length === 0) {
    return failedAction;
  }

  // Format verb list
  let suggestion: string;
  if (verbs.length === 1) {
    suggestion = `Try: ${verbs[0]} it`;
  } else if (verbs.length === 2) {
    suggestion = `Try: ${verbs[0]} or ${verbs[1]} it`;
  } else {
    const lastVerb = verbs[verbs.length - 1];
    const otherVerbs = verbs.slice(0, -1).join(', ');
    suggestion = `Try: ${otherVerbs}, or ${lastVerb} it`;
  }

  return `${failedAction} ${suggestion}.`;
}

/**
 * Checks if an entity has ANY handlers defined for a specific verb.
 * Used to distinguish between "capability disabled" vs "no handler defined".
 *
 * @param entity - GameObject or Item
 * @param verb - The verb to check
 * @returns true if entity has handlers for this verb
 */
export function hasHandlerForVerb(
  entity: GameObject | Item,
  verb: string
): boolean {
  if (!entity.handlers) return false;

  const handlerKey = `on${verb.charAt(0).toUpperCase()}${verb.slice(1)}` as keyof typeof entity.handlers;
  return entity.handlers[handlerKey] !== undefined;
}
