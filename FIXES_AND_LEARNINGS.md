# Critical Fixes and Architectural Learnings

## The Secret to Success: Effect System Architecture

### Core Principle
**ALWAYS use `buildEffectsFromOutcome()` instead of `outcomeToMessageEffect()`**

The effect system is the heart of the game. When handlers return outcomes, those outcomes contain:
1. Message text
2. Media (images/videos)
3. **Effects array** (state changes, reveals, flags)

### The Bug That Broke Everything

**Problem:** `outcomeToMessageEffect()` only extracts message + media, **ignoring the effects array**.

**Impact:** All handler effects were silently dropped. This broke:
- Progressive content (stateMap with readCount)
- Container reveals (bookshelf not revealing books)
- Cascading effects (examine → reveal → open)

**Files Fixed:**
- `handle-examine.ts` - 3 locations (items in inventory, visible items, objects)
- `handle-take.ts` - 2 locations (fail/success outcomes)

**The Fix:**
```typescript
// WRONG - drops effects
effects.push(outcomeToMessageEffect(outcome, id, type));

// CORRECT - includes all effects
effects.push(...buildEffectsFromOutcome(outcome, id, type));
```

---

## State Management: Unified World Architecture ✅ IMPLEMENTED

### The Problem: Dual State System

**Before (BROKEN):**
```typescript
state.objectStates[id]  // Legacy store for objects
state.itemStates[id]    // Legacy store for items
state.npcStates[id]     // Legacy store for NPCs
state.portalStates[id]  // Legacy store for portals
state.locationStates[id] // Legacy store for locations
state.world[entityId]   // NEW unified store
```

**Issues:**
- Code reading from `state.world` but writing to legacy stores
- Read/write mismatches (readCount bug)
- Confusion about which store to use
- Duplicate initialization code
- Hard to maintain

### The Solution: Single Source of Truth

**After (FIXED):**
```typescript
state.world[entityId]   // ONLY store - all entities, all state
```

**All helper functions now use unified state:**
- `getLiveGameObject()` → reads from `GameStateManager.getEntityState(state, id)`
- `getLiveItem()` → reads from `GameStateManager.getEntityState(state, id)`
- `getLiveNpc()` → reads from `GameStateManager.getEntityState(state, id)`
- `findItemInContext()` → filters by `state.world[id].isVisible`

**Files Updated:**
1. `/src/lib/game/actions/helpers.ts` - All helpers use world state
2. `/src/lib/game/utils/helpers.ts` - All helpers use world state
3. `/src/lib/game/actions/process-effects.ts` - Removed 80+ lines of legacy effect handling
4. `/src/lib/game-state.ts` - Legacy stores now empty placeholders

**Legacy stores completely removed:**
```typescript
// ❌ DELETED - No longer in codebase
// state.objectStates - REMOVED
// state.itemStates - REMOVED
// state.npcStates - REMOVED
// state.portalStates - REMOVED
// state.locationStates - REMOVED
```

### Benefits

✅ **Single source of truth** - No read/write mismatches possible
✅ **Simpler code** - One place to look for entity state
✅ **Type safety** - EntityRuntimeState covers all entities
✅ **Less initialization** - Removed 100+ lines of duplicate init code
✅ **Future-proof** - New entity types automatically supported

### Usage Pattern

```typescript
// ✅ CORRECT - Use world state
const entityState = GameStateManager.getEntityState(state, entityId);
if (entityState.isVisible) { ... }

// ❌ WRONG - Don't use legacy stores
const objectState = state.objectStates[objectId]; // DEPRECATED!
```

---

## Name Matching: Preventing False Positives

### The "art" vs "article" Bug

**Problem:** Substring matching was too aggressive. "art" (3 chars) matched "article" (7 chars).

**Fix:** Require BOTH strings to be ≥4 chars for substring matching (OR exact match).

**File:** `src/lib/game/utils/name-matching.ts`

```typescript
// Prevent tiny substring matches
if (normalizedAltWord.length >= 4 && searchName.length >= 4) {
    if (normalizedAltWord.includes(searchName) || searchName.includes(normalizedAltWord)) {
        hasWordMatch = true;
    }
}
```

---

## Container Visibility: The Parent-Child Access Pattern

### The Bookshelf Pattern

Containers must follow this exact pattern to work correctly:

```typescript
{
    capabilities: {
        container: true,    // Has children
        openable: false,    // Can't be opened (open shelving)
    },
    state: {
        isOpen: false,      // Start closed (hidden)
    },
    children: {
        items: ['item_book1', 'item_book2']
    },
    handlers: {
        onExamine: {
            success: {
                message: "You see books...",
                effects: [
                    { type: 'SET_ENTITY_STATE', entityId: 'obj_bookshelf', patch: { isOpen: true } },
                    { type: 'REVEAL_ENTITY', entityId: 'item_book1' },
                    { type: 'REVEAL_ENTITY', entityId: 'item_book2' }
                ]
            }
        }
    }
}
```

**Why this works:**
1. `container: true` + `isOpen: false` → children exist but not accessible
2. Examine → sets `isOpen: true` → `parentGrantsAccess` returns true
3. Examine → reveals children → `isVisible: true`
4. Both conditions met → children appear in `getVisibleEntities()`

