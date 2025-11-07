# Handler Resolution and Media System

**Last Updated**: 2025-11-07
**Critical System Documentation**

## Overview

This document explains how the game engine resolves handlers and media for game entities. Understanding this system is **critical** to prevent breaking container states, conditional interactions, and media display.

---

## Handler Resolution System

### Handler Types

Handlers can be defined in two ways:

#### 1. Single Handler (Simple Case)

```typescript
onExamine: {
  conditions: [...],
  success: { message: "...", media: {...} },
  fail: { message: "..." }
}
```

#### 2. Conditional Handler Array (Complex Case)

```typescript
onExamine: [
  {
    // Most specific conditions first
    conditions: [
      { type: 'FLAG', flag: 'broken', value: true },
      { type: 'HAS_ITEM', itemId: 'key' }
    ],
    success: { message: "Empty cavity", media: { url: '...empty.png' } }
  },
  {
    // Less specific
    conditions: [{ type: 'FLAG', flag: 'broken', value: true }],
    success: { message: "Key inside", media: { url: '...with_key.png' } }
  },
  {
    // Default fallback (no conditions)
    conditions: [],
    success: { message: "Intact", media: { url: '...intact.png' } }
  }
]
```

### Resolution Process

When `HandlerResolver.getEffectiveHandler()` is called:

1. **Check stateMap overrides** (highest priority)
2. **Check entity.handlers**
3. **If handler is an array:**
   - Evaluate conditions in order
   - Return **first matching handler**
   - This is a **resolved single Rule**, not the array
4. **If handler is single:** Return as-is
5. **If no handler found:** Return undefined

**CRITICAL**: The resolver MUST return a single `Rule` or `undefined`, never a raw array.

### Code Location

- `src/lib/game/engine/HandlerResolver.ts`
  - `getEffectiveHandler()` - Main resolution entry point
  - `resolveHandler()` - Private method that evaluates conditional arrays

### Usage in Action Handlers

All action handlers must pass the `game` parameter to enable condition evaluation:

```typescript
// ✅ CORRECT
const handler = HandlerResolver.getEffectiveHandler(entity, 'examine', state, game);

// ❌ WRONG - Missing game parameter, conditions won't evaluate
const handler = HandlerResolver.getEffectiveHandler(entity, 'examine', state);
```

**Files that call getEffectiveHandler:**
- `src/lib/game/actions/handle-examine.ts` (3 locations)
- `src/lib/game/actions/handle-break.ts`
- `src/lib/game/actions/handle-search.ts`
- `src/lib/game/actions/handle-close.ts`
- `src/lib/game/actions/handle-move.ts`

---

## Media Resolution System

### Media Priority Order

When displaying a message with an image, the system resolves media in this priority:

#### 1. Explicit Outcome Media (Highest Priority)

```typescript
success: {
  message: "...",
  media: {
    url: 'https://...image.png',
    description: 'Image description',
    hint: 'Composition hint'
  }
}
```

**Used for:**
- State-specific images (container empty vs. full)
- Conditional appearances (broken vs. intact)
- Progressive states (reading stages)

**Example**: Coffee machine showing empty cavity after key is taken

#### 2. Random Fail Images (Fail Outcomes Only)

```typescript
// If fail outcome has no explicit media
game.systemMedia.actionFailed[random]
```

**Used for:** Generic failure states without custom media

#### 3. Entity-Based Resolution (Fallback)

```typescript
// Via imageId + imageEntityType in SHOW_MESSAGE effect
entity.media.images[currentStateId] || entity.media.image
```

**Used for:** Default entity display when no explicit media provided

### How It Works

1. **Handler resolution** (HandlerResolver.getEffectiveHandler)
   - Evaluates conditions
   - Returns single handler with explicit media

2. **Effect building** (buildEffectsFromOutcome)
   - Extracts media from resolved handler
   - Creates SHOW_MESSAGE effect with imageUrl OR imageId

3. **Message creation** (createMessage in GameStateManager)
   - If `imageUrl` provided: Use explicit URL
   - If `imageId` provided: Resolve via entity.media
   - Priority: explicit > entity-based

### Code Locations

- `src/lib/game/utils/outcome-helpers.ts`
  - `outcomeToMessageEffect()` - Converts outcome to SHOW_MESSAGE effect
  - `buildEffectsFromOutcome()` - Builds effects array in correct order

- `src/lib/game/engine/GameStateManager.ts`
  - `apply()` case 'SHOW_MESSAGE' - Creates message with media

- `src/lib/utils.ts`
  - `createMessage()` - Resolves entity-based images

---

## Common Use Cases

### Container States (Empty vs. Full)

**Problem**: Show different images based on whether item has been taken

**Solution**: Use conditional handler array with `HAS_ITEM` condition

