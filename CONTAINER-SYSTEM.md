# Container System Architecture

## Core Philosophy

Containers in AIRPG_2 use a **3-state binary system** to control visibility and accessibility:

1. **isOpen/isClosed** → Controls **VISIBILITY** (can you SEE the contents?)
2. **isLocked/isUnlocked** → Controls **TAKEABILITY** (can you TAKE the contents?)
3. **isBroken/isIntact** → **BYPASSES** all locks (break to access)

## State Matrix

| isLocked | isOpen | isBroken | Player Sees? | Can Take? | Example |
|----------|--------|----------|--------------|-----------|---------|
| ✅ | ✅ | ❌ | ✅ VISIBLE | ❌ BLOCKED | Zip-ties securing hard hat |
| ❌ | ✅ | ❌ | ✅ VISIBLE | ✅ TAKEABLE | Open unlocked chest |
| ✅ | ❌ | ❌ | ❌ HIDDEN | ❌ BLOCKED | Locked closed chest |
| ❌ | ❌ | ❌ | ❌ HIDDEN | ❌ BLOCKED | Closed unlocked chest |
| ✅ | ✅ | ✅ | ✅ VISIBLE | ✅ TAKEABLE | Broken vase (lock bypassed) |
| ✅ | ❌ | ✅ | ✅ VISIBLE | ✅ TAKEABLE | Broken lock on closed box |

## Real-World Examples

### Example 1: Zip-Ties Container (Chapter 1)

**Scenario**: Hard hat secured to scaffolding with zip-ties

**Initial State**:
```typescript
{
  isLocked: true,   // Secured with zip-ties
  isOpen: true,     // Hard hat is VISIBLE (not hidden)
  isBroken: false
}
```

**Player Experience**:
- `SEARCH scaffolding` → Reveals hard hat (player can SEE it)
- `TAKE hard hat` → ❌ BLOCKED - "The hard hat is secured with zip-ties"
- `USE pliers ON zip-ties` → Cuts zip-ties, sets `isLocked: false`
- `TAKE hard hat` → ✅ ALLOWED

**Key Insight**: Items can be **visible but not takeable** when `isOpen: true, isLocked: true`

### Example 2: Locked Vase

**Scenario**: Decorative vase with locked lid, containing a key

**Initial State**:
```typescript
{
  isLocked: true,   // Lid is locked
  isOpen: true,     // Transparent glass - contents VISIBLE
  isBroken: false
}
```

**Player Experience**:
- `EXAMINE vase` → Sees key inside through glass
- `TAKE key` → ❌ BLOCKED - "The vase lid is locked"
- `BREAK vase` → Sets `isBroken: true`, **BYPASSES lock**
- `TAKE key` → ✅ ALLOWED

### Example 3: Locked Chest

**Scenario**: Traditional locked treasure chest

**Initial State**:
```typescript
{
  isLocked: true,   // Locked with padlock
  isOpen: false,    // Closed - contents HIDDEN
  isBroken: false
}
```

**Player Experience**:
- `EXAMINE chest` → Sees padlock, but doesn't know what's inside
- `TAKE [item]` → ❌ BLOCKED - "The chest is closed"
- `OPEN chest` → ❌ BLOCKED - "The chest is locked"
- `USE key ON chest` → Sets `isLocked: false`
- `OPEN chest` → Sets `isOpen: true`
- `TAKE [item]` → ✅ ALLOWED

## Implementation (ZoneManager.ts)

### Access Validation Order

```typescript
// RULE 4: Container checks (for Items)
if (targetType === 'item' && itemState.parentId) {

  // 1. BROKEN → Bypass all locks/openings
  if (isBreakable && isBroken) {
    return { allowed: true };
  }

  // 2. LOCKED → Block access (even if opened/visible)
  if (isLockable && isLocked) {
    return { allowed: false, reason: 'container_locked' };
  }

  // 3. CLOSED → Block access (contents not visible)
  if (isOpenable && !isOpen) {
    return { allowed: false, reason: 'container_closed' };
  }

  // 4. UNLOCKED + OPENED → Allow access
  return { allowed: true };
}
```

### Why This Order Matters

1. **Check broken FIRST** → Broken containers bypass everything
2. **Check locked SECOND** → Lock state overrides open/close state
3. **Check opened THIRD** → Visibility comes after security

## Required GameObject Properties

