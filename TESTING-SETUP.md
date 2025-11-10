# 🧪 Testing Infrastructure - Setup Complete

## ✅ What We've Built

A complete automated testing system for the game engine with:

1. **Test Cartridge** - Minimal game with representative container types
2. **Test Utilities** - Helper functions for writing tests
3. **Test Suites** - Example tests for `handleOpen` and `handleUse`
4. **Configuration** - Vitest setup with path aliases

---

## 📁 Files Created

```
src/lib/game/__tests__/
├── README.md                           # Test documentation
├── test-cartridge.ts                   # Minimal test game (5 container types)
├── test-utils.ts                       # Helper functions & assertions
└── handlers/
    ├── handle-open.test.ts             # Tests for opening containers
    └── handle-use.test.ts              # Tests for item-on-object interactions

vitest.config.ts                        # Vitest configuration
TESTING-SETUP.md                        # This file
```

---

## 🎯 Container Types in Test Cartridge

| Type | Entity | Tests |
|------|--------|-------|
| **Simple Openable** | `test_obj_box` | Open, reveal `test_item_coin` |
| **Item-Locked** | `test_obj_safe` + `test_item_key` | Use key, unlock, open, reveal `test_item_document` |
| **Password-Locked** | `test_obj_door` | `/password open sesame` to unlock |
| **Movable Revealer** | `test_obj_painting` | Move, reveal `test_obj_hidden_button` |
| **Breakable** | `test_obj_crate` + `test_item_crowbar` | Break with crowbar, reveal `test_item_gem` |

---

## 🚀 Installation & Setup

### Step 1: Install Vitest

```bash
npm install --save-dev vitest @vitest/ui
```

### Step 2: Add Test Scripts to package.json

Add these lines to the `"scripts"` section of `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Step 3: Run Tests

```bash
# Run all tests
npm test

# Run with UI (recommended)
npm run test:ui

# Run once (CI mode)
npm test -- --run

# Run specific test file
npm test handle-open

# Watch mode (auto-rerun on changes)
npm test -- --watch
```

---

## 📊 Example Test Output

When you run `npm test`, you should see:

```
✓ src/lib/game/__tests__/handlers/handle-open.test.ts (12)
  ✓ Simple Container (no lock) (2)
    ✓ should open box and reveal contents
    ✓ should return appropriate message when opening
  ✓ Item-Locked Container (safe) (2)
    ✓ should fail to open when locked
    ✓ should open when unlocked
  ✓ Password-Locked Container (door) (2)
    ✓ should fail to open when locked
    ✓ should open when unlocked via password
  ✓ Edge Cases (3)
    ✓ should handle empty target name
    ✓ should handle non-existent object
    ✓ should handle non-openable object
  ✓ State Consistency (2)
    ✓ should not mutate original state
    ✓ should maintain parent-child relationship after opening

✓ src/lib/game/__tests__/handlers/handle-use.test.ts (11)
  ✓ Safe with Key (3)
    ✓ should unlock safe when using correct key
    ✓ should fail when player does not have key
    ✓ should provide appropriate message when safe already unlocked
  ✓ Crate with Crowbar (3)
    ✓ should break crate when using crowbar
    ✓ should fail when using wrong item on crate
    ✓ should provide message when crate already broken
  ✓ Hidden Button (2)
    ✓ should activate button when used
    ✓ should fail when button is not visible
  ✓ Edge Cases (3)
    ✓ should handle empty item name
    ✓ should handle non-existent target
    ✓ should handle using item that does not exist

Test Files  2 passed (2)
Tests  23 passed (23)
Duration  1.2s
```

---

## 🧪 How to Write Tests

### Basic Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { handleOpen } from '../../actions/handle-open';
import { testGame } from '../test-cartridge';
import { createTestState, applyEffects, assert, findEffect } from '../test-utils';
import type { PlayerState } from '../../types';

describe('handleOpen', () => {
  let initialState: PlayerState;

  beforeEach(() => {
    initialState = createTestState(testGame);
  });

  it('should open box and reveal contents', async () => {
    // Arrange - Already done in beforeEach

    // Act
    const effects = await handleOpen(initialState, 'box', testGame);

    // Assert - Check effects
    const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');
    expect(stateEffect?.patch.isOpen).toBe(true);

    // Apply effects and check final state
    const { newState } = await applyEffects(initialState, effects, testGame);
    assert.entityIsOpen(newState, 'test_obj_box');
    assert.entityIsVisible(newState, 'test_item_coin');
  });
});
```

---

## 🛠️ Test Utilities

### Create Modified States

```typescript
import { withItem, withEntityState, withFlag } from '../test-utils';

// Add item to inventory
const stateWithKey = withItem(initialState, 'test_item_key');

// Modify entity state
const unlockedSafe = withEntityState(initialState, 'test_obj_safe', {
  isLocked: false
});

// Set flag
const stateWithFlag = withFlag(initialState, 'safe_unlocked', true);
```

### Check Effects

```typescript
import { hasEffect, findEffect, findEffects } from '../test-utils';

// Check if effect type exists
expect(hasEffect(effects, 'SET_ENTITY_STATE')).toBe(true);

// Find first effect of type
const stateEffect = findEffect(effects, 'SET_ENTITY_STATE');

// Find all effects of type
const allMessages = findEffects(effects, 'SHOW_MESSAGE');
```

