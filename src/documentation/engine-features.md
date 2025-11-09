# Engine Features Documentation

**Purpose**: Documents global engine behaviors and effect types that apply to all games.

**Last Updated**: 2025-01-09

---

## Effect Types

The game engine uses an effect-based system. Handlers return `Effect[]` arrays that are processed by `GameStateManager`.

### NPC-Related Effects

#### `INCREMENT_NPC_INTERACTION`
**Purpose**: Tracks conversation turns with an NPC.

**Usage**:
```typescript
{ type: 'INCREMENT_NPC_INTERACTION', npcId: 'npc_barista' }
```

**Behavior**:
- Increments `state.world[npcId].interactionCount` by 1
- Used for progressive reveals (unlock topics after N interactions)
- Automatically called on each conversation turn

**Example**:
```typescript
// After 3 conversations, unlock a new topic
progressiveReveals: [
  {
    triggerOnInteraction: 3,
    topicId: 't_secret_info'
  }
]
```

---

#### `COMPLETE_NPC_TOPIC`
**Purpose**: Marks a topic as completed (for `once: true` topics).

**Usage**:
```typescript
{ type: 'COMPLETE_NPC_TOPIC', npcId: 'npc_barista', topicId: 't_give_card' }
```

**Behavior**:
- Adds `topicId` to `state.world[npcId].completedTopics[]`
- Prevents topic from being offered again
- Automatically added when `topic.once === true`

**Important**: Do NOT manually add this effect - it's added automatically by the conversation handler.

---

#### `DEMOTE_NPC`
**Purpose**: Changes NPC from story-critical (Type 1) to ambient (Type 2).

**Usage**:
```typescript
{ type: 'DEMOTE_NPC', npcId: 'npc_barista' }
```

**Behavior**:
- Sets `state.world[npcId].stage = 'demoted'`
- Sets `state.world[npcId].importance = 'ambient'`
- After demotion, NPC uses `postCompletionProfile` instead of regular topics

**Triggered By**: `demoteRules` in NPC definition
```typescript
demoteRules: {
  onFlagsAll: ['has_received_business_card'],
  then: { setStage: 'demoted', setImportance: 'ambient' }
}
```

---

#### `START_CONVERSATION` / `END_CONVERSATION`
**Purpose**: Track active conversation state.

**Usage**:
```typescript
{ type: 'START_CONVERSATION', npcId: 'npc_barista' }
{ type: 'END_CONVERSATION' }
```

**Behavior**:
- Sets/clears `state.activeConversationWith`
- While in conversation, all input goes to conversation handler
- Typing "goodbye", "bye", "exit" ends conversation

---

### Flag Effects

#### `SET_FLAG`
**Purpose**: Set a boolean flag for game state tracking.

**Usage**:
```typescript
{ type: 'SET_FLAG', flag: 'has_received_business_card', value: true }
```

**CRITICAL**: Always include `value: true` or `value: false`. Missing value will set flag to `undefined`, breaking all flag checks.

**Common Mistake**:
```typescript
// ❌ WRONG - sets to undefined
{ type: 'SET_FLAG', flag: 'my_flag' }

// ✅ CORRECT - sets to true
{ type: 'SET_FLAG', flag: 'my_flag', value: true }
```

---

## NPC Initialization Behavior

### Hiding NPCs Behind Locked/Closed Objects

**Feature**: NPCs can be hidden initially if they're in the `nearbyNpcs` of a locked or closed object.

**Implementation** (src/lib/game-state.ts):
```typescript
// Check if NPC is in nearbyNpcs of a locked/closed object
for (const objId in game.gameObjects) {
  const obj = game.gameObjects[objId];
  if (obj.nearbyNpcs?.includes(npc.id)) {
    if (obj.state?.isLocked || (!obj.state?.isOpen && obj.capabilities?.openable)) {
      isHiddenBehindObject = true;
    }
  }
}

world[npc.id] = {
  isVisible: !isHiddenBehindObject,
  // ... other properties
};
```

