# Development Principles - Read Before Every Change

**Purpose**: Prevent architectural drift and ensure all changes work globally across all games.

**When to read this**: Before starting ANY code change, feature, or bug fix.

---

## The Golden Rule

> **"Will this solution work for 1000 games, or just this one object?"**

If the answer is "just this one object," STOP. Find the global system that needs fixing.

---

## Pre-Change Decision Tree

### Step 1: Identify the Problem Type

```
Is this issue happening in:
├─ One specific object/item?
│  └─ ❌ DON'T fix the object
│  └─ ✅ Find the SYSTEM that object uses
│  └─ Example: Coffee machine shows wrong media
│     → Fix HandlerResolver, not coffee machine
│
├─ Multiple objects with same pattern?
│  └─ ✅ Fix the pattern implementation
│  └─ Example: All containers show wrong empty state
│     → Fix media resolution priority system
│
└─ A core system/engine file?
   └─ ✅ Fix the system, test on multiple objects
   └─ Example: HandlerResolver not resolving arrays
      → Fix resolver, test on all conditional handlers
```

### Step 2: Check Existing Patterns

Before writing ANY handler code:

1. **Read**: `src/documentation/handler-resolution-and-media.md`
2. **Identify**: Which pattern does this need?
   - Pattern 1 (Binary): Simple yes/no, one action, two outcomes
   - Pattern 2 (Multi-State): Complex branching, multiple game states
3. **Copy**: Use existing examples as templates
4. **Test**: Verify on at least 2 different objects

### Step 3: Validate Parent-Child Relationships

If your change involves:
- Containers (objects that hold things)
- Hidden entities (revealed by actions)
- Progressive discovery (items appear after examining)

**MUST verify**:
```typescript
// ✅ Correct parent-child setup
children: {
  items: ['item_key'] as ItemId[],
  objects: ['obj_hidden_door'] as GameObjectId[]
}

// ✅ Correct reveal
effects: [
  {
    type: 'REVEAL_FROM_PARENT',
    entityId: 'item_key',
    parentId: 'obj_container'
  }
]

// ❌ WRONG - No parent relationship
effects: [
  {
    type: 'REVEAL_ENTITY',  // Missing parentId!
    entityId: 'item_key'
  }
]
```

**Test after change**:
- [ ] Can child be accessed after reveal?
- [ ] Is `parentId` set in entity state?
- [ ] Does `getParent()` return correct parent?

### Step 4: Documentation Requirements

**REQUIRED for every change**:

| Change Type | Documentation Required |
|-------------|----------------------|
| New handler pattern | Add to handler-resolution-and-media.md |
| Bug fix | Update backlog.md (resolved section) |
| Architecture change | Update relevant doc + version history |
| New system/feature | Create new doc in src/documentation/ |
| Breaking change | Update CLAUDE.md + affected docs |

**No exceptions**. Code without documentation = incomplete work.

### Step 5: Testing Requirements

Minimum testing before commit:

- [ ] Test on the specific object/entity
- [ ] Test on at least ONE other similar object
- [ ] Run `npm run db:bake` successfully
- [ ] Verify no TypeScript errors in changed files
- [ ] Check console for runtime errors

---

## Common Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern #1: The Local Fix

**Scenario**: Coffee machine shows wrong media after key taken

**WRONG Approach**:
```typescript
// In cartridge.ts - modifying coffee machine only
'obj_coffee_machine': {
  media: {
    images: {
      broken_empty: { url: '...empty.png' }  // Local fix
    }
  }
}
```

**Why Wrong**:
- Only fixes coffee machine
- Wall safe, drawer still broken
- Next developer copies broken pattern
- Technical debt accumulates

**RIGHT Approach**:
```typescript
// In HandlerResolver.ts - fix for ALL conditional handlers
static resolveHandler(handler, state, game) {
  if (Array.isArray(handler)) {
    // Resolve to first matching handler
    for (const h of handler) {
      if (evaluateConditions(h.conditions, state, game)) {
        return h;  // Global fix for all objects
      }
    }
  }
  return handler;
}
```

**Why Right**:
- Fixes ALL objects with conditional handlers
- Coffee machine, safe, drawer all work
- Future objects automatically work
- System is robust

---

### ❌ Anti-Pattern #2: The Pattern Violation

**Scenario**: Bookshelf needs complex state-based behavior

**WRONG Approach**:
```typescript
// Inventing custom structure
onUse: {
  special_case: {
    itemId: 'item_saw',
    check: (state) => state.flags.document_read,
    action: () => { ... }
  }
}
```

**Why Wrong**:
- Custom structure not documented
- Engine doesn't understand this format
- Won't work when copied to other games
- Breaks handler resolution system

