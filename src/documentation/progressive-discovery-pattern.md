# Progressive Discovery Pattern: Parent-Child Object Visibility

**Status:** ✅ CRITICAL - DO NOT BREAK THIS PATTERN
**Last Updated:** 2025-12-10
**Applies To:** All Chapters (Chapter 0, Chapter 1, and future chapters)

---

## 🚨 WARNING: Engine Compatibility

This pattern is **deeply integrated** into the game engine. Any changes to this pattern require corresponding changes to:
- `/src/lib/game-state.ts` (initialization logic)
- `/src/lib/game/engine/VisibilityResolver.ts` (visibility queries)
- `/src/lib/game/engine/GameStateManager.ts` (REVEAL_FROM_PARENT effect)

**Breaking this pattern will break ALL chapters and set the project back 1-2 days of fixes.**

---

## Overview

The progressive discovery pattern controls what players see when they "look around" versus what they discover when examining objects. This creates a layered exploration experience:

1. **Initial "Look Around"**: Shows only parent/main objects (e.g., "Bus Stop", "Counter")
2. **After Examining Parent**: Reveals hidden children (e.g., "Bench", "Info Board", "Coffee Machine")

---

## The Pattern (Proven in Chapter 0 & Chapter 1)

### Parent Object Configuration

**REQUIRED CAPABILITIES:**
```typescript
{
  container: true,    // ← CRITICAL: Must be true
  openable: false,    // ← CRITICAL: Must be false
  // ... other capabilities as needed
}
```

**REQUIRED CHILDREN DEFINITION:**
```typescript
{
  children: {
    objects: ['obj_child_1', 'obj_child_2'] as GameObjectId[],
    items: ['item_child_1'] as ItemId[]  // Optional
  }
}
```

**REQUIRED REVEAL HANDLER:**
```typescript
{
  handlers: {
    onExamine: {
      message: "Description of parent object...",
      media: { /* ... */ },
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_child_1', parentId: 'obj_parent' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_child_2', parentId: 'obj_parent' }
      ]
    }
  }
}
```

### Child Object Configuration

**DO NOT SET:**
- ❌ `parentId` field on child object
- ❌ `revealMethod` field on child object
- ❌ `initialState` field on child object

**DO NOT INCLUDE:**
- ❌ Children in location's `objects[]` array

**ONLY SET:**
- ✅ Children in parent's `children.objects[]` array
- ✅ Reveal effects in parent's handler

---

## Complete Working Examples

### Example 1: Chapter 0 - Counter with Coffee Machine & Drawer

**File:** `/src/lib/game/cartridges/chapter-0.ts`

```typescript
// Parent Object: Counter
'obj_counter': {
  id: 'obj_counter' as GameObjectId,
  name: 'Counter',
  archetype: 'Furniture',
  description: 'A sleek wooden counter dividing the café from the back area.',

  // ✅ CORRECT CAPABILITIES
  capabilities: {
    openable: false,      // NOT openable
    container: true,      // IS a container
    lockable: false,
    breakable: false,
    movable: false,
    powerable: false,
    readable: false,
    inputtable: false
  },

  state: {
    isOpen: false,
    isLocked: false,
    isBroken: false,
    isPoweredOn: false,
    currentStateId: 'default'
  },

  // ✅ CHILDREN LISTED HERE
  children: {
    objects: ['obj_coffee_machine', 'obj_drawer'] as GameObjectId[]
  },

  // ✅ REVEAL EFFECTS IN HANDLER
  handlers: {
    onExamine: [
      {
        conditions: [
          { type: 'NOT_HAS_FLAG', flag: 'counter_examined' }
        ],
        success: {
          message: 'The counter is well-organized...',
          media: { /* ... */ },
          effects: [
            { type: 'SET_FLAG', flag: 'counter_examined', value: true },
            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_drawer', parentId: 'obj_counter' },
            { type: 'REVEAL_FROM_PARENT', entityId: 'obj_coffee_machine', parentId: 'obj_counter' }
          ]
        }
      }
    ]
  },
  version: { schema: '1.0.0', content: '1.0.0' }
}

// Child Object: Coffee Machine
'obj_coffee_machine': {
  id: 'obj_coffee_machine' as GameObjectId,
  name: 'Coffee Machine',
  archetype: 'Appliance',
  description: 'A commercial espresso machine.',

  // ✅ NO parentId, revealMethod, or initialState

  capabilities: { /* ... */ },
  state: { /* ... */ },
  handlers: { /* ... */ },
  version: { schema: '1.0.0', content: '1.0.0' }
}

// Child Object: Drawer
'obj_drawer': {
  id: 'obj_drawer' as GameObjectId,
  name: 'Drawer',
  archetype: 'Container',
  description: 'A wooden drawer built into the counter.',

  // ✅ NO parentId, revealMethod, or initialState

  capabilities: {
    openable: true,   // Drawer itself can be opened
    container: true,  // Drawer is also a container (2-level nesting!)
    /* ... */
  },
  state: { /* ... */ },
  children: {
    items: ['item_sd_card'] as ItemId[]  // Drawer has its own children
  },
  handlers: { /* ... */ },
  version: { schema: '1.0.0', content: '1.0.0' }
}
```