**Critical Rule:** For movable objects with children (like chalkboard):
- Use `movable: true, container: false`
- Effects must set `isMoved: true` (not `isOpen`)

---

## Progressive Content: StateMap System

### How Progressive Reading Works

```typescript
// Item definition
{
    stateMap: {
        'read0': { description: "First read..." },
        'read1': { description: "Second read..." },
        'read2': { description: "Third read..." }
    }
}
```

**Handler Logic (in `handle-read.ts`):**
1. Get current `readCount` from `state.world[itemId]`
2. Use readCount as index into stateMap
3. Show `stateMap[readCount].description`
4. Return `INCREMENT_ITEM_READ_COUNT` effect
5. `process-effects.ts` increments `state.world[itemId].readCount`

**Key Point:** Do NOT add conflicting `onRead` handlers. Use stateMap OR onRead, never both.

---

## AI Prompt Engineering: Multi-Object Commands

### The Problem
AI was stripping out tool references: "read sd card on phone" → "read sd card"

### The Fix
**File:** `src/lib/game/cartridge.ts` (promptContext)

```
**CRITICAL - You MUST NOT Block Valid Commands:**
- Your ONLY job is translating natural language → game commands
- If the player mentions an object name from the Visible Names lists, you MUST translate it to a command
- DO NOT block commands because objects are "inside containers" - the game engine handles this
- DO NOT block commands because you think they "won't work" - let the engine decide
- DO NOT give helpful suggestions like "try examining X instead" - just translate what they asked for

Examples:
- "check SD card" → examine "SD Card" ✓ (even if inside something)
- "read sd card on phone" → read "SD Card" on "Phone" ✓
- "read book The Art of the Deal" → read "The Art of the Deal" ✓ (strip "book")
```

**Lesson:** Be EXPLICIT about what the AI should NOT do. Give concrete examples.

---

## Architecture Insights

### Item vs Object Separation

**Keep the types separate** (semantic clarity), but:
- Use ONE state store: `state.world[entityId]`
- Remove `itemStates` and `objectStates` entirely
- Helper: `getEntity(id, game)` abstracts the lookup

**Why separate types matter:**
- "Item" = portable concept (goes in inventory)
- "Object" = world fixture (stays in location)
- This distinction is meaningful in adventure games

**Why unified state matters:**
- No read/write mismatches (like readCount bug)
- Simpler code (one place to look)
- Already used by GameStateManager

---

## Development Commands Reference

### Baking and Seeding
```bash
npm run db:bake       # Convert cartridge.ts → cartridge.json
npm run db:seed       # Bake + seed entire database (game + user + player state)
npm run db:seed:game  # Bake + seed only game data (no user/state)
```

**Important:** In development mode (`NEXT_PUBLIC_NODE_ENV === 'development'`), the app loads from `cartridge.ts` directly, NOT from Firestore. Baking is only needed for production deployment.

---

## Testing Checklist

When adding new interactive objects, verify:

- [ ] Handler uses `buildEffectsFromOutcome()` (not `outcomeToMessageEffect`)
- [ ] Container children have correct `container` + `isOpen` + reveal effects
- [ ] Progressive content uses stateMap (no conflicting onRead handler)
- [ ] State writes to `state.world[entityId]` (not itemStates/objectStates)
- [ ] Name matching tested with short words (≥4 char rule)
- [ ] AI prompt has examples for this object pattern

---

## Future-Proofing

### Effect-Driven Design

The effect system enables powerful patterns:

**Progressive Reveals:**
```typescript
// Hit machine 3 times → breaks open
onUse: [{
    itemId: 'item_pipe',
    success: {
        message: "Third hit shatters it!",
        effects: [
            { type: 'SET_ENTITY_STATE', entityId: 'obj_machine', patch: { isBroken: true } },
            { type: 'REVEAL_ENTITY', entityId: 'item_hidden_key' }
        ]
    }
}]
```

**Cascading Effects:**
```typescript
onExamine: {
    success: {
        message: "You find a hidden compartment!",
        effects: [
            { type: 'REVEAL_ENTITY', entityId: 'obj_compartment' },
            { type: 'SET_ENTITY_STATE', entityId: 'obj_compartment', patch: { isOpen: true } },
            { type: 'REVEAL_ENTITY', entityId: 'item_document' }
        ]
    }
}
```

**The Rule:** If it changes game state, it's an effect. Always include it in the effects array.

---

## Conditional Handler Arrays: The Universal Pattern

### Two Types of Handler Arrays

The game engine supports TWO distinct array patterns for handlers:

#### 1. ItemId-Based Arrays (Tool/Item Matching)
Used for "use X on Y" or "examine X with Y" commands where handler selection depends on **which item** is being used.

```typescript
onUse: [
    {
        itemId: 'item_sd_card',
        conditions: [...],
        success: { message: "You insert the SD card...", effects: [...] }
    },
    {
        itemId: 'item_iron_pipe',
        conditions: [...],
        success: { message: "You smash it with the pipe...", effects: [...] }
    }
]
```

