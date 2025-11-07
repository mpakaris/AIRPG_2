# Development Backlog

**Purpose**: Track fine-print issues, polish items, and design challenges to address later.

**Status Key**:
- 🔴 **Critical** - Breaks player experience
- 🟡 **Important** - Degrades experience, should fix soon
- 🟢 **Polish** - Nice to have, improves quality
- 🔵 **Design Question** - Needs discussion/decision

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

## Resolved Issues

*When an issue is resolved, move it here with resolution details*

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