### Capabilities (all 8 required)
```typescript
capabilities: {
  container: boolean,   // Is this a container?
  lockable: boolean,    // Can it be locked/unlocked?
  openable: boolean,    // Can it be opened/closed?
  breakable: boolean,   // Can it be broken?
  movable: boolean,
  powerable: boolean,
  readable: boolean,
  inputtable: boolean
}
```

### State (all 4 required)
```typescript
state: {
  currentStateId: string,
  isOpen: boolean,      // VISIBILITY control
  isLocked: boolean,    // TAKEABILITY control
  isBroken: boolean,    // BYPASS control
  isPoweredOn: boolean
}
```

## Progressive Reveal Pattern

Containers use a **3-phase discovery flow**:

### Phase 1: EXAMINE Container
```
Player: EXAMINE scaffolding
Game: "You can see some items on the lowest platform from here."
```
→ Vague hint that items exist

### Phase 2: SEARCH Container
```
Player: SEARCH scaffolding
Game: "🔧 Pliers\n🔩 Spring\n⚠️ Hard Hat (secured with zip-ties)"
Effects: [REVEAL_FROM_PARENT for pliers, spring, zip-ties container]
```
→ Items become visible, revealed from parent

### Phase 3: EXAMINE Specific Item
```
Player: EXAMINE hard hat
Game: "Yellow hard hat. Standard construction safety gear. Secured to the scaffolding railing with heavy-duty zip-ties."
```
→ Detailed description of specific item

### Phase 4: Access Validation
```
Player: TAKE hard hat
ZoneManager validates:
  1. Is parent broken? NO
  2. Is parent locked? YES → BLOCK
  3. Never reaches open check
Game: "The hard hat is secured with zip-ties. You'll need to cut them first."
```

## Effect Types for Container Manipulation

### Unlocking
```typescript
{
  type: 'SET_ENTITY_STATE',
  entityId: 'obj_container',
  patch: { isLocked: false }
}
```

### Opening
```typescript
{
  type: 'SET_ENTITY_STATE',
  entityId: 'obj_container',
  patch: { isOpen: true }
}
```

### Breaking (bypasses lock)
```typescript
{
  type: 'SET_ENTITY_STATE',
  entityId: 'obj_container',
  patch: { isBroken: true }
}
```

### Unlock + Open (e.g., cutting zip-ties)
```typescript
{
  type: 'SET_ENTITY_STATE',
  entityId: 'obj_scaffolding_zip_ties',
  patch: { isLocked: false, isOpen: true }
}
```

## Common Mistakes to Avoid

### ❌ DON'T: Mix visibility and takeability
```typescript
// WRONG - Trying to use isOpen for both visibility and access control
if (!isOpen) {
  return "The chest is locked"; // CONFUSING - locked or closed?
}
```

### ✅ DO: Separate visibility and takeability
```typescript
// CORRECT - Clear separation
if (isLocked) {
  return "The chest is locked. You'll need a key.";
}
if (!isOpen) {
  return "The chest is closed. Try opening it first.";
}
```

### ❌ DON'T: Forget to check locked state
```typescript
// WRONG - Only checking isOpen
if (isOpenable && !isOpen) {
  return { allowed: false };
}
// Misses the case where isOpen=true but isLocked=true!
```

### ✅ DO: Check locked before open
```typescript
// CORRECT - Check both states in correct order
if (isLockable && isLocked) {
  return { allowed: false, reason: 'container_locked' };
}
if (isOpenable && !isOpen) {
  return { allowed: false, reason: 'container_closed' };
}
```

### ❌ DON'T: Use incomplete state objects
```typescript
// WRONG - Missing required properties
state: { currentStateId: 'locked' }
```

### ✅ DO: Always provide complete state
```typescript
// CORRECT - All required properties present
state: {
  currentStateId: 'locked',
  isOpen: true,
  isLocked: true,
  isBroken: false,
  isPoweredOn: false
}
```

## Testing Commands

### Verify Container State
```bash
npx tsx scripts/test-container-states.ts
```

### Reset Player State (to test cartridge changes)
```bash
npm run db:reset:player
```

### Hard Refresh Browser
- Mac: `Cmd+Shift+R`
- Windows: `Ctrl+Shift+R`

## Key Files

- `src/lib/game/engine/ZoneManager.ts` - Access validation logic
- `src/lib/game/types.ts` - Type definitions for containers
- `src/lib/game/cartridges/chapter-1.ts` - Example container implementations
- `scripts/test-container-states.ts` - Container state verification script

## Version History

- **2025-01-14**: Implemented 3-state system (isOpen, isLocked, isBroken)
- **Previous**: Only validated isOpen, missed isLocked checks