**Location Configuration:**
```typescript
const locations: Record<LocationId, Location> = {
  'loc_cafe_interior': {
    objects: [
      'obj_counter',      // ✅ ONLY parent in location
      // ❌ NOT 'obj_coffee_machine' or 'obj_drawer'
      'obj_table',
      'obj_bookshelf'
      // ... other parent objects
    ]
  }
}
```

---

### Example 2: Chapter 1 - Bus Stop with Bench, Info Board, Sign

**File:** `/src/lib/game/cartridges/chapter-1.ts`

```typescript
// Parent Object: Bus Stop
'obj_bus_stop': {
  id: 'obj_bus_stop' as GameObjectId,
  name: 'Bus Stop',
  archetype: 'Structure',
  description: 'The bus stop where Lili Chen was last seen...',

  // ✅ CORRECT CAPABILITIES
  capabilities: {
    openable: false,      // NOT openable
    container: true,      // IS a container
    lockable: false,
    breakable: false,
    movable: false,
    powerable: false,
    readable: false,
    inputtable: false
  },

  state: {
    isOpen: false,
    isLocked: false,
    isBroken: false,
    isPoweredOn: false,
    currentStateId: 'default'
  },

  // ✅ CHILDREN LISTED HERE
  children: {
    items: [],
    objects: ['obj_bench', 'obj_info_board', 'obj_bus_sign'] as GameObjectId[]
  },

  // ✅ REVEAL EFFECTS IN HANDLER
  handlers: {
    onExamine: {
      message: 'The bus stop stands under a rusted metal shelter...',
      media: {
        url: 'https://placeholder-bus-stop.jpg',
        description: 'Bus stop with bench, bin, and information board',
        hint: 'crime scene location'
      },
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_bench', parentId: 'obj_bus_stop' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_info_board', parentId: 'obj_bus_stop' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_bus_sign', parentId: 'obj_bus_stop' }
      ]
    }
  },
  version: { schema: '1.0.0', content: '1.0.0' }
}

// Child Object: Bench
'obj_bench': {
  id: 'obj_bench' as GameObjectId,
  name: 'Bench',
  archetype: 'Furniture',
  description: 'A weathered wooden bench...',

  // ✅ NO parentId, revealMethod, or initialState

  capabilities: {
    movable: true,    // Bench can be moved (different mechanic)
    container: false,
    /* ... */
  },
  state: { /* ... */ },
  children: {
    items: ['item_invoice'] as ItemId[]  // Bench has child items
  },
  handlers: { /* ... */ },
  version: { schema: '1.0.0', content: '1.0.0' }
}

// Child Object: Info Board (which itself has children!)
'obj_info_board': {
  id: 'obj_info_board' as GameObjectId,
  name: 'Info Board',
  archetype: 'Readable',
  description: 'A plastic-covered information board...',

  // ✅ NO parentId, revealMethod, or initialState

  // ✅ Info Board is ALSO a container with children
  capabilities: {
    openable: false,
    container: true,    // IS a container (2-level nesting!)
    readable: true,
    /* ... */
  },
  state: { /* ... */ },
  children: {
    objects: ['obj_missing_poster'] as GameObjectId[]
  },
  handlers: {
    onExamine: {
      message: 'The information board...',
      media: { /* ... */ }
      // Note: Missing poster reveals automatically when info_board is revealed
    }
  },
  version: { schema: '1.0.0', content: '1.0.0' }
}

// Grandchild Object: Missing Poster
'obj_missing_poster': {
  id: 'obj_missing_poster' as GameObjectId,
  name: 'Missing Poster',
  archetype: 'Readable',
  description: 'A freshly printed missing person poster...',

  // ⚠️ EXCEPTION: Grandchildren can have metadata
  // (But this doesn't affect initialization - parent container status does)
  parentId: 'obj_info_board' as GameObjectId,
  revealMethod: 'REVEAL_FROM_PARENT',

  capabilities: { /* ... */ },
  handlers: { /* ... */ },
  version: { schema: '1.0.0', content: '1.0.0' }
}
```

**Location Configuration:**
```typescript
const locations: Record<LocationId, Location> = {
  'loc_street': {
    objects: [
      'obj_bus_stop',           // ✅ ONLY parent in location
      // ❌ NOT 'obj_bench', 'obj_info_board', or 'obj_bus_sign'
      'obj_gray_building_door',
      'obj_florist_shop'
      // ... other parent objects
    ]
  }
}
```

