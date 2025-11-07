# Focus and Zone System

**Last Updated**: 2025-11-07
**Critical Architectural Documentation**

## Overview

The AIRPG_2 game uses a **focus system** (also called "island system") to manage player attention and interaction scope. When a player focuses on an entity, their commands are scoped to that entity and its children.

---

## Core Principles

### What Can Be a Focus Target?

**✅ OBJECTS** - Game objects are the primary focus targets
- Examples: Counter, Bookshelf, Wall Safe, Drawer
- Objects define zones within a location
- Can have children (contained items/objects)
- Players navigate using: `go to [object]`, `goto [object]`, `move to [object]`

**✅ ITEMS** (limited) - Items can be focused when examined/read
- Used for: Books, notebooks, documents, containers in inventory
- Usually focused through EXAMINE or READ commands
- Example: Examining a notebook focuses on it to read child documents

**❌ NPCs** - NPCs are **NEVER** focus targets for navigation
- NPCs are conversation partners, not zones
- Players interact via: `talk to [npc]`, `ask [npc] about [topic]`
- NPCs do NOT use the goto/focus system
- NPCs are "nearby" but not "zone targets"

### Why NPCs Are Not Zones

NPCs represent people, not places. Key differences:

1. **Spatial**: Objects define physical spaces to move to. NPCs move around - they're not static zones.
2. **Interaction**: Objects are examined, opened, searched. NPCs are talked to.
3. **Containment**: Objects can contain items/objects. NPCs don't contain things (they're not containers).
4. **Focus Scope**: Focusing on an object means "I'm at this location working with this thing". NPCs don't have that relationship.

**Example**:
- ✅ "Go to Counter" → Focus on Counter (can access coffee machine, drawer)
- ❌ "Go to Barista" → Invalid, Barista is not a zone
- ✅ "Talk to Barista" → Start conversation (no focus change)

---

## Focus Mechanics

### Setting Focus

Focus changes when:
- Player uses `go to [object]`, `goto [object]`, `move to [object]`
- Player examines an object (depending on configuration)
- Player opens a container
- System automatically focuses on parent when accessing child

### Focus Hierarchy

```
Location (Cafe Interior)
  └─ Zone Objects (Counter, Bookshelf, Wall Safe)
       └─ Child Objects (Coffee Machine, Drawer)
            └─ Child Items (Key, Document)
```

When player focuses on a child, **system focuses on the parent** instead:
- User: "go to coffee machine"
- System: Focuses on Counter (parent)
- Result: Player can access all children of Counter

### Focus Scope

When focused on an entity:
- **Priority search**: Commands first search within focused entity and its children
- **Global fallback**: If not found in focus, search globally
- **Personal equipment**: Always accessible (phone, badge) - no focus needed

Example:
```
Player focused on: Brown Notebook
Player says: "read justice"

Search priority:
1. Inside notebook (finds "Justice for my love" article) ✓
2. Current location items (would find book titled "Justice")
3. Other locations

Result: Reads the article inside notebook, not the book in the room
```

---

## Implementation

### Key Files

**Focus Resolution**:
- `src/lib/game/engine/FocusResolver.ts`
  - `findEntity()` - Focus-aware entity search
  - `getTransitionNarration()` - Movement narration
  - `getOutOfFocusMessage()` - Error messages when out of focus

**Navigation**:
- `src/lib/game/actions/handle-goto.ts`
  - Handles goto/moveto commands
  - **DOES NOT search NPCs** (line 90-92)
  - Only returns 'object' type matches
  - Automatically focuses on parent for child entities

**State Management**:
- `src/lib/game/engine/GameStateManager.ts`
  - Manages focus state (currentFocusId, focusType, previousFocusId)
  - Handles SET_FOCUS and CLEAR_FOCUS effects

### Focus State

Stored in `PlayerState`:
```typescript
{
  currentFocusId: string | undefined,  // ID of currently focused entity
  focusType: 'item' | 'object' | undefined,
  previousFocusId: string | undefined  // For "go back" functionality
}
```

