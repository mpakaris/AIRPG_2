# Focus System & Location Media Improvements

## Overview
This document details the comprehensive improvements made to the game's focus/island system and location media handling.

---

## 1. Focus System - The "Island" Concept

### Problem Statement
Players could interact with any object in a location regardless of physical proximity, leading to:
- Ambiguity (e.g., "justice" matching both book title and notebook password)
- Lack of spatial awareness
- No sense of movement within a location
- Generic error messages that didn't explain constraints

### Solution: Focus/Island System
Each container, object, or NPC becomes an "island" that players must position themselves at before interacting.

### Core Architecture

#### Type Definitions (`src/lib/game/types.ts`)
```typescript
// PlayerState focus fields (lines 212-215)
currentFocusId?: string;      // ID of the focused object/item/NPC
previousFocusId?: string;     // Previous focus for transition messages
focusType?: 'object' | 'item' | 'npc';  // Type of focused entity

// Effect types (lines 74-75)
| { type: 'SET_FOCUS'; focusId: string; focusType: 'object' | 'item' | 'npc'; transitionMessage?: string }
| { type: 'CLEAR_FOCUS' }

// Chapter starting focus (lines 829-832)
startingFocus?: {
    entityId: string;
    entityType: 'object' | 'item' | 'npc';
};
```

#### Engine Components

**FocusResolver** (`src/lib/game/engine/FocusResolver.ts`)
- `matchesName()` - Robust entity matching (name, alternateNames, ID variations)
- `getEntitiesInFocus()` - Returns items/objects within the currently focused entity
- `findEntity()` - Focus-aware search with `requireFocus` option for scoped searches
- `getTransitionNarration()` - Generates varied contextual transition messages (18 templates for objects, 6 for NPCs)
- `getOutOfFocusMessage()` - Helpful error messages explaining why an action failed and how to fix it

**GameStateManager** (`src/lib/game/engine/GameStateManager.ts:66-83`)
Handles focus effects:
```typescript
case 'SET_FOCUS':
    // Automatically shows transition message if focus changes
    if (focusChanging && effect.transitionMessage) {
        newMessages.push({...}); // Random varied message
    }
    newState.currentFocusId = effect.focusId;
    newState.focusType = effect.focusType;
    break;

case 'CLEAR_FOCUS':
    newState.previousFocusId = newState.currentFocusId;
    newState.currentFocusId = undefined;
    break;
```

---

## 2. Varied Transition Messages

### Problem
Repetitive "You walk over to X" messages became boring.

### Solution
18 different object transition templates:
- "You step up to {entity}"
- "You move closer to {entity}"
- "You shift your focus to {entity}"
- "You position yourself at {entity}"
- "You concentrate on {entity}"
- And 13 more variations!

6 different NPC transition templates:
- "You approach {entity}"
- "You walk up to {entity}"
- "You turn your attention to {entity}"
- And 3 more variations!

**Implementation**: `src/lib/game/engine/FocusResolver.ts:265-285`

---

## 3. Focus-Aware Error Messages

### Problem
Generic "I can't do that, Burt" didn't explain constraints or how to fix them.

### Solution
Context-aware error messages with 6+ varied templates:

```typescript
FocusResolver.getOutOfFocusMessage(action, targetName, currentFocusId, game)
```

Examples:
- *"I can't move Chalkboard Menu because you're currently at Bookshelf, Burt. You'll need to move to Chalkboard Menu first."*
- *"You're at Bookshelf right now, Burt. To move Chalkboard Menu, you'll need to go over there first."*
- *"I can't reach Chalkboard Menu from Bookshelf, Burt. You'll need to get into the vicinity of Chalkboard Menu first."*

**Implementation**: `src/lib/game/engine/FocusResolver.ts:296-343`

---

## 4. Action Handler Updates

### Focus Validation
All action handlers now validate focus before allowing actions:

**handle-move.ts** (`src/lib/game/actions/handle-move.ts:41-57`)
```typescript
// FOCUS VALIDATION: Check if target is within current focus
if (state.currentFocusId && state.focusType === 'object') {
    const entitiesInFocus = FocusResolver.getEntitiesInFocus(state, game);
    const isInFocus = targetObjectId === state.currentFocusId ||
                     entitiesInFocus.objects.includes(targetObjectId);

    if (!isInFocus) {
        return [{ type: 'SHOW_MESSAGE', speaker: 'agent',
            content: FocusResolver.getOutOfFocusMessage(...)
        }];
    }
}
```