---

## How It Works: Under the Hood

### 1. Initialization Phase (`/src/lib/game-state.ts`)

When a new player state is created, the `getInitialState()` function:

```typescript
// Simplified logic from game-state.ts lines 19-112
for (const gameObjectId in game.gameObjects) {
  const gameObject = game.gameObjects[gameObjectId];

  let isHiddenChild = false;

  // Check if this object is listed in ANY parent's children array
  for (const parentObjId in game.gameObjects) {
    const parentObj = game.gameObjects[parentObjId];

    if (parentObj.children?.objects?.includes(gameObject.id)) {
      // Found parent relationship

      // CRITICAL CHECK: Is parent a non-openable container?
      if (parentObj.capabilities?.container && !parentObj.capabilities?.openable) {
        isHiddenChild = true;  // ← HIDE THIS CHILD
      }
    }
  }

  // Set initial visibility
  world[gameObject.id] = {
    isVisible: !isHiddenChild,  // false if hidden child, true otherwise
    // ... other properties
  };
}
```

**Result:**
- **Parent objects** (Bus Stop, Counter): `isVisible: true` ✅
- **Child objects** (Bench, Coffee Machine): `isVisible: false` ✅

### 2. Runtime Reveal (`/src/lib/game/engine/GameStateManager.ts`)

When the player examines the parent object, the `REVEAL_FROM_PARENT` effect:

```typescript
// From GameStateManager.ts lines 250-270
case 'REVEAL_FROM_PARENT':
  if (!newState.world[effect.entityId]) {
    newState.world[effect.entityId] = {};
  }

  // Make child visible
  newState.world[effect.entityId].isVisible = true;
  newState.world[effect.entityId].discovered = true;
  newState.world[effect.entityId].revealedBy = effect.parentId;
  newState.world[effect.entityId].parentId = effect.parentId;

  // Add to parent's containedEntities for runtime tracking
  if (!newState.world[effect.parentId].containedEntities) {
    newState.world[effect.parentId].containedEntities = [];
  }
  newState.world[effect.parentId].containedEntities.push(effect.entityId);
  break;
```

### 3. Visibility Query (`/src/lib/game/engine/VisibilityResolver.ts`)

When displaying "look around" results:

```typescript
// From VisibilityResolver.ts lines 49-90 (simplified)
for (const objectId in game.gameObjects) {
  const obj = game.gameObjects[objectId];

  // Check if in location's objects array
  const isInLocation = currentLocation.objects?.includes(objectId);

  // Check if revealed via effect
  const entityState = GameStateManager.getEntityState(state, objectId);
  const hasBeenRevealed = entityState.isVisible === true;

  // Include if in location OR revealed
  if (isInLocation || hasBeenRevealed) {
    const isAccessible = GameStateManager.isAccessible(state, game, objectId);

    if (isAccessible) {
      visibleObjects.push(objectId);
    }
  }
}
```

**Result:**
- **Before examining parent**: Only parent is `isInLocation: true`, children are `isVisible: false`
- **After examining parent**: Children become `isVisible: true` via REVEAL_FROM_PARENT effect

---

## Multi-Level Nesting (2+ Levels)

The pattern supports multiple levels of nesting:

```
Bus Stop (parent, container: true)
  ├─ Info Board (child & parent, container: true)
  │    └─ Missing Poster (grandchild)
  ├─ Bench (child & parent, movable, container: false)
  │    └─ Invoice (grandchild item)
  └─ Bus Sign (child only)
```

