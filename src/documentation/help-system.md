# Help System Documentation

## Overview

AIRPG_2 features a dual help system that provides contextual assistance to players:

1. **Contextual Help** - Free, natural language help for confused players
2. **Explicit Help** - Limited AI-powered hints tied to chapter progress

Both systems use **entity-aware hint generation** that prioritizes specific object/item help over general story progression.

---

## System Architecture

### Two Help Handlers

#### 1. Contextual Help (`handle-contextual-help.ts`)
- **Trigger**: Natural expressions of confusion
  - "I'm stuck"
  - "What should I do?"
  - "What can I do with X?"
  - "How do I use X?"
- **Cost**: FREE - doesn't count against help limit
- **Purpose**: Gentle guidance without pressure
- **Tone**: Encouraging, atmospheric

#### 2. Explicit Help (`handle-help.ts`)
- **Trigger**: Explicit `/help` command
- **Cost**: Counts against limit (10 AI hints per chapter)
- **Purpose**: Stronger hints when player explicitly asks
- **Tracking**: Uses counter `help_requests_{chapterId}`
- **Fallback**: After 10 uses, shows pre-written hints

---

## Hint Priority System

The help system follows a strict priority order:

### Priority 1: Entity-Specific Help (HIGHEST)

**Triggers when:**
- Player mentions a specific object, item, or NPC in their question
- That entity has `capabilities` OR `handlers` defined

**Examples:**
- "What can I do with the chalkboard?"
- "How do I open the drawer?"
- "What about the books?"

**Response:**
- Atmospheric hint about what the entity can do
- Based on entity's actual capabilities (movable, readable, openable, etc.)
- Does NOT spoil the solution
- Maintains noir mystery tone

**Implementation:**
```typescript
// 1. Detect entities mentioned in player input
const mentionedEntityNames = detectMentionedEntities(playerInput, state, game);

// 2. Find the entity and get its capabilities/handlers
const mentionedEntity = findEntityByName(mentionedEntityNames[0], state, game);

// 3. Generate atmospheric hint
const { hint } = await generateContextualHint({
  focusedEntityName: mentionedEntity.name,
  focusedEntityCapabilities: mentionedEntity.capabilities,
  focusedEntityHandlers: mentionedEntity.handlers,
  // ...
});
```

### Priority 2: Story Progression Help

**Triggers when:**
- No entity mentioned (or entity has no capabilities)
- Chapter has a `happyPath` defined

**Examples:**
- "What should I do next?"
- "I'm stuck"
- "Help" (generic)

**Response:**
- Hint about the next uncompleted step in the happy path
- Uses AI to contextualize based on player's progress
- References completed steps to show progress

**Implementation:**
```typescript
const progress = analyzeHappyPathProgress(state, chapter, game);
const { hint } = await generateContextualHint({
  chapterGoal: chapter.goal,
  currentStepDescription: progress.currentStep.description,
  baseHint: progress.currentStep.baseHint,
  completedSteps: completedStepDescriptions,
  // ...
});
```

### Priority 3: Generic Encouragement (FALLBACK)

**Triggers when:**
- No entity mentioned
- Chapter has NO happy path

**Response:**
- Generic encouragement: "Take your time. Look around..."

---

## Entity Detection System

### How It Works

1. **Normalize Input**: Convert to lowercase
2. **Check All Visible Entities**: Objects, items, NPCs in current location
3. **Match Names**: Full name or partial word match (words >3 letters)
4. **Check Alternate Names**: If entity has `alternateNames` property
5. **Return First Match**: Returns the first matched entity name

### Detection Logic