**RIGHT Approach**:
```typescript
// Using documented Pattern 2 (Multi-State)
onUse: [
  {
    itemId: 'item_saw',
    conditions: [{ type: 'FLAG', flag: 'bookshelf_destroyed' }],
    success: { message: "Already destroyed" }
  },
  {
    itemId: 'item_saw',
    conditions: [
      { type: 'FLAG', flag: 'read_secret_document', value: true },
      { type: 'NO_FLAG', flag: 'bookshelf_destroyed' }
    ],
    success: {
      message: "Cut through...",
      effects: [{ type: 'REVEAL_FROM_PARENT', ... }]
    }
  },
  {
    itemId: 'item_saw',
    conditions: [{ type: 'NO_FLAG', flag: 'read_secret_document' }],
    success: { message: "Battery low" }
  }
]
```

**Why Right**:
- Uses documented Pattern 2
- Engine handles it correctly
- Other developers understand it
- Copy-paste to other games works

---

### ❌ Anti-Pattern #3: The Broken Relationship

**Scenario**: Hidden door not appearing after bookshelf destroyed

**WRONG Approach**:
```typescript
// Making door visible by default
'obj_hidden_door': {
  state: { isVisible: true }  // Wrong!
}
```

**Why Wrong**:
- Door visible from start of game
- Breaks progressive discovery
- Parent-child relationship ignored
- No reveal mechanism

**RIGHT Approach**:
```typescript
// Proper parent-child relationship
'obj_bookshelf': {
  children: {
    objects: ['obj_hidden_door']  // Parent relationship
  },
  handlers: {
    onUse: [{
      itemId: 'item_saw',
      success: {
        effects: [
          {
            type: 'REVEAL_FROM_PARENT',  // Proper reveal
            entityId: 'obj_hidden_door',
            parentId: 'obj_bookshelf'
          }
        ]
      }
    }]
  }
}
```

**Why Right**:
- Door starts hidden (isVisible: false)
- Only revealed when bookshelf destroyed
- Parent-child relationship maintained
- Accessibility chain works correctly

---

### ❌ Anti-Pattern #4: The Undocumented Change

**Scenario**: Fixed critical handler resolution bug

**WRONG Approach**:
```bash
git commit -m "fix handler bug"
# No documentation update
# No version history
# No testing notes
```

**Why Wrong**:
- Future developers don't know what was fixed
- Pattern not documented for reuse
- Might get "fixed" again differently
- Knowledge lost

**RIGHT Approach**:
```bash
# 1. Update code
# 2. Update documentation/handler-resolution-and-media.md
# 3. Add version history entry
# 4. Test on multiple objects
# 5. Commit with detailed message
git commit -m "Fix: HandlerResolver now resolves conditional arrays

- Added resolveHandler() method to evaluate handler arrays
- Updated all action handlers to pass game parameter
- Fixes container media showing wrong state
- Documented in handler-resolution-and-media.md
- Tested: coffee machine, wall safe, bookshelf"
```

**Why Right**:
- Changes documented for future reference
- Pattern available for other developers
- Clear what was fixed and why
- Testing verification included

---

### ❌ Anti-Pattern #5: The NPC Zone

**Scenario**: Player tries "go to barista"

**WRONG Approach**:
```typescript
// In handle-goto.ts - allowing NPC navigation
for (const npc of game.npcs) {
  if (matchesName(npc, target)) {
    setFocus(npcId, 'npc');  // Wrong!
  }
}
```

**Why Wrong**:
- NPCs are conversation partners, not zones
- Breaks spatial navigation model
- "Go to counter" focuses on barista instead
- Violates architecture (see focus-and-zones.md)

**RIGHT Approach**:
```typescript
// In handle-goto.ts - only objects are zones
// NOTE: NPCs are NOT searched here - they are not zones
// Players interact with NPCs via TALK command

for (const obj of game.gameObjects) {
  if (matchesName(obj, target)) {
    setFocus(objId, 'object');  // Correct!
  }
}
```

**Why Right**:
- Only objects are navigation targets
- NPCs accessed via TALK command
- Spatial model consistent
- Follows documented architecture

---

## Pattern Selection Guide

Use this to choose the right handler pattern:

### When to Use Pattern 1: Binary Success/Fail

**Characteristics**:
- ✅ Simple yes/no state
- ✅ One action with two outcomes
- ✅ Clear can-do / can't-do logic

