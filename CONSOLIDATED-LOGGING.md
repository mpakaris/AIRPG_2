# 📦 Consolidated Command Logging

## Overview

Every player command now creates **ONE comprehensive entry** in the Firestore logs collection. No more separate messages for player input, UI response, and analytics - everything is bundled together!

## Firestore Structure

```
logs (collection)
  └─ {userId}_{gameId} (document)
      └─ messages (array)
          ├─ [0] Consolidated Entry (player turn 1)
          ├─ [1] Consolidated Entry (player turn 2)
          ├─ [2] Consolidated Entry (player turn 3)
          └─ ...
```

## Consolidated Entry Structure

Each entry contains **9 sections**:

### 1. Player Input
```typescript
{
  type: 'command',
  commandId: '12345_1234567890',
  timestamp: Date,

  input: {
    raw: 'examine the notebook',           // What player typed
    preprocessed: 'examine the notebook',  // After preprocessing
    wasHelpRequest: false,
    wasGibberish: false,
    preprocessingMs: 5
  }
}
```

### 2. AI Interpretation (Analytics)
```typescript
{
  aiInterpretation: {
    primaryAI: {
      model: 'gemini-2.5-flash',
      confidence: 0.95,
      commandToExecute: 'examine notebook',
      reasoning: 'Clear examination command...',
      latencyMs: 450,
      costUSD: 0.0001
    },
    safetyAI: {                    // Only if safety net triggered
      model: 'gpt-5-nano',
      confidence: 0.92,
      commandToExecute: 'examine notebook',
      latencyMs: 300,
      costUSD: 0.00005,
      wasTriggered: true,
      helpedImprove: false
    },
    finalDecision: {
      source: 'primary',           // or 'safety', 'consensus'
      confidence: 0.95,
      commandToExecute: 'examine notebook',
      disagreement: false
    },
    totalAICalls: 2,
    totalCostUSD: 0.00015
  }
}
```

### 3. Execution Summary
```typescript
{
  execution: {
    handler: 'examine',
    targetEntity: 'notebook',
    effectTypes: ['SEND_MESSAGE', 'SET_FLAG'],  // Just types (details in uiMessages)
    effectsApplied: 2,
    success: true,
    errorMessage: undefined,
    executionMs: 120
  }
}
```
> **Note**: Full effect details are in `uiMessages` - no redundant data!

### 4. UI Output (What Player Actually Saw)
```typescript
{
  uiMessages: [
    {
      id: '123',
      sender: 'narrator',
      senderName: 'Detective Marlowe',
      type: 'text',
      content: 'You examine the brown notebook...',
      timestamp: 1234567890,
      imageUrl: 'https://storage.../notebook.jpg',  // Media URLs included!
      soundUrl: undefined
    }
  ]
}
```

### 5. State Snapshots (Before/After)
```typescript
{
  stateSnapshot: {
    before: {
      currentLocationId: 'loc_office',
      inventory: ['item_phone'],
      flags: {},
      world: { 'obj_notebook': { examined: false } }
    },
    after: {
      currentLocationId: 'loc_office',
      inventory: ['item_phone'],
      flags: { 'examined_notebook': true },
      world: { 'obj_notebook': { examined: true } }
    }
  }
}
```

### 6. Token Usage
```typescript
{
  tokens: {
    input: 450,
    output: 120,
    total: 570
  }
}
```

### 7. Performance Metrics
```typescript
{
  performance: {
    preprocessingMs: 5,
    aiInterpretationMs: 450,
    executionMs: 120,
    totalMs: 575
  }
}
```

### 8. Context
```typescript
{
  context: {
    chapterId: 'ch1',
    locationId: 'loc_office',
    turnNumber: 12
  }
}
```

### 9. Quality Metrics
```typescript
{
  wasSuccessful: true,
  wasUnclear: false
}
```

## Benefits

✅ **Complete Reproduction**: Every entry has everything needed to debug/reproduce an issue
✅ **Performance Tracking**: See exactly where time is spent (preprocessing, AI, execution)
✅ **Cost Analysis**: Track AI costs per command
✅ **State Comparison**: Before/after snapshots make it easy to see what changed
✅ **Media URLs**: Know exactly what images/sounds were shown to the player
✅ **Cleaner Logs**: One entry per turn instead of 3+ separate messages
✅ **No Redundancy**: Effect types in execution, full details in uiMessages - zero duplication!

## Querying Examples

### Find all unclear commands
```javascript
const unclearCommands = messages.filter(m =>
  m.type === 'command' && m.wasUnclear
);
```

### Find expensive commands (>$0.0002)
```javascript
const expensiveCommands = messages.filter(m =>
  m.type === 'command' &&
  m.aiInterpretation?.totalCostUSD > 0.0002
);
```

### Find slow commands (>1000ms)
```javascript
const slowCommands = messages.filter(m =>
  m.type === 'command' &&
  m.performance.totalMs > 1000
);
```

### Reproduce a specific command
```javascript
const commandEntry = messages[5]; // Get specific turn
const stateBefore = commandEntry.stateSnapshot.before;
const input = commandEntry.input.raw;
const effectTypes = commandEntry.execution.effectTypes;
const uiMessages = commandEntry.uiMessages;
// Now you can replay this exact command with full context!
```

### Find commands that changed location
```javascript
const locationChanges = messages.filter(m =>
  m.type === 'command' &&
  m.execution.effectTypes.includes('MOVE_TO_LOCATION')
);
```

## Implementation Notes

### Backend (Firebase Storage)
- Regular player/UI messages are NO LONGER added separately to the messages array
- UI messages for the turn are collected in `uiMessagesThisTurn[]`
- At the end of command processing, ONE consolidated entry is created
- The consolidated entry is appended to `allMessagesForSession` and saved to Firestore
- Firebase stores the full consolidated entries with all analytics

### Frontend (UI Display)
- `extractUIMessages()` helper function (`src/lib/utils/extract-ui-messages.ts`) extracts display messages from consolidated entries
- When loading logs from Firebase, `extractUIMessages()` is called to get UI messages only
- The UI receives a flat array of `Message[]` objects for display
- Consolidated entries are invisible to the UI layer - it only sees messages

### Flow Example
```typescript
// 1. Player enters command
processCommand(userId, "examine notebook")

// 2. Backend creates consolidated entry and saves to Firebase
{
  type: 'command',
  input: { raw: 'examine notebook', ... },
  execution: { handler: 'examine', ... },
  uiMessages: [
    { sender: 'narrator', content: 'You examine...', imageUrl: '...' }
  ],
  stateSnapshot: { before: {...}, after: {...} },
  // ... 9 sections total
}

// 3. extractUIMessages() extracts display messages
const allUIMessages = extractUIMessages(consolidatedMessages);
// Returns: [{ sender: 'narrator', content: 'You examine...', imageUrl: '...' }]

// 4. UI displays messages normally
<GameScreen messages={allUIMessages} />
```

## Backwards Compatibility

Old log entries (before this change) will still exist in the messages array as regular `Message` objects. New entries have `type: 'command'`. The `extractUIMessages()` function handles both:
- **Old format**: Regular `Message` objects → passed through unchanged
- **New format**: Consolidated entries with `type: 'command'` → `uiMessages` extracted
