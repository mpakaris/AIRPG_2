# Migration Guide: Claude 1.0 Architecture

This document explains the new architecture implemented in the `claude-1.0` branch and provides step-by-step instructions for completing the migration.

## Table of Contents
1. [Overview](#overview)
2. [What's Been Built (Phase 1)](#whats-been-built-phase-1)
3. [What Needs to Be Done (Phase 2)](#what-needs-to-be-done-phase-2)
4. [Key Concepts](#key-concepts)
5. [Migration Steps](#migration-steps)
6. [Examples](#examples)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### The Problem
The previous architecture had several issues:
- **Mixed concerns**: Game data mutating at runtime
- **Ad-hoc state**: Flags and state spread across objects
- **LLM inventing actions**: AI saw stale or contradictory state
- **No single reducer**: Effects changed state in many places

### The Solution
The new architecture implements:
1. **Immutable cartridge**: Static game content never changes
2. **Unified world state**: All runtime state in `PlayerState.world`
3. **Single reducer**: All mutations through `GameStateManager.apply()`
4. **Deterministic DSL**: Handlers emit effects, not code
5. **Filtered AI context**: LLM only sees visible, actionable data

---

## What's Been Built (Phase 1)

### ✅ 1. Enhanced Type System (`src/lib/game/types.ts`)

#### New Types
- **Effect**: Atomic operations (SET_FLAG, SET_ENTITY_STATE, ADD_ITEM, REVEAL_ENTITY, etc.)
- **Condition**: Flag checks, state checks, item checks, location checks, random chance
- **Rule**: conditions + success outcome + fail outcome + fallback
- **Outcome**: message + speaker + media + effects
- **Handlers**: onExamine, onMove, onOpen, onUnlock, onUse, etc.
- **OnUseWith**: Item-specific use handlers
- **Capabilities**: openable, lockable, breakable, movable, etc.
- **EntityRuntimeState**: Unified runtime state for all entities
- **MediaSet**: imageKey, soundKey, videoUrl

#### Updated Types
- **PlayerState**: Now includes `world`, `flags` as Record, `counters`
- **Effect**: Atomic operations only
- **Condition**: Comprehensive condition types

### ✅ 2. Core Engine Services (`src/lib/game/engine/`)

#### GameStateManager
```typescript
// Central reducer - ONLY way to mutate state
const result = GameStateManager.apply(effect, state);
const result = GameStateManager.applyAll(effects, state, messages);

// Helper methods
const entityState = GameStateManager.getEntityState(state, 'obj_safe');
const isVisible = GameStateManager.isEntityVisible(state, 'obj_safe');
const hasFlag = GameStateManager.hasFlag(state, 'moved_painting');
```

#### Validator
```typescript
// Validate actions before execution
const result = Validator.validate('open', 'obj_safe', state, game);
if (!result.valid) {
  console.log(result.reason); // "It is locked."
  console.log(result.affordances); // ["unlock", "examine"]
}

// Evaluate conditions
const conditionsMet = Validator.evaluateConditions(conditions, state, game);
```

#### VisibilityResolver
```typescript
// Get all visible entities
const visible = VisibilityResolver.getVisibleEntities(state, game);
console.log(visible.objects); // ["obj_desk", "obj_painting"]
console.log(visible.items); // ["item_key"]

// Check parent-child relationships
const parent = VisibilityResolver.findParent('obj_safe', game);
const isAccessible = VisibilityResolver.isParentAccessible(parent, state, game);
```

#### AIContextBuilder
```typescript
// Build filtered context for LLM
const context = AIContextBuilder.buildContext(state, game);
const prompt = AIContextBuilder.formatAsPrompt(context);

// Context includes only:
// - Current chapter and objectives
// - Current location
// - Visible entities with capabilities and affordances
// - Player inventory
// - Available commands
```

### ✅ 3. Updated Game State Initialization

The `getInitialState()` function now:
- Initializes `world` with state from all entities
- Sets sensible defaults (visible, not discovered, etc.)
- Maintains backward compatibility with legacy structures

---

## What Needs to Be Done (Phase 2)

### 🔲 1. Refactor Cartridge to Use New DSL

#### Current Format (Legacy)
```typescript
{
  id: 'obj_painting',
  name: 'Painting',
  handlers: {
    onExamine: {
      conditions: [{ type: 'HAS_FLAG', targetId: 'moved_painting' }],
      success: { message: 'The wall behind is now visible.', effects: [] },
      fail: { message: 'An abstract painting.', effects: [] }
    }
  }
}
```

#### New Format (DSL)
```typescript
{
  id: 'obj_painting',
  name: 'Painting',
  capabilities: { movable: true },
  stateDefaults: { isVisible: true, isMoved: false },
  handlers: {
    onExamine: {
      success: { message: 'Abstract, signed "S.B.". Looks like it could be moved.' }
    },
    onMove: {
      success: {
        message: 'You slide it aside, revealing a small wall safe.',
        effects: [
          { type: 'REVEAL_ENTITY', entityId: 'obj_safe' },
          { type: 'SET_ENTITY_STATE', entityId: 'obj_painting', patch: { isMoved: true } }
        ]
      }
    }
  },
  children: { objects: ['obj_safe'] }
}
```

**Action Items**:
- [ ] Update painting object in cartridge.ts
- [ ] Update safe object in cartridge.ts
- [ ] Update confidential file item in cartridge.ts
- [ ] Add `children` relationships
- [ ] Set proper `stateDefaults`

### 🔲 2. Update Handler Files to Emit Effects

#### Current Pattern (Direct Mutation)
```typescript
// ❌ BAD: Direct state mutation
export function handleOpen(target: GameObject, state: PlayerState): CommandResult {
  state.objectStates[target.id].isOpen = true; // Direct mutation!
  return { newState: state, messages: [...] };
}
```

#### New Pattern (Emit Effects)
```typescript
// ✅ GOOD: Emit effects
export function handleOpen(target: GameObject, state: PlayerState, game: Game): Effect[] {
  // 1. Validate
  const validation = Validator.validate('open', target.id, state, game);
  if (!validation.valid) {
    return [{
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: validation.reason || 'You cannot do that.'
    }];
  }

  // 2. Get handler
  const handler = target.handlers?.onOpen;
  if (!handler) {
    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: 'Cannot be opened.' }];
  }

  // 3. Check conditions
  const conditionsMet = Validator.evaluateConditions(handler.conditions, state, game);
  const outcome = conditionsMet ? handler.success : handler.fail;

  if (!outcome) {
    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: handler.fallback || 'Nothing happens.' }];
  }

  // 4. Build effects
  const effects: Effect[] = [];

  // Add message
  if (outcome.message) {
    effects.push({
      type: 'SHOW_MESSAGE',
      speaker: outcome.speaker || 'narrator',
      content: outcome.message
    });
  }

  // Add outcome effects
  if (outcome.effects) {
    effects.push(...outcome.effects);
  }

  return effects;
}
```

**Action Items**:
- [ ] Update `handle-open.ts`
- [ ] Update `handle-move.ts`
- [ ] Update `handle-unlock.ts`
- [ ] Update `handle-examine.ts`
- [ ] Update `handle-take.ts`
- [ ] Update `handle-use.ts`
- [ ] Update `handle-read.ts`
- [ ] Update all other handlers

### 🔲 3. Update processCommand in actions.ts

#### Current Pattern
```typescript
export async function processCommand(userId: string, command: string): Promise<CommandResult> {
  // ... parse command
  const result = await handleOpen(target, state); // Direct call
  await saveState(result.newState);
  return result;
}
```

#### New Pattern
```typescript
export async function processCommand(userId: string, command: string): Promise<CommandResult> {
  // 1. Load state and game
  const state = await loadPlayerState(userId);
  const game = await getGameData(GAME_ID);

  // 2. Parse command (use AI)
  const parsed = await parseCommand(command, state, game);

  // 3. Route to handler (returns Effect[])
  let effects: Effect[] = [];
  switch (parsed.verb) {
    case 'open':
      effects = handleOpen(parsed.targetId, state, game);
      break;
    case 'move':
      effects = handleMove(parsed.targetId, state, game);
      break;
    // ... other verbs
  }

  // 4. Apply effects through reducer
  const result = GameStateManager.applyAll(effects, state, currentMessages);

  // 5. Save new state
  await savePlayerState(userId, result.state);
  await saveMessages(userId, result.messages);

  return { newState: result.state, messages: result.messages };
}
```

**Action Items**:
- [ ] Update processCommand to use new pipeline
- [ ] Update command parsing to use AIContextBuilder
- [ ] Update all handler invocations to return Effect[]
- [ ] Apply effects through GameStateManager
- [ ] Update Firestore saves to handle new state structure

### 🔲 4. Implement StateMap Composition

For progressive content (e.g., book with multiple read states):

```typescript
{
  id: 'item_book',
  name: 'Book',
  capabilities: { readable: true, takable: true },
  stateDefaults: { isVisible: true, currentStateId: 'default', readCount: 0 },
  handlers: {
    onRead: {
      success: { message: 'Default read message' }
    }
  },
  stateMap: {
    default: {
      overrides: {
        onRead: {
          success: {
            message: 'Excerpt 1: The detective entered the room...',
            effects: [{ type: 'SET_STATE_ID', entityId: 'item_book', to: 'read1' }]
          }
        }
      }
    },
    read1: {
      overrides: {
        onRead: {
          success: {
            message: 'Excerpt 2: Blood stains on the carpet...',
            effects: [{ type: 'SET_STATE_ID', entityId: 'item_book', to: 'read2' }]
          }
        }
      }
    },
    read2: {
      overrides: {
        onRead: {
          success: {
            message: 'Excerpt 3: The killer was closer than he thought...',
            effects: [{ type: 'SET_STATE_ID', entityId: 'item_book', to: 'cooldown' }]
          }
        }
      }
    },
    cooldown: {
      description: 'A well-worn detective novel',
      overrides: {
        onRead: {
          success: {
            speaker: 'agent',
            message: 'You\'ve already read the relevant parts.'
          }
        }
      }
    }
  }
}
```

**Action Items**:
- [ ] Implement getEffectiveHandler() that resolves stateMap
- [ ] Update handlers to check stateMap before entity handlers
- [ ] Add example book with progressive content to cartridge

---

## Key Concepts

### Effect Pipeline

```
User Input
    ↓
AI Parse (using AIContextBuilder)
    ↓
Command { verb, targetId, withItemId? }
    ↓
Handler (returns Effect[])
    ↓
Validator (checks capabilities + conditions)
    ↓
GameStateManager.applyAll(effects)
    ↓
New PlayerState + Messages
    ↓
Save to Firestore
```

### State Access Patterns

#### ❌ OLD (Direct Access)
```typescript
if (state.objectStates[objectId].isOpen) { ... }
state.flags.includes('moved_painting')
```

#### ✅ NEW (Through GameStateManager)
```typescript
const entityState = GameStateManager.getEntityState(state, objectId);
if (entityState.isOpen) { ... }

if (GameStateManager.hasFlag(state, 'moved_painting')) { ... }
```

### Handler Resolution Priority

1. **stateMap[currentStateId].overrides** ← Highest priority
2. **entity.handlers**
3. **archetype.handlers**
4. **fallback message** ← Lowest priority

---

## Examples

### Example 1: Painting → Safe → File Chain

**Cartridge Definition**:
```typescript
objects: {
  obj_painting: {
    id: 'obj_painting',
    name: 'Painting',
    capabilities: { movable: true },
    stateDefaults: { isVisible: true, isMoved: false },
    handlers: {
      onMove: {
        success: {
          message: 'You slide the painting aside, revealing a wall safe.',
          effects: [
            { type: 'REVEAL_ENTITY', entityId: 'obj_safe' },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_painting', patch: { isMoved: true } },
            { type: 'SET_FLAG', flag: 'discovered_safe', value: true }
          ]
        }
      }
    },
    children: { objects: ['obj_safe'] }
  },
  obj_safe: {
    id: 'obj_safe',
    name: 'Wall Safe',
    capabilities: { openable: true, lockable: true, container: true },
    stateDefaults: { isVisible: false, isLocked: true, isOpen: false },
    handlers: {
      onUnlock: {
        unlocksWith: { itemId: 'item_small_key' },
        success: {
          message: 'Soft click. The safe is now unlocked.',
          effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_safe', patch: { isLocked: false } }
          ]
        },
        fail: {
          message: 'The key doesn\'t fit.'
        }
      },
      onOpen: {
        conditions: [{ type: 'STATE', entityId: 'obj_safe', key: 'isLocked', equals: false }],
        success: {
          message: 'Inside you find a confidential file.',
          effects: [
            { type: 'REVEAL_ENTITY', entityId: 'item_confidential_file' },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_safe', patch: { isOpen: true } }
          ]
        },
        fail: {
          message: 'It is locked.'
        }
      }
    },
    children: { items: ['item_confidential_file'] }
  }
},
items: {
  item_confidential_file: {
    id: 'item_confidential_file',
    name: 'Confidential File',
    capabilities: { readable: true, takable: true },
    stateDefaults: { isVisible: false },
    handlers: {
      onRead: {
        success: {
          message: 'Redacted notes on Silas Bloom and the murder case.',
          effects: [
            { type: 'SET_FLAG', flag: 'read_confidential_file', value: true }
          ]
        }
      }
    }
  }
}
```

**Test Sequence**:
```
1. move painting → obj_safe becomes visible
2. examine safe → "A locked wall safe"
3. unlock safe with small key → isLocked = false
4. open safe → item_confidential_file becomes visible
5. take file → added to inventory
6. read file → flag set
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('GameStateManager', () => {
  it('should apply REVEAL_ENTITY effect', () => {
    const state = createTestState();
    const effect = { type: 'REVEAL_ENTITY', entityId: 'obj_safe' };
    const result = GameStateManager.apply(effect, state);
    expect(result.state.world['obj_safe'].isVisible).toBe(true);
  });
});

describe('Validator', () => {
  it('should reject opening locked container', () => {
    const result = Validator.validate('open', 'obj_safe', state, game);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('It is locked.');
  });
});
```

### Integration Tests
```typescript
describe('Painting→Safe→File chain', () => {
  it('should reveal safe when painting moved', () => {
    const effects = handleMove('obj_painting', state, game);
    const result = GameStateManager.applyAll(effects, state);
    expect(GameStateManager.isEntityVisible(result.state, 'obj_safe')).toBe(true);
  });
});
```

### Manual Testing Checklist
- [ ] Move painting → safe appears
- [ ] Try to open locked safe → "It is locked"
- [ ] Unlock safe with wrong item → "Doesn't fit"
- [ ] Unlock safe with key → success
- [ ] Open safe → file appears
- [ ] Take file → added to inventory
- [ ] Read file → flag set
- [ ] Check objectives → updated

---

## Next Steps

1. **Complete Phase 2 tasks** (see "What Needs to Be Done")
2. **Test thoroughly** using the testing strategy above
3. **Migrate remaining objects** to new DSL format
4. **Document any issues** encountered during migration
5. **Update AI flows** to use AIContextBuilder
6. **Deploy to staging** for user testing

---

## Questions? Issues?

If you encounter problems during migration:
1. Check the type definitions in `src/lib/game/types.ts`
2. Review engine service docs in `src/lib/game/engine/`
3. Look at the painting→safe example above
4. Search for `TODO:` comments in the codebase

Remember: The new architecture makes the game **predictable, testable, and AI-safe**. All the hard work is worth it!

🤖 Generated with Claude Code