**Rules for nested levels:**
1. **Each level** that has children must be `container: true, openable: false`
2. **Each level** must have `REVEAL_FROM_PARENT` effects in its handler
3. **Grandchildren** can have `parentId`/`revealMethod` metadata (optional, doesn't affect initialization)

---

## Common Mistakes & Fixes

### ❌ Mistake 1: Parent Not Marked as Container

```typescript
// WRONG - children will be visible immediately
'obj_bus_stop': {
  capabilities: {
    container: false,  // ❌ WRONG
    openable: false
  },
  children: {
    objects: ['obj_bench', 'obj_info_board']
  }
}
```

**Fix:** Set `container: true`

```typescript
// CORRECT
'obj_bus_stop': {
  capabilities: {
    container: true,   // ✅ CORRECT
    openable: false
  },
  children: {
    objects: ['obj_bench', 'obj_info_board']
  }
}
```

---

### ❌ Mistake 2: Parent Marked as Openable

```typescript
// WRONG - children will be visible immediately if parent is "open"
'obj_bus_stop': {
  capabilities: {
    container: true,
    openable: true     // ❌ WRONG (for zone parents)
  }
}
```

**Fix:** Set `openable: false` for zone/structure parents. Use `openable: true` only for actual containers like drawers/safes.

```typescript
// CORRECT for zone parents
'obj_bus_stop': {
  capabilities: {
    container: true,
    openable: false    // ✅ CORRECT
  }
}

// CORRECT for actual containers
'obj_drawer': {
  capabilities: {
    container: true,
    openable: true     // ✅ CORRECT (player must open drawer)
  }
}
```

---

### ❌ Mistake 3: Children in Location's Objects Array

```typescript
// WRONG
const locations: Record<LocationId, Location> = {
  'loc_street': {
    objects: [
      'obj_bus_stop',
      'obj_bench',        // ❌ WRONG - child in location array
      'obj_info_board'    // ❌ WRONG - child in location array
    ]
  }
}
```

**Fix:** Remove children from location array

```typescript
// CORRECT
const locations: Record<LocationId, Location> = {
  'loc_street': {
    objects: [
      'obj_bus_stop'      // ✅ CORRECT - only parent
    ]
  }
}
```

---

### ❌ Mistake 4: Missing REVEAL_FROM_PARENT Effects

```typescript
// WRONG - children defined but no reveal handler
'obj_bus_stop': {
  children: {
    objects: ['obj_bench', 'obj_info_board']
  },
  handlers: {
    onExamine: {
      message: 'The bus stop...',
      // ❌ NO EFFECTS - children will remain hidden forever!
    }
  }
}
```

**Fix:** Add reveal effects

```typescript
// CORRECT
'obj_bus_stop': {
  children: {
    objects: ['obj_bench', 'obj_info_board']
  },
  handlers: {
    onExamine: {
      message: 'The bus stop...',
      effects: [
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_bench', parentId: 'obj_bus_stop' },
        { type: 'REVEAL_FROM_PARENT', entityId: 'obj_info_board', parentId: 'obj_bus_stop' }
      ]  // ✅ CORRECT
    }
  }
}
```

---

## Testing Checklist

When implementing this pattern for a new chapter:

- [ ] Parent has `container: true, openable: false`
- [ ] Parent has `children.objects[]` array populated
- [ ] Parent has `REVEAL_FROM_PARENT` effects in `onExamine` handler
- [ ] Children do NOT have `parentId`, `revealMethod`, or `initialState` fields
- [ ] Children are NOT in location's `objects[]` array
- [ ] After `npm run db:bake && npm run db:seed:game`:
  - [ ] "Look around" shows ONLY parent objects
  - [ ] "Examine [parent]" reveals children
  - [ ] Children now appear in "look around" output
- [ ] Test Chapter 0 still works (regression test)

---

## Related Files

**Core Engine Files (DO NOT MODIFY WITHOUT CAREFUL REVIEW):**
- `/src/lib/game-state.ts` - Initial visibility logic
- `/src/lib/game/engine/VisibilityResolver.ts` - Visibility queries
- `/src/lib/game/engine/GameStateManager.ts` - REVEAL_FROM_PARENT effect

**Chapter Cartridge Files:**
- `/src/lib/game/cartridges/chapter-0.ts` - Reference implementation
- `/src/lib/game/cartridges/chapter-1.ts` - Second implementation

**Baked JSON (Generated, verify after changes):**
- `/src/lib/game/cartridges/baked/chapter-0.json`
- `/src/lib/game/cartridges/baked/chapter-1.json`

---

## Historical Context

**Issue Discovered:** 2025-12-10
**Symptoms:** Chapter 1 showed all child objects (Bench, Info Board, Bus Sign) immediately on "look around" instead of hiding them until parent examination.

**Root Cause:** Chapter 1's parent objects had `container: false`, while Chapter 0's parent objects had `container: true`. The initialization logic in `game-state.ts` only hides children when their parent is a non-openable container.

**Resolution:** Changed `obj_bus_stop` and `obj_info_board` to have `container: true` to match Chapter 0's pattern.

**Lesson Learned:** The `container` capability is not just for actual containers (drawers, boxes) - it's also the mechanism for controlling progressive discovery of zone children. All parent objects with children must be containers, even if conceptually they're structures or areas.

---

## Future Considerations

**If you need to change this pattern in the future:**

1. **Document the reason** - Why does the current pattern not work?
2. **Update ALL chapters** - Test Chapter 0, Chapter 1, and all future chapters
3. **Update engine files** - Modify initialization, visibility, and effect handling
4. **Add migration logic** - Handle existing player states with old pattern
5. **Budget 1-2 days** for testing and bug fixes across all chapters

**This pattern is LOAD-BEARING architecture. Treat with extreme caution.**
