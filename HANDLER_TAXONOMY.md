# Handler Taxonomy - Text Adventure Game

## Core Handlers

### Visual Inspection
- **onExamine** - Inspect outer appearance/surface
  - What it looks like, condition, markings
  - Example: "examine safe" → "A heavy wall safe with a combination lock"

### Physical Interaction
- **onOpen** - Open lids, drawers, covers
  - Hinged/lifting motion
  - Example: "open drawer" → reveals contents inside

- **onMove** - Push/slide/shift aside
  - Reveals what's behind
  - Example: "move painting" → reveals safe behind it

- **onTake** - Pick up and add to inventory
  - Example: "take key" → adds to inventory

### Content Access
- **onRead** - Read text content
  - Books, documents, signs, articles
  - Example: "read newspaper" → displays article text

### Item Usage
- **onUse** - Use item on object
  - Defined via `onUseWith: [{ itemId, success, fail }]`
  - Can be: unlock, break, insert, scan, etc.
  - Example: "use key on safe" → unlocks safe
  - Example: "use pipe on machine" → breaks machine

### Conversation
- **onTalk** - Initiate dialogue with NPC
  - Example: "talk to barista" → starts conversation

### Password/Input
- **onUnlock** - Validate password/code
  - Example: "Justice for Silas Bloom" → unlocks notebook

## Deprecated/Removed
- ~~onCheck~~ → Use `onExamine` instead
- ~~onRemove~~ → Use `onMove` instead
- ~~onBreak~~ → Use `onUse` with item handlers instead

## Player Command Mapping

**AI interprets natural language → canonical handlers:**
- "check the safe" / "inspect safe" / "look at safe" → `examine`
- "open book" / "lift lid" → `open`
- "push chalkboard" / "slide painting aside" → `move`
- "grab key" / "pick up card" → `take`
- "read article" / "study document" → `read`
- "hit machine with pipe" / "break machine" → `use pipe on machine`

## Best Practices

1. **onExamine** should describe WHAT you see
2. **onRead** should show the CONTENT/TEXT
3. **onOpen** should reveal what's INSIDE
4. **onMove** should reveal what's BEHIND
5. **onUse** should handle ALL item-on-object interactions
