/**
 * Utility to calculate diffs between PlayerState objects
 * Reduces log storage from 8-12 KB per turn → 1-2 KB per turn
 */

import type { PlayerState } from '../types';

export type StateDiff = {
  changed: Record<string, any>;
  added: Record<string, any>;
  removed: string[];
};

/**
 * Calculate the difference between two PlayerState objects
 * Only returns changed/added/removed fields (not full state)
 */
export function calculateStateDiff(
  before: PlayerState,
  after: PlayerState
): StateDiff {
  const diff: StateDiff = {
    changed: {},
    added: {},
    removed: [],
  };

  // Check top-level simple fields
  const simpleFields = [
    'currentChapterId',
    'currentLocationId',
    'currentFocusId',
    'previousFocusId',
    'focusType',
    'activeConversationWith',
    'activeDeviceFocus',
    'interactingWithObject',
    'turnCount',
  ];

  for (const field of simpleFields) {
    const beforeValue = (before as any)[field];
    const afterValue = (after as any)[field];
    if (beforeValue !== afterValue) {
      diff.changed[field] = afterValue;
    }
  }

  // Check inventory (array comparison)
  if (JSON.stringify(before.inventory) !== JSON.stringify(after.inventory)) {
    diff.changed.inventory = after.inventory;
  }

  // Check flags (Record comparison)
  const flagDiff = compareRecords(before.flags, after.flags);
  if (Object.keys(flagDiff.changed).length > 0) {
    diff.changed.flags = flagDiff.changed;
  }

  // Check world state (only changed entities)
  const worldDiff = compareRecords(before.world, after.world);
  if (Object.keys(worldDiff.changed).length > 0) {
    diff.changed.world = worldDiff.changed;
  }
  if (worldDiff.added.length > 0) {
    diff.added.world = worldDiff.added;
  }
  if (worldDiff.removed.length > 0) {
    diff.removed.push(...worldDiff.removed.map(k => `world.${k}`));
  }

  // Check counters
  if (before.counters || after.counters) {
    const counterDiff = compareRecords(before.counters || {}, after.counters || {});
    if (Object.keys(counterDiff.changed).length > 0) {
      diff.changed.counters = counterDiff.changed;
    }
  }

  // Check stories (only if changed)
  if (JSON.stringify(before.stories) !== JSON.stringify(after.stories)) {
    diff.changed.stories = after.stories;
  }

  return diff;
}

/**
 * Helper to compare Record objects and find changes
 */
function compareRecords(
  before: Record<string, any>,
  after: Record<string, any>
): { changed: Record<string, any>; added: string[]; removed: string[] } {
  const result = {
    changed: {} as Record<string, any>,
    added: [] as string[],
    removed: [] as string[],
  };

  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);

  // Find changed and new keys
  for (const key of afterKeys) {
    if (!(key in before)) {
      result.added.push(key);
      result.changed[key] = after[key];
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      result.changed[key] = after[key];
    }
  }

  // Find removed keys
  for (const key of beforeKeys) {
    if (!(key in after)) {
      result.removed.push(key);
    }
  }

  return result;
}

/**
 * Calculate size estimate of state or diff (in bytes)
 * Useful for monitoring
 */
export function estimateSize(obj: any): number {
  return JSON.stringify(obj).length;
}