**Note**: `focusType` can only be 'item' or 'object', **never 'npc'**.

---

## Common Patterns

### Going to Children

When player targets a child entity, focus changes to parent:

```typescript
// User input: "go to coffee machine"
// Coffee machine is child of Counter

1. Find entity: obj_coffee_machine
2. Get parent: obj_counter
3. Set focus: obj_counter (not coffee machine!)
4. Use child's name in narration: "You move to the coffee machine"
5. Actual focus: Counter (can access all Counter children)
```

### Zone Organization

Locations define zones using object groups:

```typescript
zones: [
  {
    title: 'At the main counter',
    objectIds: ['obj_chalkboard_menu', 'obj_counter']
  },
  {
    title: 'On the wall',
    objectIds: ['obj_painting', 'obj_wall_safe']
  }
]
```

These zones help organize objects spatially but don't directly control focus - the `go to` command sets focus.

### Transition Narration

When focus changes, system generates transition message:

**Priority**:
1. Entity-specific `transitionNarration` (if defined on entity)
2. Location `transitionTemplates` (atmospheric descriptions)
3. Generic templates (fallback)

**Children skip transitions**: If entity has a parent, no physical movement narration (you're already "there").

---

## Common Mistakes

### ❌ DON'T: Search NPCs in goto/navigation

```typescript
// BAD: Searching NPCs for goto targets
for (const [npcId, npc] of Object.entries(game.npcs)) {
  if (matchesName(npc, targetName)) {
    match = { id: npcId, type: 'npc' };  // WRONG!
  }
}
```

**Problem**: NPCs are not zones, shouldn't be goto targets

### ❌ DON'T: Use 'npc' as focusType in goto

```typescript
// BAD: Allowing NPC focus type
let targetFocusType = match.type as 'object' | 'npc';  // WRONG!
```

**Problem**: Focus system doesn't support NPC targets

### ❌ DON'T: Mix conversation and focus systems

```typescript
// BAD: Setting focus when starting conversation
effects.push({
  type: 'SET_FOCUS',
  focusId: npcId,  // WRONG!
  focusType: 'npc'
});
```

**Problem**: Conversations use `activeConversationWith`, not focus

### ✅ DO: Only search objects for goto

```typescript
// GOOD: Only searching objects
for (const [objId, obj] of Object.entries(game.gameObjects)) {
  if (matchesName(obj, targetName)) {
    match = { id: objId, type: 'object' };  // Correct!
  }
}
```

### ✅ DO: Use TALK command for NPCs

```typescript
// GOOD: Separate NPC interaction via TALK
case 'talk':
  effects.push({
    type: 'START_CONVERSATION',
    npcId: npcId  // No focus change!
  });
```

### ✅ DO: Focus on parent for children

```typescript
// GOOD: Auto-focus on parent
const parentId = GameStateManager.getParent(state, childId);
if (parentId) {
  targetFocusId = parentId;  // Focus parent, not child
}
```

---

## Testing Checklist

When modifying focus/navigation system:

- [ ] "go to [object]" focuses on object correctly
- [ ] "go to [child object]" focuses on parent
- [ ] "go to [npc]" returns error (NPCs not valid targets)
- [ ] "talk to [npc]" works without changing focus
- [ ] Focus scope prioritizes children correctly
- [ ] Out-of-focus actions show helpful error messages
- [ ] Transition narration uses correct entity names
- [ ] Personal equipment doesn't require focus changes

---

## Related Documentation

- `handler-resolution-and-media.md` - Handler and media resolution
- `verb-system.md` - Available commands and their handlers
- `game-object-schema.md` - Object structure and capabilities

---

## Version History

**2025-11-07**: Initial documentation
- Created after fixing NPC zone bug in handle-goto.ts
- Established core principle: NPCs are not zones
- Documented focus system architecture
- Added testing checklist and common mistakes
