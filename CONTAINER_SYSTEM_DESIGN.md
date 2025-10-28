# Container System Redesign - Architecture Document

## Problem Statement

The current container/visibility system has fundamental issues:
1. No runtime parent-child relationship tracking
2. Inconsistent state sources (cartridge vs runtime)
3. Weak multi-level nesting support
4. Limited AI natural language understanding

## Design Goals

1. **Support 10+ levels of nested containers**
2. **Single source of truth for all runtime state**
3. **Clear parent-child accessibility rules**
4. **Robust AI intent interpretation**

---

## 1. Enhanced EntityRuntimeState

Add parent-child tracking to runtime state:

```typescript
export type EntityRuntimeState = {
  // Universal properties
  isVisible?: boolean;
  discovered?: boolean;
  currentStateId?: string;
  stateTags?: string[];

  // NEW: Parent-child relationship tracking
  parentId?: string;  // Entity that contains this entity
  revealedBy?: string;  // Entity whose action revealed this entity
  containedEntities?: string[];  // Direct children (items or objects inside)

  // Container/accessibility
  isAccessible?: boolean;  // Can player interact with children?
  accessibilityReason?: string;  // Why not accessible? "parent_closed", "parent_locked"

  // Existing fields...
  isOpen?: boolean;
  isLocked?: boolean;
  isBroken?: boolean;
  isMoved?: boolean;
  isPoweredOn?: boolean;
  taken?: boolean;
  readCount?: number;

  // NPC-specific...
  stage?: 'active' | 'completed' | 'demoted';
  importance?: 'primary' | 'supporting' | 'ambient';
  trust?: number;
  attitude?: 'friendly' | 'neutral' | 'hostile' | 'suspicious';
  completedTopics?: string[];
  interactionCount?: number;

  // Analytics
  usedCount?: number;
  examinedCount?: number;
};
```

---

## 2. Container Relationship Rules

### Accessibility Chain

An entity is **accessible** IFF:
1. It is visible (`isVisible: true`)
2. ALL parents in the chain are accessible
3. The immediate parent grants access

### Access Grant Conditions

A parent grants access to its children when:
- **Movable objects**: `isMoved: true` (e.g., painting moved reveals safe)
- **Containers**: `isOpen: true` (e.g., safe opened reveals document)
- **Lockable**: `isLocked: false` (e.g., notebook unlocked allows opening)
- **Breakable**: `isBroken: true` (e.g., coffee machine broken reveals key)
- **Always-accessible**: Some containers are always accessible (e.g., bookshelf)

### Example: 10-Level Nesting

```
Painting (movable, moved=true)
  └─ Wall Safe (container, lockable, open=true, locked=false)
      └─ Lockbox (container, lockable, open=true, locked=false)
          └─ Envelope (container, openable, open=true)
              └─ Letter (container, openable, open=true)
                  └─ Hidden Compartment (container, open=true)
                      └─ Microfilm (item, takable)
```

To access Microfilm:
- Painting must be moved
- Wall Safe must be unlocked AND open
- Lockbox must be unlocked AND open
- Envelope must be open
- Letter must be open
- Hidden Compartment must be open

---

## 3. New GameStateManager Methods

```typescript
class GameStateManager {
  // Parent-child relationship management
  static setParent(state: PlayerState, childId: string, parentId: string): PlayerState
  static getParent(state: PlayerState, entityId: string): string | null
  static getAncestors(state: PlayerState, entityId: string): string[]  // All parents up the chain
  static getChildren(state: PlayerState, parentId: string): string[]  // Direct children
  static getDescendants(state: PlayerState, parentId: string): string[]  // All children recursively

  // Accessibility checking
  static isAccessible(state: PlayerState, game: Game, entityId: string): boolean
  static getAccessibilityChain(state: PlayerState, game: Game, entityId: string): AccessibilityCheck[]
  static getBlockingParent(state: PlayerState, game: Game, entityId: string): string | null

  // Container management
  static addToContainer(state: PlayerState, itemId: string, containerId: string): PlayerState
  static removeFromContainer(state: PlayerState, itemId: string, containerId: string): PlayerState
  static moveEntity(state: PlayerState, entityId: string, fromContainerId: string, toContainerId: string): PlayerState
}

type AccessibilityCheck = {
  entityId: string;
  accessible: boolean;
  reason?: 'not_moved' | 'not_open' | 'locked' | 'not_broken' | 'parent_inaccessible';
};
```

---

## 4. Rewritten VisibilityResolver

```typescript
class VisibilityResolver {
  /**
   * Get all visible AND accessible entities
   * Uses recursive parent checking
   */
  static getVisibleEntities(state: PlayerState, game: Game): VisibleEntities

  /**
   * Check if entity is visible (exists in world view)
   * AND accessible (player can interact with it)
   */
  static isEntityVisibleAndAccessible(state: PlayerState, game: Game, entityId: string): boolean

  /**
   * Get the full containment chain for an entity
   * Example: ["loc_cafe_interior", "obj_wall_safe", "item_lockbox", "item_envelope"]
   */
  static getContainmentChain(state: PlayerState, game: Game, entityId: string): string[]

  /**
   * Check if a specific parent grants access
   * Based on parent type and state
   */
  static parentGrantsAccess(state: PlayerState, game: Game, parentId: string): boolean
}
```

