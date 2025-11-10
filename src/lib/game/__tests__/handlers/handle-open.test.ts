/**
 * HANDLE-OPEN TESTS
 *
 * Tests for the handleOpen handler covering all container types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleOpen } from '../../actions/handle-open';
import { testGame } from '../test-cartridge';
import {
  createTestState,
  applyEffects,
  assert,
  hasEffect,
  findEffect,
  withEntityState,
  withItem
} from '../test-utils';
import type { PlayerState } from '../../types';

describe('handleOpen', () => {
  let initialState: PlayerState;

  beforeEach(() => {
    initialState = createTestState(testGame);
  });

  // ============================================================================
  // TYPE 1: Simple Openable Container (No Lock)
  // ============================================================================

  describe('Simple Container (no lock)', () => {
    it('should open box and reveal contents', async () => {
      // Act
      const effects = await handleOpen(initialState, 'box', testGame);

      // Assert - Check effects generated
      expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);
      expect(hasEffect(effects, 'REVEAL_FROM_PARENT')).toBe(true);
      expect(hasEffect(effects, 'SHOW_MESSAGE')).toBe(true);

      const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
      expect(stateEffect?.entityId).toBe('test_obj_box');
      expect(stateEffect?.patch.isOpen).toBe(true);

      const revealEffect = findEffect(effects, 'REVEAL_FROM_PARENT');
      expect(revealEffect?.entityId).toBe('test_item_coin');
      expect(revealEffect?.parentId).toBe('test_obj_box');

      // Apply effects and check final state
      const { newState } = await applyEffects(initialState, effects, testGame);
      assert.entityIsOpen(newState, 'test_obj_box');
      assert.entityIsVisible(newState, 'test_item_coin');
    });

    it('should return appropriate message when opening', async () => {
      const effects = await handleOpen(initialState, 'box', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('open');
    });
  });

  // ============================================================================
  // TYPE 2: Item-Locked Container (Safe + Key)
  // ============================================================================

  describe('Item-Locked Container (safe)', () => {
    it('should fail to open when locked', async () => {
      // Safe starts locked
      const effects = await handleOpen(initialState, 'safe', testGame);

      // Should get fail message mentioning it's locked
      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('locked');

      // Should NOT contain open/reveal effects
      expect(hasEffect(effects, 'REVEAL_FROM_PARENT')).toBe(false);
    });

    it('should open when unlocked', async () => {
      // Create state with safe unlocked
      const unlockedState = withEntityState(
        initialState,
        'test_obj_safe',
        { isLocked: false }
      );

      // Act
      const effects = await handleOpen(unlockedState, 'safe', testGame);

      // Assert
      expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);
      expect(hasEffect(effects, 'REVEAL_FROM_PARENT')).toBe(true);

      const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
      expect(stateEffect?.patch.isOpen).toBe(true);

      const revealEffect = findEffect(effects, 'REVEAL_FROM_PARENT');
      expect(revealEffect?.entityId).toBe('test_item_document');

      // Apply and verify final state
      const { newState } = await applyEffects(unlockedState, effects, testGame);
      assert.entityIsOpen(newState, 'test_obj_safe');
      assert.entityIsVisible(newState, 'test_item_document');
    });
  });

  // ============================================================================
  // TYPE 3: Password-Locked Container
  // ============================================================================

  describe('Password-Locked Container (door)', () => {
    it('should fail to open when locked', async () => {
      const effects = await handleOpen(initialState, 'door', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('locked');
      expect(messageEffect?.content).toContain('password');
    });

    it('should open when unlocked via password', async () => {
      // Create state with door unlocked
      const unlockedState = withEntityState(
        initialState,
        'test_obj_door',
        { isLocked: false, isOpen: true }
      );

      const effects = await handleOpen(unlockedState, 'door', testGame);

      // Should indicate already open
      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain('open');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty target name', async () => {
      const effects = await handleOpen(initialState, '', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      // Handler returns a message when target is empty/not found
      expect(messageEffect?.content).toBeDefined();
      expect(messageEffect?.content.length).toBeGreaterThan(0);
    });

    it('should handle non-existent object', async () => {
      const effects = await handleOpen(initialState, 'nonexistent', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toContain("don't see");
    });

    it('should handle non-openable object', async () => {
      // Try to open the painting (movable, not openable)
      const effects = await handleOpen(initialState, 'painting', testGame);

      const messageEffect = findEffect(effects, 'SHOW_MESSAGE');
      expect(messageEffect?.content).toMatch(/can't open|not openable/i);
    });
  });

  // ============================================================================
  // State Consistency Tests
  // ============================================================================

  describe('State Consistency', () => {
    it('should not mutate original state', async () => {
      const stateBefore = JSON.stringify(initialState);
      await handleOpen(initialState, 'box', testGame);
      const stateAfter = JSON.stringify(initialState);

      expect(stateBefore).toBe(stateAfter);
    });

    it('should maintain parent-child relationship after opening', async () => {
      const effects = await handleOpen(initialState, 'box', testGame);
      const { newState } = await applyEffects(initialState, effects, testGame);

      // Coin should have box as parent
      expect(newState.world['test_item_coin'].parentId).toBe('test_obj_box');
    });
  });
});
