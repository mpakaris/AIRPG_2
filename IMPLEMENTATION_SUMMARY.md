# 12-Verb Interaction System - Implementation Summary

## Overview

Successfully implemented a deterministic, designer-controlled interaction system that locks the entire game's object interaction surface to **12 core verbs**. This replaces the previous AI-driven game design approach with a brutally minimal, player-focused system optimized for detective noir gameplay.

---

## Philosophy

**"Brutally minimal. Player mental economy is king. Noir needs speed + certainty."**

- **80% designer-controlled**, 20% AI fallback
- AI role simplified: map natural language → core verbs only
- No more AI making game design decisions
- Every object defines responses for all applicable verbs
- Fail messages hint at what IS possible (reduce frustration)
- Noir-flavored, terse writing (1-2 sentences max)

---

## The 12 Core Verbs

ALL player interactions map to these verbs:

1. **examine** - Visual inspection (look, inspect, study)
2. **take** - Pick up items (grab, collect, pocket)
3. **drop** - Drop items (discard, leave, put down)
4. **use** - Use item standalone or on object (apply, activate, hit, smash, whack)
5. **combine** - Combine two items in inventory
6. **open** - Open containers/doors (unlock, pry open)
7. **close** - Close containers/doors (lock, shut)
8. **move** - Reposition objects (push, pull, slide, check behind)
9. **break** - Destructive interaction without tools (smash, destroy)
10. **read** - Read text (peruse, scan text)
11. **search** - Look inside/under/behind (rummage, dig through)
12. **talk** - Initiate NPC conversation

Everything else is an **alias** that maps to one of these 12.

---

## Files Modified

### 1. Documentation Created

**`/src/documentation/verb-system.md`**
- Complete verb mapping guide
- Core verbs with all aliases
- Handler structure documentation
- Noir writing style guide
- Fail message guidelines
- Implementation priority

### 2. Type System Updated

**`/src/lib/game/types.ts`**
- Updated `Outcome` type to support rich media (url, description, hint)
- Added `onDrop`, `onCombine`, `onBreak`, `onSearch` to `Handlers` type
- Un-deprecated `onBreak` and `onSearch` (now core verbs)
- Added `defaultFailMessage` to all handler types
- Updated handler documentation with 12-verb system reference

### 3. All Game Objects Updated

**`/src/lib/game/cartridge.ts`**

Applied 12-verb structure with noir-flavored responses to:

- **Brown Notebook** - Password-protected container
  - All 12 verbs defined with locked/unlocked state handling
  - Special `onUnlock` handler for password validation

- **Chalkboard Menu** - Hides iron pipe
  - onExamine, onRead: Show menu text and "justice" clue
  - onMove: Reveals iron pipe behind it
  - onSearch: Hints to move it
  - Fail messages guide to productive actions

- **Magazine** - Atmospheric flavor object
  - All 12 verbs with noir responses
  - Fail messages clarify it's background atmosphere, not evidence

- **Bookshelf** - Contains "Justice for My Love" book clue
  - onExamine, onRead: Find "justice" book title
  - onSearch: Look through books
  - onMove: Fails (too heavy)

- **Painting** - Hides wall safe
  - onExamine: Notes crooked frame, S.B. signature
  - onMove: Reveals wall safe behind it
  - onSearch: Hints to move it

- **Coffee Machine** - Breakable, contains hidden key
  - onExamine: Notes warped service panel (with state-based images)
  - onUse (with iron pipe): Breaks open, reveals deposit key
  - onBreak: Hints to use pipe
  - onSearch: Checks cavity when broken

- **Wall Safe** - Requires key to unlock
  - onExamine: Describes locked safe (with state images)
  - onUse (with safe key): Unlocks and reveals document
  - onOpen: Requires unlock first
  - onSearch: Shows contents when unlocked

### 4. AI Prompt Completely Rewritten

**`/src/ai/flows/interpret-player-commands.ts`**

- AI role redefined: **"verb mapper, not chatbot"**
- Comprehensive 12-verb mapping with all aliases
- Clear examples for each verb
- Priority rules for ambiguous cases:
  - "check behind X" → **search X** (not move)
  - "look inside X" → **search X** (not examine)
  - "hit/smash/whack X with Y" → **use Y on X**
  - "smash X" alone → **break X**
- Removed AI decision-making authority
- Focused solely on natural language → core verb translation

---

## Key Design Patterns

### Handler Structure

Every object now defines handlers like this:

```typescript
handlers: {
  // 1. EXAMINE - Visual inspection
  onExamine: {
    conditions: [{ type: 'NO_FLAG', flag: 'some_flag' }],
    success: {
      message: "Terse noir description.",
      media: {
        url: "https://cloudinary.com/image.png",
        description: "Alt text",
        hint: "What this reveals"
      },
      effects: [/* state changes */]
    },
    fail: {
      message: "Why it failed + hint at what IS possible."
    }
  },

  // 2. TAKE - Pick up
  onTake: {
    fail: {
      message: "Can't take this. Try EXAMINING or MOVING it."
    }
  },

  // ... all 12 verbs ...

  // Fallback for undefined actions
  defaultFailMessage: "That doesn't work. Try: EXAMINE, MOVE, or SEARCH it."
}
```

