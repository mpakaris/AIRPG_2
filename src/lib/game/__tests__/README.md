# Game Engine Test Suite

Automated tests for game handlers and engine systems to prevent regressions.

## 🎯 Test Cartridge

**`test-cartridge.ts`** contains a minimal game with representative container types:

| Type | Example | Tests |
|------|---------|-------|
| Simple Openable | `test_obj_box` | Open, reveal contents |
| Item-Locked | `test_obj_safe` + `test_item_key` | Unlock with item, open, reveal |
| Password-Locked | `test_obj_door` | Unlock with password phrase |
| Movable Revealer | `test_obj_painting` → `test_obj_hidden_button` | Move, reveal hidden object |
| Breakable | `test_obj_crate` + `test_item_crowbar` | Break with tool, reveal contents |

## 🧪 Test Structure

```
__tests__/
├── test-cartridge.ts      # Minimal game for testing
├── test-utils.ts          # Helper functions and assertions
├── handlers/              # Handler unit tests
│   ├── handle-open.test.ts
│   ├── handle-use.test.ts
│   ├── handle-take.test.ts
│   ├── handle-move.test.ts
│   └── handle-password.test.ts
└── integration/           # Multi-handler flow tests
    ├── container-flows.test.ts
    └── progressive-reveal.test.ts
```

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (auto-rerun on changes)
npm test -- --watch

# Run specific test file
npm test handle-open

# Run with coverage
npm test -- --coverage

# Run only tests matching pattern
npm test -- --grep "safe"
```

## ✍️ Writing Tests

### Basic Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { handleOpen } from '../../actions/handle-open';
import { testGame } from '../test-cartridge';
import { createTestState, applyEffects, assert } from '../test-utils';

describe('handleOpen', () => {
  let initialState: PlayerState;

  beforeEach(() => {
    initialState = createTestState(testGame);
  });

  it('should open box and reveal contents', async () => {
    // Act
    const effects = await handleOpen(initialState, 'box', testGame);

    // Assert - Effects
    expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);
    expect(hasEffect(effects, 'REVEAL_FROM_PARENT')).toBe(true);

    // Apply and verify state
    const { newState } = await applyEffects(initialState, effects, testGame);
    assert.entityIsOpen(newState, 'test_obj_box');
    assert.entityIsVisible(newState, 'test_item_coin');
  });
});
```

### Test Utilities

**Create modified state:**
```typescript
import { withItem, withEntityState, withFlag } from '../test-utils';

// Add item to inventory
const stateWithKey = withItem(initialState, 'test_item_key');

// Modify entity state
const unlockedState = withEntityState(initialState, 'test_obj_safe', {
  isLocked: false
});

// Set flag
const stateWithFlag = withFlag(initialState, 'test_safe_unlocked', true);
```

**Check effects:**
```typescript
import { hasEffect, findEffect } from '../test-utils';

// Check if effect type exists
expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);

// Find specific effect
const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
expect(stateEffect?.entityId).toBe('test_obj_safe');
expect(stateEffect?.patch.isLocked).toBe(false);
```

**Assert state:**
```typescript
import { assert } from '../test-utils';

assert.entityIsOpen(newState, 'test_obj_box');
assert.entityIsUnlocked(newState, 'test_obj_safe');
assert.entityIsVisible(newState, 'test_item_coin');
assert.hasItem(newState, 'test_item_key');
assert.hasFlag(newState, 'test_safe_unlocked');
```

## 📋 Test Checklist

For each handler, test:

- ✅ **Success path** - Happy path works
- ✅ **Fail path** - Conditions not met (locked, no item, etc.)
- ✅ **Edge cases** - Empty input, nonexistent entities
- ✅ **State consistency** - Original state not mutated
- ✅ **Effect generation** - Correct effects produced
- ✅ **State mutations** - Effects apply correctly
- ✅ **Parent-child relationships** - Maintained after operations

## 🎯 What to Test

### Level 1: Handler Output (Effects)
```typescript
it('should generate unlock effects', async () => {
  const effects = await handleUse(state, 'key', 'safe', testGame);
  expect(effects).toContainEqual({
    type: 'SET_ENTITY_STATE',
    entityId: 'test_obj_safe',
    patch: { isLocked: false }
  });
});
```

### Level 2: State Mutations
```typescript
it('should unlock safe in world state', async () => {
  const effects = await handleUse(state, 'key', 'safe', testGame);
  const { newState } = await applyEffects(state, effects, testGame);

  expect(newState.world['test_obj_safe'].isLocked).toBe(false);
});
```

### Level 3: Complete Flows
```typescript
it('should complete safe unlock flow', async () => {
  let state = withItem(initialState, 'test_item_key');

  // Unlock
  let effects = await handleUse(state, 'key', 'safe', testGame);
  ({ newState: state } = await applyEffects(state, effects, testGame));
  assert.entityIsUnlocked(state, 'test_obj_safe');

  // Open
  effects = await handleOpen(state, 'safe', testGame);
  ({ newState: state } = await applyEffects(state, effects, testGame));
  assert.entityIsOpen(state, 'test_obj_safe');
  assert.entityIsVisible(state, 'test_item_document');
});
```

## 🐛 When to Add Tests

1. **Before fixing a bug** - Write failing test first (TDD)
2. **After fixing a bug** - Ensure bug stays fixed
3. **When adding new features** - Test new handlers/patterns
4. **When refactoring** - Ensure behavior unchanged

## 🔍 Debugging Tests

**Use `.only` to run single test:**
```typescript
it.only('should unlock safe', async () => {
  // Only this test will run
});
```

**Use `.skip` to skip test:**
```typescript
it.skip('not ready yet', async () => {
  // This test will be skipped
});
```

**Check actual vs expected:**
```typescript
console.log('Effects:', JSON.stringify(effects, null, 2));
console.log('State:', JSON.stringify(newState.world['test_obj_safe'], null, 2));
```

## 📊 Coverage Goals

- **Handlers:** 80%+ coverage
- **Engine systems:** 90%+ coverage
- **Critical paths:** 100% coverage

Run coverage report:
```bash
npm test -- --coverage
open coverage/index.html
```

## 🚨 CI/CD Integration

Tests run automatically on:
- Every push to `main`
- Every pull request
- Before deployment

If tests fail, deployment is blocked.

## 💡 Best Practices

1. **Keep tests focused** - One concept per test
2. **Use descriptive names** - Test name explains what's tested
3. **Arrange-Act-Assert** - Clear test structure
4. **Don't test implementation** - Test behavior, not internals
5. **Use test utilities** - DRY principle
6. **Mock when necessary** - Keep tests fast
7. **Test edge cases** - Not just happy path

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Writing Better Tests](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
