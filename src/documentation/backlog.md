# Development Backlog

**Purpose**: Track fine-print issues, polish items, and design challenges to address later.

**Status Key**:
- 🔴 **Critical** - Breaks player experience
- 🟡 **Important** - Degrades experience, should fix soon
- 🟢 **Polish** - Nice to have, improves quality
- 🔵 **Design Question** - Needs discussion/decision

**Priority Levels**:
- **P0**: Blocking - Must fix immediately, prevents gameplay
- **P1**: High - Breaks core flow, fix ASAP
- **P2**: Medium - Degrades experience, fix soon
- **P3**: Low - Polish, fix when time allows

---

## Priority Order (Fix in This Order)

### P0 - Blocking Gameplay
1. **#002**: AI Interpretation Breaking Item Names
   - **Why P0**: Completely blocks item interactions
   - **Impact**: Can't take, use, or interact with items
   - **Fix complexity**: Medium (AI flow modification)
   - **Affects**: All items with common names (saw, key, pipe, etc.)

### P1 - Breaking Core Flow
2. **#003 + #004**: Parent-Child Access (Fix Together)
   - **Why P1**: Forces unnecessary navigation steps
   - **Impact**: 4 steps instead of 2, breaks spatial model
   - **Fix complexity**: Medium (focus system expansion)
   - **Affects**: All parent-child relationships (counter→drawer, bookshelf→books, etc.)
   - **Note**: These are related, fix together

### P2 - Design Decisions Needed
3. **#001**: Progressive Discovery vs. Narrative Consistency
   - **Why P2**: Confusing but has workaround (examine first)
   - **Impact**: Player trust issues, seems buggy
   - **Fix complexity**: High (requires design decision + system change)
   - **Affects**: All progressive discovery entities

---

## Detailed Priority Analysis

### Why This Order?

#### P0: #002 First
**Reasoning**:
- **Blocks gameplay completely**: Can't interact with core items
- **Most frustrating**: Player knows what they want, system refuses
- **Quick validation**: Easy to test if fixed ("take saw" should work)
- **Wide impact**: Affects every item interaction

**Risk if not fixed**: Players quit, game unplayable

---

#### P1: #003 + #004 Second
**Reasoning**:
- **Breaks expected behavior**: Should access children from parent
- **Forces workarounds**: Extra "go to" commands every time
- **Related issues**: Fixing one likely fixes both
- **Foundation for #001**: Progressive discovery needs this working

**Risk if not fixed**: Tedious gameplay, players frustrated with micro-navigation

---

#### P2: #001 Third
**Reasoning**:
- **Has workaround**: Players can examine first to reveal
- **Design decision needed**: Can't fix without deciding approach
- **Dependent on #003**: Parent-child access must work first
- **Requires testing**: Need to validate chosen approach

**Risk if not fixed**: Confusing UX, but game still playable

---

## Investigation Priority

### Start Here: #002 AI Interpretation

**First Steps**:
1. Check `src/ai/flows/interpret-player-commands.ts`
   - How does AI match item names?
   - Does it check inventory first?
   - Why "saw" → "chainsaw"?

2. Check `src/lib/game/utils/name-matching.ts`
   - How does name matching work?
   - Is it used by AI flow?

3. Test scenarios:
   - "take saw" with recip saw in drawer
   - "use saw" with recip saw in inventory
   - "take key" with multiple keys

**Expected outcome**: Understand where interpretation breaks

---

### Then: #003 + #004 Parent-Child Access

**First Steps**:
1. Check `src/lib/game/engine/FocusResolver.ts`
   - How does `findEntity` scope search?
   - Does it include children of current focus?

2. Check `src/lib/game/engine/VisibilityResolver.ts`
   - How does `getVisibleEntities` work?
   - Should it include children?

3. Check action handlers:
   - `handle-open.ts` - Why doesn't it find drawer?
   - `handle-take.ts` - Why requires going to drawer?

**Expected outcome**: Understand focus scope limitations

---

### Finally: #001 Progressive Discovery

**First Steps**:
1. **Design decision needed** before coding:
   - Option A: Don't mention hidden entities
   - Option B: Smart error messages
   - Option C: Multi-state visibility
   - Option D: Tutorial system

2. Prototype chosen approach