```typescript
function detectMentionedEntities(question: string, state: PlayerState, game: Game): string[] {
  const normalizedQuestion = question.toLowerCase();
  const mentioned: string[] = [];

  // Check game objects
  for (const obj of location.objects) {
    // Full name match
    if (normalizedQuestion.includes(obj.name.toLowerCase())) {
      mentioned.push(obj.name);
    }
    // Partial word match (words > 3 letters)
    else {
      const nameWords = obj.name.toLowerCase().split(' ');
      const matchesName = nameWords.some(word =>
        word.length > 3 && normalizedQuestion.includes(word)
      );
      if (matchesName) mentioned.push(obj.name);
    }
    // Check alternate names
    if (obj.alternateNames) {
      for (const altName of obj.alternateNames) {
        if (normalizedQuestion.includes(altName.toLowerCase())) {
          mentioned.push(obj.name);
          break;
        }
      }
    }
  }

  // Same logic for items and NPCs...
  return mentioned;
}
```

### Example Matches

| Player Input | Entity Name | Matches? | Reason |
|--------------|-------------|----------|--------|
| "what can i do with the chalkboard?" | "Chalkboard Menu" | ✅ Yes | Word "chalkboard" (>3 letters) |
| "how do i open the drawer?" | "Desk Drawer" | ✅ Yes | Word "drawer" (>3 letters) |
| "what about the card?" | "Business Card" | ✅ Yes | Word "card" (4 letters) |
| "what about the card?" | "SD Card" | ✅ Yes | Word "card" matches both |
| "examine the box" | "Toolbox" | ❌ No | "box" too short (<3 letters) |

**Note**: Ambiguous names like "card" will match multiple entities. The system returns the first match found.

---

## AI Hint Generation

### Dynamic Capability-Based Hints

Instead of manual hints, the system generates atmospheric hints based on entity capabilities and handlers.

### Atmospheric Guidelines

The AI uses these guidelines to generate noir-style, subtle hints:

**For movable objects:**
- "doesn't sit quite right"
- "could be shifted"
- "something off about its position"
- "not flush with the wall"

**For readable objects:**
- "text catches your eye"
- "worth reading more carefully"
- "handwriting looks deliberate"
- "details stand out"

**For breakable objects:**
- "looks fragile"
- "old mechanisms that might give"
- "wear and tear shows"
- "could come apart"

**For openable objects:**
- "seems like it could be accessed"
- "not quite closed"
- "latch looks workable"
- "might reveal something"

**For red herrings/flavor objects:**
- "Probably just scenery. Then again, in a case like this..."
- "Nothing special catches your eye"

### AI Prompt Structure

```handlebars
**CRITICAL PRIORITY RULES:**

1. **TIER 1 (HIGHEST PRIORITY) - Entity-Specific Atmospheric Hints:**
   - If player asked about a SPECIFIC entity OR is focused on one with capabilities/handlers:
     * Generate atmospheric, suggestive hints based on what the entity can do
     * Be noir-style, subtle, and preserve mystery
     * DON'T explicitly list actions - weave them into atmospheric descriptions
     * DON'T spoil what will happen - suggest possibilities

2. **TIER 2 - General Progression:**
   - Only use if player asks general questions ("what now?", "where do I go?")
   - Use base/detailed hints for overall progress
   - Don't mention specific entities unless player is completely stuck

3. **Response Quality:**
   - 2-3 sentences, noir-style, atmospheric
   - Suggest without instructing
   - Maintain mystery and discovery
   - Vary phrasing naturally
```

### Good vs Bad Examples

✅ **GOOD (Entity-specific, atmospheric):**
> "The board doesn't sit flush with the wall. There's something deliberate about how it's angled. Worth taking a closer look, or checking what's written on it."

❌ **BAD (Too explicit):**
> "You can move the chalkboard, read it, or examine it."

✅ **GOOD (General progress):**
> "You haven't talked to everyone here yet. The staff might have seen something."

❌ **BAD (Entity-specific when asking general question):**
> "Read the books on the shelf."

---

## Command Routing

### Pre-Filter System (Deterministic)

Before AI interpretation, `actions.ts` uses a fast regex pre-filter to catch help questions instantly (0ms vs 40,000ms AI time).