```typescript
onExamine: [
  {
    // Item taken - show empty
    conditions: [
      { type: 'FLAG', flag: 'container_opened', value: true },
      { type: 'HAS_ITEM', itemId: 'item_key' }
    ],
    success: {
      message: "The safe is empty now.",
      media: { url: '...safe_empty.png' }
    }
  },
  {
    // Opened but item NOT taken - show with item
    conditions: [{ type: 'FLAG', flag: 'container_opened', value: true }],
    success: {
      message: "A key gleams inside.",
      media: { url: '...safe_with_key.png' }
    }
  },
  {
    // Default - closed
    conditions: [],
    success: {
      message: "A locked safe.",
      media: { url: '...safe_closed.png' }
    }
  }
]
```

**Order matters**: Most specific conditions first, default (empty conditions) last.

### Progressive Reading

**Problem**: Show different content on repeated reads

**Solution**: Use conditional handler array with read count or flags

```typescript
onRead: [
  {
    conditions: [{ type: 'FLAG', flag: 'document_read_twice', value: true }],
    success: {
      message: "You've memorized the important parts.",
      media: { url: '...document_known.png' }
    }
  },
  {
    conditions: [{ type: 'FLAG', flag: 'document_read_once', value: true }],
    success: {
      message: "You notice additional details...",
      media: { url: '...document_detailed.png' },
      effects: [{ type: 'SET_FLAG', flag: 'document_read_twice', value: true }]
    }
  },
  {
    conditions: [],
    success: {
      message: "First read text...",
      media: { url: '...document_first.png' },
      effects: [{ type: 'SET_FLAG', flag: 'document_read_once', value: true }]
    }
  }
]
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Make Local Fixes to Individual Objects

```typescript
// BAD: Removing explicit media from one object
onExamine: {
  success: {
    message: "Empty safe"
    // Missing media - will fall back to entity.media.images[currentStateId]
    // Wrong image might be shown!
  }
}
```

**Problem**: Breaks the handler resolution system for that specific object

### ❌ DON'T: Skip Game Parameter

```typescript
// BAD: Missing game parameter
const handler = HandlerResolver.getEffectiveHandler(object, 'examine', state);
// Without game, conditions can't be evaluated properly
```

**Problem**: Conditional handlers won't resolve correctly

### ❌ DON'T: Return Raw Handler Arrays

```typescript
// BAD: Custom action handler returning array without resolution
const handler = entity.handlers.onExamine; // Might be array!
if (handler?.success?.message) { // Won't work if handler is array!
  // ...
}
```

**Problem**: Arrays don't have `.success` property, media will be ignored

### ✅ DO: Use Explicit Media in Handlers

```typescript
// GOOD: Explicit media for each state
onExamine: [
  {
    conditions: [...],
    success: {
      message: "...",
      media: { url: '...state1.png' }  // Explicit!
    }
  },
  {
    conditions: [...],
    success: {
      message: "...",
      media: { url: '...state2.png' }  // Explicit!
    }
  }
]
```

**Benefit**: Media always shows correctly regardless of state

### ✅ DO: Order Conditions Specific to General

```typescript
// GOOD: Most specific first, default last
onExamine: [
  { conditions: [condition1, condition2], success: {...} },  // Both conditions
  { conditions: [condition1], success: {...} },              // One condition
  { conditions: [], success: {...} }                         // Default
]
```

**Benefit**: First matching handler is returned, specific cases handled first

---

## Testing Checklist

When modifying handler resolution or media systems, verify:

- [ ] Coffee machine shows empty cavity after key taken
- [ ] Wall safe shows empty after contents taken
- [ ] Drawer shows empty after items removed
- [ ] Containers show correct images at each state
- [ ] Progressive reading shows different content each time
- [ ] Broken objects show correct broken state images
- [ ] Door states (locked/unlocked/open) show correct images

---

## Related Files

**Core Engine:**
- `src/lib/game/engine/HandlerResolver.ts` - Handler resolution logic
- `src/lib/game/engine/GameStateManager.ts` - State management and message creation
- `src/lib/game/engine/Validator.ts` - Condition evaluation

**Utilities:**
- `src/lib/game/utils/outcome-helpers.ts` - Effect building and media extraction
- `src/lib/utils.ts` - Message creation and entity image resolution

**Action Handlers:**
- `src/lib/game/actions/handle-examine.ts`
- `src/lib/game/actions/handle-break.ts`
- `src/lib/game/actions/handle-search.ts`
- `src/lib/game/actions/handle-close.ts`
- `src/lib/game/actions/handle-move.ts`

---

## Version History

**2025-11-07**:
- Initial documentation after fixing conditional handler resolution bug
- Added `resolveHandler()` method to HandlerResolver
- Updated all action handlers to pass `game` parameter
- Fixed containers showing wrong media after items taken
- **CRITICAL FIX**: Removed NPC search from handle-goto.ts
  - NPCs are NOT zones/focus targets for navigation
  - Players interact with NPCs via TALK command, not GO TO
  - Only objects can be zone targets
  - This prevents "go to coffee machine" from focusing on Barista instead of Counter
- This documentation created to prevent future breakage