3. Test on multiple entities

**Expected outcome**: Consistent discovery pattern

---

## Fix Estimates

| Issue | Investigation | Fix | Testing | Total | Risk |
|-------|--------------|-----|---------|-------|------|
| #002 AI Interpretation | 2h | 4h | 2h | **8h** | Medium |
| #003+#004 Parent-Child | 1h | 3h | 2h | **6h** | Low |
| #001 Discovery | 1h | 6h | 4h | **11h** | High |

**Total estimated**: 25 hours

**Risks**:
- #002: AI interpretation might be in Genkit model itself (harder to fix)
- #003+#004: Might require focus system redesign
- #001: Design decision might reveal more issues

---

## Quick Wins vs. Long-term Fixes

### Quick Win Approach (Get Game Playable)

1. **Workaround #002** (1h):
   - Change item names to match common usage
   - "Reciprocating Saw" → "Power Saw" or just "Saw"
   - Test if AI matches better

2. **Workaround #003+#004** (30min):
   - Update hint messages to tell players to "go to drawer"
   - Accept current behavior, make it clearer

**Result**: Game playable in 1.5 hours, but not ideal

### Proper Fix Approach (Fix Systems)

1. **Fix #002 properly** (8h):
   - Modify AI flow to check inventory
   - Improve name matching priority
   - Test on all items

2. **Fix #003+#004 properly** (6h):
   - Expand focus scope to include children
   - Update all handlers to search children
   - Test on all parent-child relationships

3. **Design #001 solution** (11h):
   - Decide on approach
   - Implement system-wide
   - Test progressive discovery

**Result**: All systems working correctly in 25 hours

---

## Recommendation

### Immediate (Today/This Week):
- **P0**: Fix #002 (AI Interpretation) - blocking gameplay
- Choose: Quick win (rename items) OR proper fix (modify AI flow)

### Next Sprint:
- **P1**: Fix #003+#004 (Parent-Child Access) - breaks flow
- Proper fix recommended (expands to all relationships)

### Future Sprint:
- **P2**: Design #001 (Progressive Discovery) - needs decision
- Requires design discussion before implementation

---

## Issues to Resolve

### 🔴 #001: Progressive Discovery vs. Narrative Consistency

**Added**: 2025-11-07
**Category**: Game Design / Player Experience

**Problem**:
Entities are mentioned in room/object descriptions but mechanically hidden until revealed through specific actions. This creates a disconnect:

- Counter description: "Coffee machine sits on top, humming"
- Player: "go to coffee machine"
- System: "There's no 'coffee machine' here"

The coffee machine is **narratively present** but **mechanically hidden** (requires examining counter first to reveal).

