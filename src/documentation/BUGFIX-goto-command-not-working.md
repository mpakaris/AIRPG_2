# BUGFIX: "Go To" Command Not Working in New Chapters

**Date**: 2025-12-11
**Affected**: Chapter 1 (and potentially all future chapters)
**Status**: FIXED
**Time Lost**: ~4 hours of debugging

## Problem Summary

When implementing Chapter 1, the "go to [object]" command was failing with "You can't go there" even though:
- Objects were visible in "Look Around"
- `alternateNames` arrays were added to objects
- Name matching was working correctly

## Root Causes

### Bug #1: Cross-Location Visibility (VisibilityResolver.ts)
**File**: `src/lib/game/engine/VisibilityResolver.ts:64-65`

**Buggy Code**:
```typescript
// WRONG - Makes ANY revealed object visible in ALL locations
if (isInLocation || hasBeenRevealed) {
```

**Fixed Code**:
```typescript
// CORRECT - Objects only visible in their current location
if (isInLocation) {
```

**Why This Happened**: The `||` operator made objects visible globally once revealed, breaking location boundaries. The `getAccessibleChildren()` function handles revealing child objects, so the `hasBeenRevealed` check was redundant and harmful.

**Symptoms**:
- Objects from other locations appearing in "Look Around"
- Detective's Desk (Chapter 0) showing in Elm Street (Chapter 1)
- Garage doors from Courtyard showing before player discovered them

---

### Bug #2: Wrong Property Name in Location Search (handle-go.ts)
**File**: `src/lib/game/actions/handle-go.ts:23`

**Buggy Code**:
```typescript
if (entityType === 'object' && location.gameObjects?.includes(entityId as GameObjectId)) {
```

**Fixed Code**:
```typescript
if (entityType === 'object' && location.objects?.includes(entityId as GameObjectId)) {
```

**Why This Happened**: The Location type uses `objects: GameObjectId[]` (see `types.ts:929`), NOT `gameObjects`. The code was checking a property that doesn't exist, so `location.gameObjects` was always `undefined`, causing the function to always return `undefined`.

**Symptoms**:
- "Go to" command always failing with "You can't go there"
- `findLocationContaining()` never finding objects
- AI interpretation working correctly, but handler failing

---

### Bug #3: Unnecessary Location Transition (handle-go.ts)
**File**: `src/lib/game/actions/handle-go.ts:158-190`

**Problem**: When the AI routed "go to bus stop" to `handle-go.ts` (location navigation) instead of `handle-goto.ts` (object focus navigation), the code tried to do a location transition even when already in the same location.

**Fixed Code**:
```typescript
// Only do location transition if moving to a DIFFERENT location
if (locationWithEntity.locationId !== state.currentLocationId) {
    effects.push(
        { type: 'MOVE_TO_LOCATION', toLocationId: locationWithEntity.locationId },
        { type: 'END_CONVERSATION' },
        { type: 'END_INTERACTION' },
        { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(locationWithEntity.name) },
        createLocationMessage(locationWithEntity)
    );
}

// Set focus on the object with transition narration
if (entityType === 'object') {
    const targetObject = game.gameObjects[entityId as GameObjectId];
    if (targetObject) {
        const { FocusResolver } = await import('@/lib/game/engine/FocusResolver');
        const transitionMessage = FocusResolver.getTransitionNarration(entityId as GameObjectId, 'object', state, game);

        effects.push({
            type: 'SET_FOCUS',
            focusId: entityId as GameObjectId,
            focusType: 'object',
            transitionMessage: transitionMessage || undefined
        });
    }
}
```

**Why This Fix Works**: The `handle-go.ts` fallback now behaves like `handle-goto.ts` when navigating to objects in the same location - it just sets focus without unnecessary location transitions.

---

## Required Setup for New Chapters

When creating a new chapter, you MUST:

### 1. Add `alternateNames` to ALL Objects
**Every** game object needs an `alternateNames` array for robust name matching.

```typescript
'obj_bus_stop': {
    id: 'obj_bus_stop' as GameObjectId,
    name: 'Bus Stop',
    alternateNames: ['bus stop', 'bus station', 'stop', 'shelter', 'bus shelter'],
    // ... rest of object
}
```

**Why**: The name matching engine (`FocusResolver.matchesName()` and `matchesName()` in `name-matching.ts`) relies on `alternateNames` for fuzzy matching.

### 2. Add `transitionTemplates` to Locations
Add 10 canned transition messages to each location for variety.

```typescript
const locations: Record<LocationId, Location> = {
    'loc_street': {
        locationId: 'loc_street' as LocationId,
        name: 'Elm Street',
        // ... other properties
        transitionTemplates: [
            'You walk down Elm Street toward the {entity}. The afternoon sun casts long shadows across the pavement.',
            'You move carefully toward the {entity}, scanning the surroundings. This is where she vanished.',
            'Your footsteps echo on the quiet street as you approach the {entity}. No one seems to notice you.',
            // ... 7 more templates (10 total)
        ]
    }
};
```

**Why**: `FocusResolver.getTransitionNarration()` picks a random template from this array to make navigation feel dynamic and atmospheric.

### 3. Verify Location Property Names
The Location type uses:
- `objects: GameObjectId[]` ✅ (NOT `gameObjects`)
- `npcs: NpcId[]` ✅
- `items: ItemId[]` ✅ (if applicable)

**Always use the correct property names!**

---

## Testing Checklist

Before considering a chapter complete, test these scenarios:

### ✅ Visibility Tests
- [ ] "look around" only shows objects in current location
- [ ] No objects from other locations/chapters appearing
- [ ] Child objects hidden until parent examined (progressive discovery)

### ✅ Navigation Tests
- [ ] "go to [object]" works for all main objects
- [ ] "goto [object]" works for all main objects
- [ ] "move to [object]" works for all main objects
- [ ] Focus changes correctly when navigating
- [ ] Transition messages are varied and atmospheric (not always the same)

### ✅ Name Matching Tests
- [ ] Object name variations work (e.g., "bus stop", "stop", "shelter")
- [ ] Child object names work (e.g., "drawer" when parent is "counter")
- [ ] Case-insensitive matching works

---

## Files Changed in This Fix

1. **src/lib/game/engine/VisibilityResolver.ts** - Fixed cross-location visibility
2. **src/lib/game/cartridges/chapter-1.ts** - Added `alternateNames` + `transitionTemplates`
3. **src/lib/game/actions/handle-go.ts** - Fixed property name + added same-location handling

---

## Prevention for Future Chapters

### Use Chapter 0 as Reference
Chapter 0 is the "gold standard" - when in doubt:
1. Check how Chapter 0 implements something
2. Match the pattern exactly
3. Don't change engine code unless absolutely necessary

### Think Global, Not Local
- ❌ Don't fix issues by modifying one object
- ✅ Fix the underlying system that all objects use
- ❌ Don't add hacks to individual handlers
- ✅ Fix the root cause in the engine

### Always Add Both Properties
For every new object:
- ✅ Add `alternateNames` array
- ✅ Add `transitionNarration` if it's a focus target

For every new location:
- ✅ Add `transitionTemplates` array (10 messages minimum)

---

## Related Documentation

- `src/documentation/cartridge-setup-proximity-system.md` - Proximity/focus system setup
- `src/documentation/progressive-discovery-pattern.md` - Parent-child reveal mechanics
- `src/documentation/handler-resolution-and-media.md` - Handler patterns

---

## Version History

**2025-12-11**: Initial documentation of the "go to" command bug and fix
- Documented all three root causes
- Added comprehensive prevention checklist
- Created testing scenarios for future chapters