### Focus Setting
Actions automatically set focus when interacting:

**handle-examine.ts** - Sets focus with transition narration
**handle-open.ts** - Sets focus when opening containers
**handle-move.ts** - Sets focus when moving objects
**handle-password.ts** - REQUIRES focus on inputtable objects (solves ambiguity!)

**handle-look.ts** - Clears focus, returns to room-level view

---

## 5. goto/moveto/shift Commands

### Problem
No way to change focus without performing an action (examine/open).

### Solution
New navigation commands (`src/lib/game/actions/handle-goto.ts`):
```typescript
// Player can position themselves at objects/NPCs
goto bookshelf     // Changes focus to bookshelf
move to chalkboard // Changes focus to chalkboard
shift to safe      // Changes focus to safe
```

**Features**:
- Shows transition narration
- Prevents goto to inventory items
- Shows helpful message if already at target
- Can't goto items (only objects/NPCs)

**Registered Commands** (`src/lib/game/commands.ts:4-6`):
- `goto <object or npc>`
- `move to <object or npc>`
- `shift to <object or npc>`

**AI Integration** (`src/ai/flows/interpret-player-commands.ts:65-67`):
AI now distinguishes between:
- `go` = move between locations/rooms
- `goto/moveto/shift` = position at object/NPC within location

---

## 6. Chapter Starting Focus

### Problem
Players started games without clear direction on where to begin.

### Solution
Chapters now specify a starting focus that guides players to the main objective.

**Type Definition** (`src/lib/game/types.ts:829-832`):
```typescript
startingFocus?: {
    entityId: string;  // ID of the object/item/NPC to focus on initially
    entityType: 'object' | 'item' | 'npc';
};
```

**Example Configuration** (`src/lib/game/cartridge.ts:903-906`):
```typescript
'ch1-the-cafe': {
    startingFocus: {
        entityId: 'obj_brown_notebook',
        entityType: 'object'
    },
    // ... rest of chapter
}
```

**Initialization** (`src/lib/game-state.ts:233-236`):
```typescript
currentFocusId: startChapter.startingFocus?.entityId,
focusType: startChapter.startingFocus?.entityType,
```

**Benefits**:
- Natural tutorial effect
- Players start focused on key objective
- Can't accidentally interact with wrong objects
- Learn focus system organically

---

## 7. Location Wide Shot Media

### Problem
"Look around" command showed text description but no visual context of the full location.

### Solution
Locations now support wide shot images that display when using "look around".

### Implementation

**Type Support** (`src/lib/game/types.ts:784`)
```typescript
export type Location = {
    sceneImage?: ImageDetails;  // Wide shot image for "look around"
    // ... other fields
}
```

**Effect Type Update** (`src/lib/game/types.ts:100`)
```typescript
| { type: 'SHOW_MESSAGE';
    imageId?: string;      // Entity-based image (existing)
    imageUrl?: string;     // Direct URL (NEW - for locations)
    messageType?: Message['type']
}
```

**Location Configuration** (`src/lib/game/cartridge.ts:811`):
```typescript
'loc_cafe_interior': {
    sceneImage: {
        url: 'https://res.cloudinary.com/dg912bwcc/image/upload/v1761156561/bustling_cafe_bluwgq.jpg',
        description: 'A view of the bustling cafe interior.',
        hint: 'bustling cafe'
    },
    // ... rest of location
}
```

**Handler Update** (`src/lib/game/actions/handle-look.ts:40-51`):
```typescript
const messageEffect: Effect = {
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: fullDescription.trim()
};

// Add location image for wide shot view
if (location.sceneImage) {
    messageEffect.messageType = 'image';
    messageEffect.imageUrl = location.sceneImage.url;
}
```

**Effect Processing** (`src/lib/game/actions/process-effects.ts:116-130`):
```typescript
// If direct imageUrl is provided (e.g., for location wide shots)
if (messageImageUrl) {
    enhancedMessage = createMessage(...);
    enhancedMessage.image = {
        url: messageImageUrl,
        description: 'Location view',
        hint: 'wide shot'
    };
}
```

**Benefits**:
- Visual context for entire location
- Helps players orient themselves spatially
- Standardized "look around" = description + wide shot
- Works alongside object-specific images

---

## 8. Password System Focus Requirement

### Problem
"justice" could match both:
- Book title "Justice for my love" (global)
- Notebook password "justice" (inside focused notebook)