**Implementation**: Handler code uses `.find(h => h.itemId === itemId)` to select handler.

**Where used**: `handle-use.ts`, `handle-examine.ts` (for two-item commands)

#### 2. Conditional State Arrays (Progressive/State-Based)
Used for **state-based branching** where handler selection depends on entity state, flags, or game conditions. First matching condition wins.

```typescript
onOpen: [
    {
        // Case 1: Already open
        conditions: [{ type: 'STATE', entityId: 'door', key: 'isOpen', equals: true }],
        success: { message: "Door's already open.", effects: [] }
    },
    {
        // Case 2: Unlocked but not opened (THE BIG REVEAL)
        conditions: [
            { type: 'STATE', entityId: 'door', key: 'isLocked', equals: false },
            { type: 'STATE', entityId: 'door', key: 'isOpen', equals: false }
        ],
        success: { message: "You grip the handle. Pull...", effects: [...] }
    },
    {
        // Case 3: Still locked
        conditions: [{ type: 'STATE', entityId: 'door', key: 'isLocked', equals: true }],
        success: { message: "Need PASSWORD first.", effects: [] }
    }
]
```

**Implementation**: Use helper functions `resolveConditionalHandler()` and `evaluateHandlerOutcome()`.

**Where used**: `handle-read.ts` (progressive reading), `handle-open.ts` (door states)

### Universal Helper Functions

To avoid code duplication, use these helpers from `src/lib/game/utils/outcome-helpers.ts`:

```typescript
import { resolveConditionalHandler, evaluateHandlerOutcome, buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";

// Step 1: Resolve handler (handles both arrays and single handlers)
const handler = resolveConditionalHandler(entity.handlers?.onAction, state, game);

if (handler) {
    // Step 2: Evaluate conditions to get success/fail outcome
    const outcome = evaluateHandlerOutcome(handler, state, game);

    if (outcome) {
        // Step 3: Build effects (includes message + state changes)
        return buildEffectsFromOutcome(outcome, entityId, entityType);
    }
}
```

**Benefits**:
- Works with single handlers OR arrays
- Automatically evaluates conditions
- Handles success/fail branching
- Reduces handler code from ~75 lines to ~10 lines

### When to Use Conditional Arrays

Use conditional state arrays when:
- Entity has **multiple states** (locked/unlocked/open, damaged/broken, powered on/off)
- Content is **progressive** (read book multiple times, each read shows different text)
- Behavior changes based on **game flags** or **other entity states**

**Example Use Cases**:
- Door: locked → unlocked → opened (3 states)
- Book: first read → second read → third read drops note (progressive)
- Machine: off → on with password → broken after use (state progression)

### Adding to New Handlers

When creating new action handlers that might need state-based branching:

1. **Import the helpers**:
   ```typescript
   import { resolveConditionalHandler, evaluateHandlerOutcome, buildEffectsFromOutcome } from "@/lib/game/utils/outcome-helpers";
   ```

2. **Use the pattern**:
   ```typescript
   const handler = resolveConditionalHandler(entity.handlers?.onYourAction, state, game);
   if (handler) {
       const outcome = evaluateHandlerOutcome(handler, state, game);
       if (outcome) {
           return buildEffectsFromOutcome(outcome, entityId, entityType);
       }
   }
   ```

3. **Fallback**: If no handler matches, use generic behavior.

**Current handlers with conditional array support**:
- ✅ `handle-read.ts` - Progressive reading
- ✅ `handle-open.ts` - Multi-state doors/containers
- ✅ `handle-use.ts` - ItemId-based (different pattern)
- ✅ `handle-examine.ts` - ItemId-based for two-item commands (different pattern)

**Handlers that may benefit in future**:
- `handle-move.ts` - Conditional move based on flags/state
- `handle-take.ts` - Conditional take based on conditions
- `handle-break.ts` - Progressive breaking (hit once, twice, breaks on third)
- `handle-search.ts` - Progressive search (find different things on repeated searches)
- `handle-close.ts` - Conditional close based on state

---

## Credits

### Session 1: Initial Fixes (2025-11-04)
- Name matching substring protection
- Effect system buildEffectsFromOutcome migration
- Container visibility parent-child pattern
- Progressive content readCount fix
- AI prompt multi-object command handling

### Session 2: Architectural Improvements (2025-11-05)
- **Unified State Architecture**: Migrated all state to `state.world[entityId]`
- **Legacy Code Removal**: Completely removed all 5 legacy state stores
- **Conditional Handler Arrays**: Created `resolveConditionalHandler()` helper
- **Door Two-Step Reveal**: Fixed password unlock → open sequence
- **Code Reduction**: Removed 200+ lines of duplicate/legacy code
- **Helper Functions**: All now use GameStateManager.getEntityState()
- **Type Safety**: Removed deprecated fields from PlayerState interface
- **Documentation**: Comprehensive pattern documentation added

#### Breaking Changes
⚠️ **Database Reseed Required**: Saved player states with old structure will not work.
Run: `npm run db:seed` to reinitialize the database with clean unified state.