**Why It Matters**:
- Breaks player trust (they see something described but are told it doesn't exist)
- Confusing for new players (no hint about reveal mechanic)
- Makes game feel buggy/broken

**Possible Solutions**:
1. **Smart error messages**:
   - If entity is mentioned in nearby descriptions: "You'll need to examine the counter more closely first"
   - Track "described but not revealed" entities

2. **Different visibility states**:
   - `mentioned`: Appears in descriptions but not interactable
   - `visible`: Can be seen and targeted
   - `accessible`: Can be interacted with
   - Error messages adapt based on state

3. **Rethink reveal mechanics**:
   - Make obvious items (coffee machine on counter) immediately visible
   - Reserve REVEAL for truly hidden things (key inside broken machine)

4. **Tutorial/hint system**:
   - First time player tries hidden entity: hint about examining
   - Progressive teaching of game mechanics

5. **Narrative consistency**:
   - Don't mention entities in descriptions until they're revealed
   - Use vaguer language: "various appliances" instead of "coffee machine"

**Related Code**:
- `src/lib/game/cartridge.ts` (lines 1048-1079) - Counter with hidden children
- `src/lib/game/actions/handle-goto.ts` - Error message when entity not found
- `src/lib/game/engine/VisibilityResolver.ts` - Entity visibility logic

**Decision Needed**:
- Which approach fits the game design best?
- Should all entities be immediately visible?
- Or improve messaging for progressive discovery?

---

## Adding New Issues

When you find an issue to add later, use this template:

```markdown
### 🔴/🟡/🟢/🔵 #XXX: Brief Title

**Added**: YYYY-MM-DD
**Category**: Category Name

**Problem**:
Clear description of the issue and why it's problematic.

**Why It Matters**:
Impact on player experience / code quality / performance.

**Possible Solutions**:
1. Solution approach 1
2. Solution approach 2
3. Solution approach 3

**Related Code**:
- File paths and line numbers
- Related documentation

**Decision Needed** (if applicable):
- Questions to answer before implementing
```

---

### 🔴 #002: AI Interpretation Breaking Item Names

**Added**: 2025-11-08
**Category**: AI / Natural Language Processing

**Problem**:
AI command interpretation is misinterpreting simple item names:
- "saw" → interpreted as "chainsaw" (doesn't exist)
- "saw" → interpreted as "hand saw" (doesn't exist)
- Player has "reciprocating saw" in game with alternateNames: ['saw', 'recip saw', 'reciprocating saw']
- AI not matching to player's actual inventory items

**Why It Matters**:
- Breaks core gameplay - can't interact with items
- Players won't use full technical names ("reciprocating saw")
- Natural language like "use saw" should work
- Escalates frustration quickly

**Examples**:
```
Player: "take the saw"
AI interprets: "chainsaw"
System: "You don't see any 'chainsaw' here"
Reality: Player meant the reciprocating saw in the drawer
```

**Possible Solutions**:
1. **Simplify item names**: Change primary name from "Reciprocating Saw" to just "Saw"
   - Pros: More natural, matches player language
   - Cons: Less specific, might conflict with other saw types

2. **Improve AI inventory awareness**: Make interpret-player-commands check inventory first
   - Pros: Respects what player actually has
   - Cons: Requires AI flow modification

3. **Better alternateNames matching**: Prioritize exact matches in alternateNames
   - Pros: Preserves technical accuracy
   - Cons: Still relies on AI interpretation

4. **Fuzzy matching**: "saw" should match any item with "saw" in name/alternates
   - Pros: More forgiving
   - Cons: Might match wrong items if multiple saws exist

**Related Code**:
- `src/ai/flows/interpret-player-commands.ts` - Command interpretation
- `src/lib/game/cartridge.ts` (line 1969) - item_recip_saw definition
- `src/lib/game/utils/name-matching.ts` - Name matching logic

**Decision Needed**:
- Should items have simple common names or technical accurate names?
- How should AI prioritize inventory vs. world entities?
- Should "saw" always match if only one saw type exists?

---

### 🔴 #003: Children Not Accessible from Parent Focus

**Added**: 2025-11-08
**Category**: Focus System / Parent-Child Relationships

**Problem**:
When focused on parent (Counter), child entities (Drawer) are not accessible:

```
Player: "go to counter" (focus set to Counter)
Player: "open drawer"
System: "I don't see a drawer here"
```

But drawer IS a child of counter:
```typescript
'obj_counter': {
  children: { objects: ['obj_drawer'] }
}
```

And examining counter shows drawer:
```
Player: "examine counter"
Response: "...Below—drawers. Worth checking."
```

**Why It Matters**:
- Parent-child relationships don't work as intended
- Players must "go to drawer" separately even though at counter
- Breaks spatial model (if at counter, should access counter's children)
- Related to progressive discovery issue (#001)

**Current Behavior**:
1. Examine counter → drawer revealed via REVEAL_FROM_PARENT
2. At counter → "open drawer" → not found
3. Must explicitly: "go to drawer"
4. Then at drawer → "take saw" → works

**Expected Behavior**:
1. Examine counter → drawer revealed
2. At counter → "open drawer" → should work (child of current focus)
3. At counter → "take saw from drawer" → should work

**Possible Solutions**:
1. **Expand focus search scope**: When at parent, search includes all children
   - Check: FocusResolver.findEntity or VisibilityResolver

2. **Auto-inherit parent focus**: Drawer automatically gets counter's focus
   - Might conflict with explicit "go to drawer" commands

3. **Smart focus expansion**: "open X" checks current focus + children
   - Handle-open.ts would need to search parent's children

**Related Code**:
- `src/lib/game/engine/FocusResolver.ts` - Focus-aware entity matching
- `src/lib/game/engine/VisibilityResolver.ts` - Entity visibility
- `src/lib/game/actions/handle-open.ts` - Open command
- `src/lib/game/actions/handle-take.ts` - Take command

**Decision Needed**:
- Should parent focus grant access to all children?
- Or must each child be explicitly focused?
- How does this relate to progressive discovery?

---

### 🔴 #004: Taking Items Requires Going to Container First

**Added**: 2025-11-08
**Category**: Focus System / Inventory

**Problem**:
Player at Counter (parent), drawer is child and open, but cannot take items:

```
Player: at Counter (focus)
Player: "take the recip saw"
System: "You remember seeing the Reciprocating Saw at the Drawer.
         If you want to interact with it, you need to go there first."
```

**Why It Matters**:
- Unnecessary extra steps for players
- Counter contains drawer, should be able to access drawer contents
- Breaks flow: examine counter → open drawer → take item (fails)
- Forces: examine → go to drawer → open → take (4 steps instead of 3)

**Possible Solutions**:
1. **Relax focus requirements for children**: Allow taking from children of current focus
2. **Smart parent-child access**: If parent focused and child open, grant access
3. **Remove go-to-child requirement**: Focus on parent = access to all open children

**Related Code**:
- `src/lib/game/actions/handle-take.ts` - Taking items
- `src/lib/game/engine/FocusResolver.ts` - Focus scope

**Decision Needed**:
- Is the current behavior (must go to each child) intentional?
- Or should parent focus grant access to open children?

---

## Resolved Issues

*When an issue is resolved, move it here with resolution details*

### ✅ #005: Items Revealed from Items Not Takeable

**Resolved**: 2025-11-09
**Problem**: When an item (note) is a child of another item (book), which is a child of an object (bookshelf), the grandchild item couldn't be taken even after being revealed via REVEAL_FROM_PARENT.

**Root Cause**: `findBestMatch` in `name-matching.ts` only searched direct children of focused entities, not grandchildren. When focus was on bookshelf, it included the book but not the note inside the book.

**Solution**: Modified `name-matching.ts` to recursively get ALL descendants (including grandchildren) when searching entities in focus. Now items can have items as children, and they're properly accessible.

**Files Changed**:
- `src/lib/game/utils/name-matching.ts` (lines 223-252)

**Impact**: Fixes parent-child-grandchild accessibility globally for all entity types.

---

### ✅ #006: Objects Openable When Locked

**Resolved**: 2025-11-09
**Problem**: Objects with `isLocked: true` could be opened without unlocking them first. The engine's generic fallback in `handle-open.ts` didn't check lock status.

**Root Cause**: The generic fallback (when no specific handler exists) directly set `isOpen: true` without validating the `isLocked` state.

**Solution**: Added lock validation check in `handle-open.ts` generic fallback. Now checks runtime state and returns appropriate message if locked.

**Files Changed**:
- `src/lib/game/actions/handle-open.ts` (lines 87-97)

**Impact**: Enforces lock mechanics globally for all lockable objects.

---

### ✅ #007: Conditional Handlers Not Evaluating Properly

**Resolved**: 2025-11-09
**Problem**: When multiple conditional handlers shared the same `itemId` (e.g., bookshelf with saw having 3 different conditional responses), only the first handler was checked. If its conditions weren't met, player got generic "didn't work" message even though other handlers matched.

**Root Cause**: `handle-use.ts` used `.find()` which returns the FIRST matching handler by itemId, not the first where conditions match.

**Solution**: Changed to `.filter()` to get ALL matching handlers, then iterate through them evaluating conditions, returning the first one with a valid outcome.

**Files Changed**:
- `src/lib/game/actions/handle-use.ts` (lines 98-139)

**Impact**: Enables proper state-based conditional branching for all use handlers. Multiple handlers with same itemId now work correctly based on game state.

**Pattern**: This follows Pattern 2 (Multi-State Handlers) from `handler-resolution-and-media.md`.

---

### Example Format:
```markdown
### ✅ #XXX: Issue Title
**Resolved**: YYYY-MM-DD
**Solution**: Brief description of how it was fixed
**Related Commit/PR**: Link or description
```

---

## Notes

- Review this backlog periodically (weekly/monthly)
- Prioritize before major releases
- Update status as priorities change
- Link to GitHub issues if using issue tracker