---

## 5. Enhanced AI Prompt Context

### Natural Language Intent Mapping

Add comprehensive section to `promptContext`:

```
**// CRITICAL: Natural Language Intent Interpretation**

Your PRIMARY job is to understand what the player WANTS to do, not just what they literally said.

### Destructive Actions → `use <tool> on <target>`
Player says → You interpret as:
- "hit the coffee machine with the pipe" → use "Iron Pipe" on "Coffee Machine"
- "smash the machine" → use "Iron Pipe" on "Coffee Machine" (if pipe in inventory)
- "break machine with pipe" → use "Iron Pipe" on "Coffee Machine"
- "whack it with the pipe" → use "Iron Pipe" on "Coffee Machine"
- "bash the machine" → use "Iron Pipe" on "Coffee Machine" (if pipe in inventory)
- "destroy the machine using pipe" → use "Iron Pipe" on "Coffee Machine"

### Opening/Unlocking Actions → `open <object>` or `use <key> on <object>`
Player says → You interpret as:
- "unlock the safe with the key" → use "Deposit Box Key" on "Wall Safe"
- "open safe with key" → use "Deposit Box Key" on "Wall Safe"
- "use key on safe" → use "Deposit Box Key" on "Wall Safe"
- "put key in safe" → use "Deposit Box Key" on "Wall Safe"
- "try the key on the safe" → use "Deposit Box Key" on "Wall Safe"
- "unlock safe" → use "Deposit Box Key" on "Wall Safe" (if key in inventory)

### Movement/Inspection Actions → `move <object>` or `examine <object>`
Player says → You interpret as:
- "look behind the painting" → move "Painting on the wall"
- "check behind painting" → move "Painting on the wall"
- "move painting aside" → move "Painting on the wall"
- "push the chalkboard" → move "Chalkboard Menu"
- "shift the chalkboard" → move "Chalkboard Menu"
- "what's behind the painting?" → move "Painting on the wall"

### Reading/Taking Actions → `read <object>` or `take <item>`
Player says → You interpret as:
- "what does it say?" → read <most recently examined readable object>
- "pick it up" → take <most recently examined takable item>
- "grab the key" → take "Deposit Box Key"
- "get the document" → take "Secret Document"

### Context-Aware Interpretation
- If player says "open it" or "take it" without specifying, use the most recently examined entity
- If player says "use it" without specifying tool, check inventory for obvious tool (pipe, key, etc.)
- If player's intent is clear but entity name is vague, match to visible entities by similarity
```

---

## 6. New Effect Types

Add these effect types to handle containers robustly:

```typescript
export type Effect =
  // ... existing effects ...

  // NEW: Container relationship effects
  | { type: 'SET_PARENT'; entityId: string; parentId: string }
  | { type: 'ADD_TO_CONTAINER'; entityId: string; containerId: string }
  | { type: 'REMOVE_FROM_CONTAINER'; entityId: string; containerId: string }
  | { type: 'MOVE_ENTITY'; entityId: string; from: string; to: string }
  | { type: 'REVEAL_FROM_PARENT'; entityId: string; parentId: string }  // Marks revealedBy
```

---

## 7. Implementation Plan

1. **Update types.ts** - Add new fields to EntityRuntimeState
2. **Enhance GameStateManager.ts** - Add parent-child methods
3. **Rewrite VisibilityResolver.ts** - Use runtime parent tracking
4. **Update process-effects.ts** - Handle new container effects
5. **Enhance AI promptContext** - Add comprehensive natural language rules
6. **Update cartridge.ts** - Use new effect types in handlers
7. **Test nested scenarios** - Verify 10-level nesting works

---

## 8. Migration Strategy

### Backward Compatibility
- Keep legacy `objectStates`, `itemStates` during transition
- Gradually migrate handlers to use new effects
- Populate `state.world` from cartridge `children` property on init

### Testing Scenarios
1. **2-Level**: Painting → Safe → Document
2. **3-Level**: Chalkboard → Pipe, Notebook → Items
3. **10-Level**: Create test scenario with deeply nested containers
4. **Edge Cases**:
   - Take item from container (should remove from parent's containedEntities)
   - Break container (should reveal children)
   - Move container with items inside (children stay with parent)

---

## 9. Success Criteria

✅ Player can access 10-level deep nested containers
✅ Visibility correctly blocks inaccessible children
✅ AI correctly interprets "break coffee machine with pipe"
✅ AI correctly interprets "look behind painting"
✅ AI correctly interprets "open safe with key"
✅ Container state is tracked in single source of truth
✅ No entity visibility leaks (can't see locked container contents)
