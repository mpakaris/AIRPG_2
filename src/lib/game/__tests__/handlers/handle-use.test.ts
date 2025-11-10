/**
 * HANDLE-USE TESTS
 *
 * Tests for the handleUse handler covering item-on-object interactions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleUse } from '../../actions/handle-use';
import { testGame } from '../test-cartridge';
import {
  createTestState,
  applyEffects,
  assert,
  hasEffect,
  findEffect,
  withItem,
  withEntityState
} from '../test-utils';
import type { PlayerState } from '../../types';

describe('handleUse', () => {
  let initialState: PlayerState;

  beforeEach(() => {
    initialState = createTestState(testGame);
  });

  // ============================================================================
  // TYPE 2: Item-Locked Container (Safe + Key)
  // ============================================================================

  describe('Safe with Key', () => {
    it('should unlock safe when using correct key', async () => {
      // Setup: Player has key in inventory
      const stateWithKey = withItem(initialState, 'test_item_key');

      // Act
      const effects = await handleUse(stateWithKey, 'key', 'safe', testGame);

      // Assert - Check effects
      expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);
      expect(hasEffect(effects, 'SET_FLAG')).toBe(true);

      const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
      expect(stateEffect?.entityId).toBe('test_obj_safe');
      expect(stateEffect?.patch.isLocked).toBe(false);

      const flagEffect = findEffect(effects, 'SET_FLAG');
      expect(flagEffect?.flag).toBe('test_safe_unlocked');
      expect(flagEffect?.value).toBe(true);

      // Apply effects and verify state
      const { newState } = await applyEffects(stateWithKey, effects, testGame);
      assert.entityIsUnlocked(newState, 'test_obj_safe');
      assert.hasFlag(newState, 'test_safe_unlocked');
    });

    it('should fail when player does not have key', async () => {
      // Player doesn't have key
      const effects = await handleUse(initialState, 'key', 'safe', testGame);

      // Should get error message (either about not having key or not seeing it)
      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toBeDefined();
      // Should NOT unlock the safe
      expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(false);
    });

    it('should provide appropriate message when safe already unlocked', async () => {
      // Setup: Player has key, safe is already unlocked
      const stateWithKey = withItem(initialState, 'test_item_key');
      const unlockedState = withEntityState(
        stateWithKey,
        'test_obj_safe',
        { isLocked: false }
      );

      // Act
      const effects = await handleUse(unlockedState, 'key', 'safe', testGame);

      // Should get message about already unlocked
      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('already unlocked');
    });
  });

  // ============================================================================
  // TYPE 5: Breakable Container (Crate + Crowbar)
  // ============================================================================

  describe('Crate with Crowbar', () => {
    it('should break crate when using crowbar', async () => {
      // Setup: Player has crowbar
      const stateWithCrowbar = withItem(initialState, 'test_item_crowbar');

      // Act
      const effects = await handleUse(stateWithCrowbar, 'crowbar', 'crate', testGame);

      // Assert
      expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);
      expect(hasEffect(effects, 'REVEAL_FROM_PARENT')).toBe(true);
      expect(hasEffect(effects, 'SET_FLAG')).toBe(true);

      const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
      expect(stateEffect?.entityId).toBe('test_obj_crate');
      expect(stateEffect?.patch.isBroken).toBe(true);

      const revealEffect = findEffect(effects, 'REVEAL_FROM_PARENT');
      expect(revealEffect?.entityId).toBe('test_item_gem');
      expect(revealEffect?.parentId).toBe('test_obj_crate');

      // Apply and verify
      const { newState } = await applyEffects(stateWithCrowbar, effects, testGame);
      assert.entityIsBroken(newState, 'test_obj_crate');
      assert.entityIsVisible(newState, 'test_item_gem');
      assert.hasFlag(newState, 'test_crate_broken');
    });

    it('should fail when using wrong item on crate', async () => {
      // Try using key (wrong item) on crate
      const stateWithKey = withItem(initialState, 'test_item_key');

      const effects = await handleUse(stateWithKey, 'key', 'crate', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toMatch(/doesn't work|can't use/i);
    });

    it('should provide message when crate already broken', async () => {
      // Setup: Player has crowbar, crate already broken
      const stateWithCrowbar = withItem(initialState, 'test_item_crowbar');
      const brokenState = withEntityState(
        stateWithCrowbar,
        'test_obj_crate',
        { isBroken: true }
      );

      const effects = await handleUse(brokenState, 'crowbar', 'crate', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('already broken');
    });
  });

  // ============================================================================
  // Hidden Button (Simple Use)
  // ============================================================================

  describe('Hidden Button', () => {
    it.skip('should activate button when used', async () => {
      // TODO: Button usage without an item needs different handler pattern
      // Objects with onUse currently require an item to be used ON them
      // This test documents the expected behavior for future implementation
    });

    it('should fail when button is not visible', async () => {
      // Button starts hidden
      const effects = await handleUse(initialState, 'button', null as any, testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty item name', async () => {
      const effects = await handleUse(initialState, '', 'safe', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toBeDefined();
      expect(messageEffect?.content.length).toBeGreaterThan(0);
    });

    it('should handle non-existent target', async () => {
      const stateWithKey = withItem(initialState, 'test_item_key');
      const effects = await handleUse(stateWithKey, 'key', 'nonexistent', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain("don't see");
    });

    it('should handle using item that does not exist', async () => {
      const effects = await handleUse(initialState, 'nonexistent', 'safe', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      // Should return an error message (item not found)
      expect(messageEffect?.content).toBeDefined();
      expect(messageEffect?.content.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // State Consistency
  // ============================================================================

  describe('State Consistency', () => {
    it('should not mutate original state', async () => {
      const stateWithKey = withItem(initialState, 'test_item_key');
      const stateBefore = JSON.stringify(stateWithKey);
      await handleUse(stateWithKey, 'key', 'safe', testGame);
      const stateAfter = JSON.stringify(stateWithKey);

      expect(stateBefore).toBe(stateAfter);
    });

    it('should maintain item in inventory after use', async () => {
      const stateWithKey = withItem(initialState, 'test_item_key');
      const effects = await handleUse(stateWithKey, 'key', 'safe', testGame);
      const { newState } = await applyEffects(stateWithKey, effects, testGame);

      // Key should still be in inventory (not consumed)
      assert.hasItem(newState, 'test_item_key');
    });
  });
});