### Noir Writing Style

**Good**: "Chrome and steel, Italian pride. But wrong—a service panel, warped. Screws stripped."

**Bad**: "You carefully examine the marvelous Italian coffee machine, noting its aged patina."

**Rules**:
- 1-2 sentences max
- Terse, atmospheric
- Sensory details (cold, rust, scrapes)
- Cynical detective voice
- No flowery descriptions

### Fail Message Strategy

Every fail message now:
1. Explains why it failed (noir flavor)
2. **Hints at what IS possible** on this object
3. Guides player toward productive interactions

**Example**:
```
"Locked. Can't search. Need the PASSWORD."
"Bolted furniture. Try EXAMINING or MOVING it."
"Smashing the menu? Vandalism. Try MOVING it."
```

---

## Benefits

### 1. **Predictability**
- Players know exactly what verbs work
- No more "AI didn't understand me" frustration
- Fail messages guide to correct verbs

### 2. **Designer Control**
- Every interaction defined in cartridge
- No AI making game design decisions
- Complete control over puzzle flow

### 3. **Performance**
- AI only maps verbs (simpler, faster)
- No complex AI decision-making during gameplay
- Cleaner, more deterministic behavior

### 4. **Player Mental Economy**
- Only 12 verbs to remember
- Fail messages teach the system
- Noir speed and certainty

### 5. **Maintainability**
- Clear handler structure
- Easy to add new objects
- Self-documenting code

---

## Testing Checklist

To test the new system:

1. **Natural Language Mapping**
   - [ ] "check behind chalkboard" → moves chalkboard
   - [ ] "hit machine with pipe" → uses pipe on machine
   - [ ] "look inside safe" → searches safe
   - [ ] "smash coffee machine" → breaks machine (or prompts for pipe)

2. **Fail Messages**
   - [ ] Try invalid verbs → see helpful fail messages
   - [ ] Fail messages suggest correct verbs
   - [ ] Noir flavor maintained in all messages

3. **State-Based Behavior**
   - [ ] Coffee machine: examine shows different images (default vs broken)
   - [ ] Wall safe: locked vs unlocked states
   - [ ] Brown notebook: locked vs open states

4. **Complete Puzzles**
   - [ ] Move chalkboard → take iron pipe
   - [ ] Use iron pipe on coffee machine → get deposit key
   - [ ] Move painting → reveal safe
   - [ ] Use safe key on safe → get document
   - [ ] Solve notebook password → get SD card and article

---

## Next Steps

1. **Testing** - Playtest the cafe scene end-to-end
2. **Apply to Items** - Apply 12-verb structure to all items (not just objects)
3. **Apply to NPCs** - Define 12-verb responses for NPC interactions
4. **Expand Objects** - Add remaining cafe objects (if any)
5. **Chapter 2+** - Apply system to future chapters

---

## Breaking Changes

⚠️ **Important**: This is a major architectural change.

- Old handler patterns are still supported (backward compatible)
- But new handlers should use the 12-verb system
- AI prompt completely changed (may affect existing behavior)
- Test thoroughly before deploying

---

## Items Completed

Successfully applied 12-verb structure to **ALL 10 items**:

✅ **item_player_phone** - FBI smartphone with camera/messaging
✅ **item_iron_pipe** - Heavy tool for breaking things
✅ **item_safe_key** - Brass key for wall safe
✅ **item_sd_card** - Contains video of Silas Bloom
✅ **item_newspaper_article** - 1940s clipping about Silas
✅ **item_secret_document** - Confidential file from safe
✅ **item_business_card** - SAXO musician card with ROSE/1943
✅ **item_book_deal** - Business book (flavor)
✅ **item_book_time** - Physics book (flavor)
✅ **item_book_justice** - Romance novel (contains "justice" clue)

**Every item now has:**
- All 12 verb handlers (where applicable)
- Noir-flavored responses
- Fail messages that guide players
- Media support for examine/read actions

---

## Complete Coverage

**Objects:** 7/7 ✅
**Items:** 10/10 ✅
**AI Prompt:** Updated ✅
**Documentation:** Complete ✅

**Total entities with 12-verb structure: 17**

---

## Success Metrics

The system succeeds when:
- ✅ Players never say "the game didn't understand me"
- ✅ Natural language like "check behind X" works correctly
- ✅ Fail messages teach, not frustrate
- ✅ Noir flavor feels consistent and immersive
- ✅ Designer has full control over interactions

---

*Implemented: 2025-11-01*
*Philosophy: Brutally minimal. Player mental economy is king.*
*Status: 100% Complete - All 7 objects + 10 items fully implemented*