```typescript
const lowerInput = preprocessedInput.toLowerCase();
const isHelpQuestion =
  lowerInput.startsWith('what should i do with') ||
  lowerInput.startsWith('what can i do with') ||
  lowerInput.startsWith('how do i') ||
  lowerInput.startsWith('what about') ||
  lowerInput === "i'm stuck" ||
  lowerInput === "im stuck" ||
  lowerInput === "i don't know what to do" ||
  lowerInput === "what should i do" ||
  lowerInput === "what do i do" ||
  lowerInput === "help me" ||
  lowerInput.includes("what should i do next");

if (isHelpQuestion) {
  safetyNetResult = {
    commandToExecute: `contextual_help ${preprocessedInput}`,
    confidence: 1.0,
    source: 'bypass',
    aiCalls: 0,
  };
}
```

**Benefits:**
- Instant routing (no AI delay)
- 100% reliable (no AI misinterpretation)
- No API costs for help requests
- Preserves full player input for entity detection

---

## Help Limit System

### Only for Explicit Help

The help limit ONLY applies to the explicit `/help` command, not contextual help.

**Limits:**
- 10 AI-powered hints per chapter
- Tracked via counter: `help_requests_{chapterId}`
- After limit: Falls back to pre-written hints (no AI)

**Implementation:**
```typescript
const helpCounterKey = `help_requests_${state.currentChapterId}`;
const currentHelpCount = state.counters?.[helpCounterKey] || 0;
const helpsRemaining = MAX_AI_HELPS_PER_CHAPTER - currentHelpCount;

if (helpsRemaining > 0) {
  // Generate AI hint
  effects.push({ type: 'INC_COUNTER', key: helpCounterKey, by: 1 });
} else {
  // Use pre-written hint
  hintContent = progress.currentStep.detailedHint || progress.currentStep.baseHint;
}
```

**User Feedback:**
- Shows remaining hints: "💬 AI Hints remaining: 7/10"
- Warning at 3 or fewer: "⚠️ You have 3 AI-powered hints remaining"
- At limit: "🔋 You've used all 10 AI-powered hints for this chapter"

---

## Code Flow Diagram

```
Player Input: "What can I do with the chalkboard?"
    ↓
[actions.ts] Pre-filter detects help question (0ms)
    ↓
Routes to: contextual_help
    ↓
[handle-contextual-help.ts] handleContextualHelp()
    ↓
1. detectMentionedEntities("what can i do with the chalkboard?")
   → Returns: ["Chalkboard Menu"]
    ↓
2. findEntityByName("Chalkboard Menu")
   → Returns: { name, capabilities: { movable, readable }, handlers: ["onMove", "onRead"] }
    ↓
3. generateContextualHint({
     focusedEntityName: "Chalkboard Menu",
     focusedEntityCapabilities: { movable: true, readable: true },
     focusedEntityHandlers: ["onMove", "onRead"]
   })
    ↓
[AI] Generates atmospheric hint based on capabilities
    ↓
Returns: "That chalkboard menu looks like it's seen better days.
          The way it's positioned... it doesn't seem quite right.
          Maybe there's more to it than just the specials."
```

---

## Files Involved

### Core Files
- **`src/lib/game/actions/handle-contextual-help.ts`** - Natural language help handler
- **`src/lib/game/actions/handle-help.ts`** - Explicit /help command handler
- **`src/ai/flows/generate-contextual-hint.ts`** - AI hint generation flow
- **`src/app/actions.ts`** - Command routing with pre-filter (line 829-841)

### Helper Functions
Both help handlers share these utility functions:

```typescript
// Get entity name by ID
function getEntityName(entityId: string, game: Game): string

// Extract capabilities and handlers from entity
function getEntityInfo(entityId: string, game: Game): { capabilities?, handlers? }

// Detect entity names mentioned in player's question
function detectMentionedEntities(question: string, state: PlayerState, game: Game): string[]

// Find entity by name and return its info
function findEntityByName(entityName: string, state: PlayerState, game: Game): { name, capabilities?, handlers? }
```