**Usage Pattern**:
```typescript
// Hidden door (locked)
obj_hidden_door: {
  nearbyNpcs: ['npc_victim_girl'],
  state: { isLocked: true },
  // ... other properties
}

// Victim girl is hidden until door is unlocked and opened
```

**How It Works**:
1. At game start, engine checks all objects with `nearbyNpcs`
2. If object is locked or closed, NPCs in `nearbyNpcs` start hidden
3. When object is opened via `REVEAL_FROM_PARENT`, NPC becomes visible
4. NPC must also be in `location.npcs` array to be findable

---

## Talk Command Behavior

### NPCs as Zones

**Feature**: "Talk to X" works from anywhere in the location, automatically shifting focus to the NPC.

**Implementation** (src/lib/game/actions/handle-talk.ts):

**Behavior**:
1. Searches **all NPCs in current location** (not just nearby ones)
2. Finds best name match
3. Shows **transition message**: "You make your way to the [location] to talk to [NPC]."
4. **Auto-focuses on NPC**: Sets `state.currentFocusId = npcId`, `state.focusType = 'npc'`
5. Starts conversation
6. Shows welcome message with NPC image

**Example Flow**:
```
Player: "talk to barista"

Narrator: "You make your way to the Counter to talk to Barista."
System: "You are now talking to Barista. Type 'goodbye' to end."
Barista: "What can I get for you?"
[Shows barista image]
```

**Location Detection**:
- Engine searches for objects with `nearbyNpcs` containing the NPC
- Uses that object's name for transition message
- Falls back to generic "You approach [NPC]" if no location found

---

## Special Commands

### `/map` Command

**Purpose**: Show chapter-specific map to player.

**Implementation** (src/app/actions.ts):
```typescript
else if (lowerInput === '/map') {
  const chapterMaps: Record<string, string> = {
    'ch1-the-cafe': 'https://cloudinary.com/.../cafe_map.png',
    // Add more chapters here
  };

  const mapUrl = chapterMaps[currentState.currentChapterId] || chapterMaps['ch1-the-cafe'];

  // Show as image message from narrator
}
```

**Usage Pattern**:
1. Player types `/map`
2. Engine looks up current chapter ID
3. Shows corresponding map image
4. Falls back to first chapter if not found

**To Add New Chapters**:
Just add to `chapterMaps` object with chapter ID as key.

---

## Design Principles

### Data-Driven Architecture

**CRITICAL**: The engine must work for thousands of games, not just this one.

**Rules**:
1. **Never hardcode game-specific logic** - Put it in the cartridge
2. **Always think global** - "Will this work for 1000 games?"
3. **Document engine changes** - Update this file when adding new features
4. **Keep effects generic** - No `BARISTA_GIVES_CARD` effects, use `ADD_ITEM` + `SET_FLAG`

**Good Example**:
```typescript
// ✅ Generic, works for any NPC
{ type: 'DEMOTE_NPC', npcId: npc.id }
```

**Bad Example**:
```typescript
// ❌ Game-specific, breaks for other games
if (npc.id === 'npc_barista' && flag === 'has_card') {
  // Special barista logic
}
```

### When to Add New Effects

**Add a new effect type when**:
- Multiple games would need this behavior
- It represents a common game mechanic
- It can't be achieved by combining existing effects

**Don't add new effects for**:
- One-off game-specific behavior
- Things that can be done with existing effects + flags
- Temporary workarounds

### Documentation Requirements

**When you add engine features, you MUST**:
1. Add to this file (engine-features.md)
2. Add TypeScript types to src/lib/game/types.ts
3. Add handler to src/lib/game/engine/GameStateManager.ts
4. Update relevant schema docs (npc-schema.md, etc.)
5. Add examples to cartridge

---

## Version History

| Date | Changes |
|------|---------|
| 2025-01-09 | Initial documentation: INCREMENT_NPC_INTERACTION, COMPLETE_NPC_TOPIC, DEMOTE_NPC, NPC visibility initialization, NPCs as zones, /map command |
