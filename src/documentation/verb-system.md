# 12-Verb Interaction System

## Philosophy

**Brutally minimal. Player mental economy is king. Noir needs speed + certainty.**

The entire object interaction surface is locked to **12 core verbs**. Everything else aliases to one of these. The AI's role is simplified: it only maps natural language → core verbs. 80% of interactions are defined in the cartridge by designers, 20% handled by generic AI fallback.

## Core Verbs & Aliases

### 1. EXAMINE
**Aliases**: look, inspect, study, check, observe, view, scrutinize, survey, scan, peer at
**Purpose**: Get detailed description of an object/item
**Example**: "examine bookshelf", "look at coffee machine", "inspect the pipe"

### 2. TAKE
**Aliases**: pick up, grab, collect, get, acquire, pocket, snatch
**Purpose**: Add item to inventory
**Example**: "take iron pipe", "grab the key", "pick up the note"

### 3. DROP
**Aliases**: dump, discard, leave, place, put down, release, abandon
**Purpose**: Remove item from inventory, place in current location
**Example**: "drop the pipe", "leave the key here", "put down the note"

### 4. USE
**Aliases**: apply, operate, activate, press, switch, turn on, turn off, flip, hit, smash, whack, strike, attack, break with
**Purpose**: Use an item (standalone) or use item on object
**Example**: "use phone", "hit coffee machine with pipe", "smash window with rock"

### 5. COMBINE
**Aliases**: merge, attach, connect, join, mix, put together, add to
**Purpose**: Combine two items in inventory
**Example**: "combine key with lockpick", "attach rope to hook"

### 6. OPEN
**Aliases**: unlock, unseal, unfasten, pry open, force open
**Purpose**: Open containers, doors, sealed objects
**Example**: "open drawer", "unlock door", "pry open box"

### 7. CLOSE
**Aliases**: lock, seal, shut, fasten, secure
**Purpose**: Close containers, doors, open objects
**Example**: "close drawer", "lock door", "shut window"

### 8. MOVE
**Aliases**: push, pull, slide, shift, shove, drag, lift, tilt, rotate
**Purpose**: Physically reposition an object, reveal hidden items
**Example**: "move chalkboard", "push bookshelf", "slide desk"

### 9. BREAK
**Aliases**: damage, force, smash, destroy, shatter, crack, demolish
**Purpose**: Destructive interaction (without using another item)
**Example**: "break window", "smash vase", "force lock"

### 10. READ
**Aliases**: peruse, scan text, review, study text, decipher
**Purpose**: Read text on documents, screens, signs, books
**Example**: "read note", "peruse menu", "scan article"

### 11. SEARCH
**Aliases**: look inside, check inside, look under, check under, look behind, check behind, rummage through, dig through, explore
**Purpose**: Search containers, hidden areas, pockets, drawers
**Example**: "search drawer", "look behind chalkboard", "check under desk", "rummage through pockets"

### 12. TALK
**Aliases**: speak to, chat with, converse with, ask, question, greet, say hi to
**Purpose**: Initiate conversation with NPCs
**Example**: "talk to bartender", "speak to detective", "greet the stranger"

---

## Handler Structure

Every object/item defines responses for **all applicable verbs**. Each verb has:

```typescript
handlers: {
  onExamine: {
    success: {
      message: "Noir-flavored description",
      media?: { url: string, description: string, hint?: string },
      effects?: Effect[]
    },
    fail?: {
      message: "Why it failed + hint at what IS possible",
      media?: { url: string, description: string, hint?: string }
    },
    conditions?: Condition[]
  },
  onTake: { ... },
  onDrop: { ... },
  onUse: { ... },
  // etc for all 12 verbs
}
```

### Fail Message Guidelines

Every fail response should:
1. Explain why the action failed (noir flavor)
2. **Hint at what IS possible** on this object
3. Guide player toward productive interactions

**Example**:
```typescript
onBreak: {
  fail: {
    message: "The bookshelf is solid oak — you're not breaking that with your bare hands. But you could MOVE it, SEARCH it, or EXAMINE it more closely."
  }
}
```

---

## AI Role (Simplified)

The AI interpreter's job is **only** to map natural language → core verbs:

- "check behind the chalkboard" → **SEARCH** (behind)
- "hit the machine with the pipe" → **USE** (pipe on machine)
- "smash the window" → **BREAK** (window)
- "what's in the drawer" → **SEARCH** (drawer)
- "pick up that thing" → **TAKE** (thing)

The AI does **not** make game design decisions. It simply routes to the verb handlers defined in the cartridge.

---

## Fallback Behavior

If a verb is not defined for an object, show a generic response with hints:

```
"You can't [verb] the [object]. Try: EXAMINE, MOVE, or SEARCH it."
```

List only the verbs that ARE defined for that object.

---

## Media Support

Both `success` and `fail` outcomes can include media:

```typescript
success: {
  message: "The pipe falls into your hands. Heavy. Brutal. Perfect.",
  media: {
    url: "https://cloudinary.com/pipe-in-hand.png",
    description: "Iron pipe clutched in detective's hand",
    hint: "Could be useful for breaking things..."
  },
  effects: [
    { type: 'ADD_ITEM', itemId: 'item_iron_pipe' }
  ]
}
```

---

## Implementation Priority

1. Apply 12-verb structure to core objects first:
   - Chalkboard Menu
   - Coffee Machine
   - Bookshelf
   - Iron Pipe
   - Mysterious Note

2. Write noir-flavored responses for each verb (success/fail)

3. Add media URLs where appropriate

4. Test natural language mapping

5. Apply to remaining objects

---

## Noir Writing Style

Keep responses:
- **Terse**: 1-2 sentences max
- **Atmospheric**: Rain, shadows, jazz, smoke
- **Cynical**: Hard-boiled detective voice
- **Sensory**: What you see, hear, smell, feel
- **Urgent**: No flowery descriptions

**Good**: "The pipe's cold, heavy. Iron that's seen violence before."
**Bad**: "You carefully examine the marvelous iron pipe, noting its aged patina and considerable weight."