---

## Debugging

### Debug Logging

Both help handlers include extensive debug logging:

```typescript
console.log('[CONTEXTUAL HELP] Player input:', playerInput);
console.log('[CONTEXTUAL HELP] Detected entities:', mentionedEntityNames);
console.log('[CONTEXTUAL HELP] Found entity:', mentionedEntity);
console.log('[CONTEXTUAL HELP] Capabilities:', focusedEntityCapabilities);
console.log('[CONTEXTUAL HELP] Handlers:', focusedEntityHandlers);
```

### Common Issues

**Issue**: Generic hint instead of entity-specific hint
- Check: Is entity detection running? Look for `[CONTEXTUAL HELP] Detected entities:` in logs
- Check: Does the entity have capabilities or handlers defined in cartridge?
- Check: Is the entity name/word >3 letters long?

**Issue**: Help question not being detected
- Check: Is the pre-filter pattern matching? (line 829-841 in actions.ts)
- Check: Is old help system disabled? (line 843-858 should be commented out)

**Issue**: AI generates wrong type of hint
- Check: AI prompt in `generate-contextual-hint.ts`
- Check: Are capabilities/handlers being passed correctly?
- Check: Is `mentionedEntityNames` populated?

---

## Future Improvements

### Potential Enhancements

1. **Smart Entity Disambiguation**
   - When "card" matches both "Business Card" and "SD Card"
   - Use context (location, inventory, recent actions) to pick the right one

2. **Multi-Entity Hints**
   - "What can I do with the card and the computer?"
   - Combine multiple entity hints

3. **Progress-Aware Entity Hints**
   - If player already tried an action, suggest alternatives
   - "You've already read the note. Maybe there's something else about it?"

4. **Conversation Memory**
   - Remember what hints were given
   - Avoid repeating the same suggestion

5. **Hint Escalation**
   - First hint: subtle and atmospheric
   - Second hint: more direct
   - Third hint: very explicit

---

## Testing

### Test Cases

Test the help system with these scenarios:

#### Entity-Specific Help
```
✓ "what can i do with the chalkboard?"
✓ "how do i open the drawer?"
✓ "what about the books?"
✓ "i don't know what to do with the computer"
```

Expected: Atmospheric hint about that specific entity's capabilities

#### General Progression
```
✓ "what should i do?"
✓ "i'm stuck"
✓ "help"
✓ "what do i do next?"
```

Expected: Hint about next step in happy path (if entity not mentioned)

#### Edge Cases
```
✓ "what can i do with the card?" (multiple matches)
✓ "help me with the box" (word too short)
✓ "what about the xyz?" (non-existent entity)
```

Expected: Graceful fallback to general hints

---

## Maintenance

### When Adding New Entities

NO MAINTENANCE REQUIRED for hints! The system automatically:
1. Detects entity names in player questions
2. Reads capabilities and handlers from cartridge
3. Generates atmospheric hints dynamically

Just ensure entities have:
- **`capabilities`**: `{ movable?, openable?, readable?, breakable?, takable?, usable? }`
- **`handlers`**: Object with keys like `onMove`, `onRead`, `onExamine`, etc.

### When Modifying Help Patterns

To add new help question patterns, edit the pre-filter in `actions.ts` (line 829-841):

```typescript
const isHelpQuestion =
  lowerInput.startsWith('what should i do with') ||
  lowerInput.startsWith('what can i do with') ||
  // Add new pattern here:
  lowerInput.startsWith('your new pattern') ||
  // ...
```

### When Changing AI Behavior

To modify hint style/tone, edit the prompt in `generate-contextual-hint.ts` (line 47-144):
- Update atmospheric guidelines
- Change priority rules
- Add/remove examples

---

## Credits

Implemented: 2025-12-02
Developers: Claude Code + Niko
Approach: Entity-aware, capability-based dynamic hint generation
Philosophy: Zero-maintenance, always accurate, atmospheric hints