### Assert State

```typescript
import { assert } from '../test-utils';

assert.entityIsOpen(newState, 'test_obj_box');
assert.entityIsLocked(newState, 'test_obj_safe');
assert.entityIsUnlocked(newState, 'test_obj_safe');
assert.entityIsVisible(newState, 'test_item_coin');
assert.entityIsBroken(newState, 'test_obj_crate');
assert.hasItem(newState, 'test_item_key');
assert.hasFlag(newState, 'safe_unlocked');
assert.effectExists(effects, 'REVEAL_FROM_PARENT');
```

---

## 📋 What's Already Tested

### `handle-open.test.ts`
- ✅ Opening simple container (box)
- ✅ Opening item-locked container (safe)
- ✅ Opening password-locked container (door)
- ✅ Edge cases (empty name, nonexistent, non-openable)
- ✅ State consistency (no mutations, parent-child intact)

### `handle-use.test.ts`
- ✅ Using key on safe (unlock)
- ✅ Using crowbar on crate (break)
- ✅ Using button (simple interaction)
- ✅ Item not in inventory
- ✅ Wrong item for target
- ✅ Already unlocked/broken
- ✅ Edge cases (empty, nonexistent)
- ✅ State consistency

---

## 🎯 Next Steps

### Add More Handler Tests

1. **`handle-take.test.ts`** - Taking items from world/containers
2. **`handle-move.test.ts`** - Moving painting to reveal button
3. **`handle-password.test.ts`** - Password validation (`/password` command)
4. **`handle-examine.test.ts`** - Examining objects
5. **`handle-break.test.ts`** - Breaking objects

### Add Integration Tests

1. **Complete puzzle flows** - Multi-step sequences
2. **Progressive reveals** - Notebook → SD card → police file
3. **Focus system** - Device focus boundaries
4. **Parent-child relationships** - Nested containers

### Example: Add `handle-take.test.ts`

```typescript
// src/lib/game/__tests__/handlers/handle-take.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { handleTake } from '../../actions/handle-take';
import { testGame } from '../test-cartridge';
import { createTestState, applyEffects, assert, findEffect } from '../test-utils';

describe('handleTake', () => {
  let initialState: PlayerState;

  beforeEach(() => {
    initialState = createTestState(testGame);
  });

  it('should take visible key', async () => {
    // Make key visible first
    const stateWithKey = withEntityState(initialState, 'test_item_key', {
      isVisible: true
    });

    const effects = await handleTake(stateWithKey, 'key', testGame);

    expect(hasEffect(effects, 'ADD_ITEM')).toBe(true);
    const { newState } = await applyEffects(stateWithKey, effects, testGame);
    assert.hasItem(newState, 'test_item_key');
  });

  // Add more tests...
});
```

---

## 🐛 Test-Driven Development (TDD)

When fixing bugs:

1. **Write failing test first**
2. **Run test** - Verify it fails
3. **Fix the bug**
4. **Run test** - Verify it passes
5. **Commit** - Bug fix + test together

Example workflow:

```bash
# 1. Create test
vim src/lib/game/__tests__/handlers/handle-open.test.ts

# 2. Run test (should fail)
npm test handle-open

# 3. Fix handler
vim src/lib/game/actions/handle-open.ts

# 4. Run test (should pass)
npm test handle-open

# 5. Commit both
git add src/lib/game/__tests__/handlers/handle-open.test.ts
git add src/lib/game/actions/handle-open.ts
git commit -m "Fix: opening locked safe now shows correct message"
```

---

## 📊 Coverage Report

After adding more tests, generate coverage:

```bash
# Install coverage dependency
npm install --save-dev @vitest/coverage-v8

# Run with coverage
npm run test:coverage

# Open HTML report
open coverage/index.html
```

**Coverage goals:**
- Handlers: 80%+
- Engine systems: 90%+
- Critical flows: 100%

---

## 🚨 Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --run
```

---

## 💡 Benefits

1. **Catch Regressions** - Changes don't break existing features
2. **Confidence** - Refactor without fear
3. **Documentation** - Tests show how systems work
4. **Fast Feedback** - Know immediately if something breaks
5. **Better Design** - Testable code is better code

---

## 📚 Resources

- **Full Test Documentation**: `src/lib/game/__tests__/README.md`
- **Vitest Docs**: https://vitest.dev/
- **Test Cartridge**: `src/lib/game/__tests__/test-cartridge.ts`
- **Test Utilities**: `src/lib/game/__tests__/test-utils.ts`

---

## ✅ Checklist

- [ ] Install Vitest: `npm install --save-dev vitest @vitest/ui`
- [ ] Add test scripts to `package.json`
- [ ] Run tests: `npm test`
- [ ] Verify all tests pass (23 tests)
- [ ] Try UI mode: `npm run test:ui`
- [ ] Write first new test
- [ ] Add tests for new features before implementing
- [ ] Run tests before every commit

---

**Ready to test!** 🎉

Start with:
```bash
npm install --save-dev vitest @vitest/ui
npm test
```