### Solution
Password input now REQUIRES focus on the inputtable object.

**Implementation** (`src/lib/game/actions/handle-password.ts:19-28`):
```typescript
// CRITICAL: Password input REQUIRES focus on an inputtable object
if (!state.currentFocusId || state.focusType !== 'object') {
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: 'You need to focus on something first. Try examining or opening the object you want to interact with.'
    }];
}
```

**Workflow**:
1. Player: "examine notebook" → Sets focus on notebook
2. Player: "open notebook" → Shows locked message + minigame URL, maintains focus
3. Player: "justice" → Only checks the FOCUSED notebook password
4. ✅ No more ambiguity!

**Migration**: Replaced `processPassword` with `handlePassword` (`src/app/actions.ts:370-372`)

---

## 9. Commands Reference

### Focus Navigation
- `goto <object/npc>` - Position yourself at an object or NPC
- `move to <object/npc>` - Same as goto
- `shift to <object/npc>` - Same as goto
- `look` / `look around` - Clear focus, see entire room with wide shot
- `exit` / `close` - Clear focus if not in conversation/interaction

### Focus-Aware Actions
- `examine <object/item>` - Sets focus on examined entity
- `open <object>` - Sets focus on opened entity
- `move <object>` - Requires focus on object or its parent
- `password <phrase>` - Requires focus on locked object

---

## 10. Testing Scenarios

### Scenario 1: Notebook Password
```
Player: look around
→ Clears focus, shows cafe wide shot with description

Player: goto notebook
→ "You step up to Brown Notebook."

Player: open notebook
→ "The lock prevents it from being opened... [minigame URL]"
→ Focus maintained on notebook

Player: justice
→ Password checked ONLY against focused notebook
→ ✅ Success! No book title ambiguity
```

### Scenario 2: Focus Enforcement
```
Player: examine bookshelf
→ "You shift your focus to Bookshelf."
→ Focus set on bookshelf

Player: move chalkboard
→ "I can't move Chalkboard Menu because you're currently at Bookshelf, Burt. You'll need to move to Chalkboard Menu first."
→ ✅ Helpful error with guidance

Player: goto chalkboard
→ "You position yourself at Chalkboard Menu."
→ Focus changed

Player: move chalkboard
→ ✅ Works now! Reveals iron pipe
```

### Scenario 3: Starting Focus
```
New game starts
→ currentFocusId = 'obj_brown_notebook'
→ Player is automatically positioned at the key objective

Player: examine notebook
→ ✅ Works immediately

Player: move chalkboard
→ ❌ Out of focus error
→ Player learns they need to move around
```

---

## 11. Files Changed

### New Files
- `src/lib/game/engine/FocusResolver.ts` - Focus system core logic
- `src/lib/game/actions/handle-goto.ts` - goto command handler
- `src/lib/game/actions/handle-password.ts` - Focus-aware password handler

### Modified Files
- `src/lib/game/types.ts` - Focus types, effect types, chapter type
- `src/lib/game/engine/GameStateManager.ts` - Focus effect handlers
- `src/lib/game/engine/index.ts` - Export FocusResolver
- `src/lib/game/actions/handle-examine.ts` - Set focus with transition
- `src/lib/game/actions/handle-open.ts` - Set focus with transition
- `src/lib/game/actions/handle-move.ts` - Focus validation + setting
- `src/lib/game/actions/handle-look.ts` - Clear focus + location media
- `src/lib/game/actions/process-effects.ts` - Handle imageUrl for locations
- `src/lib/game-state.ts` - Initialize starting focus from chapter
- `src/lib/game/cartridge.ts` - Add startingFocus to chapter
- `src/lib/game/commands.ts` - Register goto/moveto/shift commands
- `src/app/actions.ts` - Wire up goto and password handlers
- `src/ai/flows/interpret-player-commands.ts` - Teach AI focus commands

---

## 12. Summary

The focus system creates a spatial game experience where:
- ✅ Players move between "islands" (objects/NPCs) within locations
- ✅ Actions are scoped to the current focus, eliminating ambiguity
- ✅ Error messages are helpful and explain constraints
- ✅ Transition messages are varied and engaging (18+ templates)
- ✅ Chapters guide players with starting focus
- ✅ "Look around" provides visual context with wide shot images
- ✅ Password input is unambiguous (requires focus)
- ✅ Natural tutorial through spatial constraints

This transforms the game from a "bag of commands" into a spatial adventure where players physically navigate and interact with their environment! 🎯