**Examples**:
- Break machine (can break once, then can't)
- Unlock door (can unlock if have key, otherwise can't)
- Take item (can take if not taken, otherwise can't)

**Structure**:
```typescript
{
  itemId: 'tool',
  conditions: [can_perform_action],
  success: {
    message: "Action performed!",
    effects: [...]
  },
  fail: {
    message: "Can't do that."
  }
}
```

### When to Use Pattern 2: Multi-State Branching

**Characteristics**:
- ✅ Multiple distinct game states
- ✅ Different outcomes for each state
- ✅ Need to check states in priority order

**Examples**:
- Container states (empty / full / destroyed)
- Progressive reading (first / second / third read)
- Knowledge-gated actions (no knowledge / have knowledge / already done)
- Charging mechanics (not ready / ready / already used)

**Structure**:
```typescript
[
  {
    itemId: 'tool',
    conditions: [most_specific_state],
    success: { message: "State 1", effects: [...] }
  },
  {
    itemId: 'tool',
    conditions: [less_specific_state],
    success: { message: "State 2", effects: [...] }
  },
  {
    itemId: 'tool',
    conditions: [],  // Default
    success: { message: "State 3" }
  }
]
```

**Critical**: Order from most specific to least specific!

---

## Pre-Commit Validation Checklist

Copy this checklist before every commit:

### Code Quality
- [ ] Is this a global fix (not local workaround)?
- [ ] Does it follow Pattern 1 or Pattern 2 from docs?
- [ ] Are handler conditions ordered specific → general?
- [ ] Are parent-child relationships intact?
- [ ] Did I test on multiple objects/entities?

### Documentation
- [ ] Updated relevant docs in src/documentation/?
- [ ] Added version history if architecture changed?
- [ ] Updated backlog.md if fixing known issue?
- [ ] Added code comments referencing documentation?

### System Integrity
- [ ] NPCs not treated as zones?
- [ ] Explicit media takes priority over entity-based?
- [ ] REVEAL_FROM_PARENT used for child entities?
- [ ] Focus system respects parent-child hierarchy?

### Testing
- [ ] Ran `npm run db:bake` successfully?
- [ ] Checked console for errors?
- [ ] Tested positive case (action works)?
- [ ] Tested negative case (action blocked)?
- [ ] Tested edge cases (already done, missing items)?

### Commit Message
- [ ] Clear description of what changed?
- [ ] Why it was needed?
- [ ] What was tested?
- [ ] Documentation references?

---

## Quick Reference: Key Documentation

Before making changes, check these docs:

| Topic | Document | When to Check |
|-------|----------|---------------|
| Handler patterns | handler-resolution-and-media.md | Any handler changes |
| Focus system | focus-and-zones.md | Navigation, goto, zones |
| Known issues | backlog.md | Before adding new features |
| Parent-child | handler-resolution-and-media.md | Containers, progressive discovery |
| Media resolution | handler-resolution-and-media.md | Images showing wrong state |

---

## Real-World Examples from This Project

### Example 1: Coffee Machine Media Fix

**Problem**: Coffee machine showed image with key even after key was taken

**Wrong Approach Attempted**:
- Modify coffee machine media URLs directly
- Remove explicit media from handlers
- Change state-based image resolution for coffee machine only

**Right Approach Used**:
- Fixed HandlerResolver to resolve conditional handler arrays
- Added `resolveHandler()` method that evaluates conditions
- Updated ALL action handlers to pass `game` parameter
- Tested on coffee machine, wall safe, drawer

**Result**: ALL containers now show correct empty/full states

**Documentation**:
- Updated handler-resolution-and-media.md with Pattern 2 example
- Added version history
- Created this DEVELOPMENT-PRINCIPLES.md

---

### Example 2: Bookshelf Destruction Pattern

**Problem**: Bookshelf needed complex state logic (battery charging, knowledge-gating, destruction)

**Wrong Approach Avoided**:
- Creating custom handler structure
- Using different pattern than coffee machine
- Making local fix for bookshelf only

**Right Approach Used**:
- Used documented Pattern 2 (Multi-State)
- Three handlers for same item (saw) covering all states
- Ordered conditions: destroyed → ready → not ready
- Followed same structure as coffee machine

**Result**: Consistent pattern across all destructible objects

**Documentation**:
- Added bookshelf example to handler-resolution-and-media.md
- Documented binary vs multi-state pattern decision guide

---

### Example 3: NPC Zone Bug

**Problem**: "go to coffee machine" focused on Barista instead of Counter

**Wrong Approach Avoided**:
- Making local fix for coffee machine navigation
- Adjusting transition messages only
- Adding special case handling

**Right Approach Used**:
- Removed NPC search from handle-goto.ts globally
- Documented that NPCs are NOT zones
- Created focus-and-zones.md to prevent future violations

**Result**: All navigation now works correctly, NPCs can't be zone targets

**Documentation**:
- Created focus-and-zones.md
- Updated handler-resolution-and-media.md version history
- Added architectural principle to CLAUDE.md

---

## When in Doubt

1. **Search existing code** for similar patterns
2. **Check documentation** in src/documentation/
3. **Ask**: "Will this work for 1000 games?"
4. **Test** on multiple objects before committing
5. **Document** what you learned

Remember: **Code is temporary, patterns are forever.** Make patterns that last.

---

## Version History

**2025-11-08**: Initial creation
- Documented principles learned from coffee machine, bookshelf, NPC zone fixes
- Established binary vs multi-state pattern decision guide
- Created pre-commit validation checklist
- Added real-world examples from this project
