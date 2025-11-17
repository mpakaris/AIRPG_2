# 🎯 Unified Command Logging System

## Overview

The Unified Command Logging system captures **everything** about each player command in a single Firestore document. This makes debugging, analytics, and bug reproduction trivial.

## What's Logged

Every player command creates **ONE document** in the `command_logs` collection containing:

### ✅ Input Stage
- Raw player input: `"hey can i maybe move that painting?"`
- Preprocessed input: `"move painting"`
- Pattern detection (help request, gibberish, multi-command)
- Preprocessing time

### ✅ AI Interpretation Stage
- **Primary AI (Gemini Flash)**:
  - Model, confidence, command, reasoning
  - Latency, token usage, cost
- **Safety AI (GPT-5 Nano)** (if triggered):
  - Model, confidence, command, reasoning
  - Latency, token usage, cost
  - Whether it helped improve the decision
- **Final Decision**:
  - Which AI was used
  - Final confidence
  - Did the AIs disagree?

### ✅ Command Execution Stage
- Handler used (`handleMove`, `handleExamine`, etc.)
- Target entity and ID
- All effects generated
- Success/failure status
- Error messages and types
- Execution time

### ✅ State Snapshots
- **Complete state BEFORE command** execution
- **Complete state AFTER command** execution
- Allows perfect bug reproduction

### ✅ State Changes (Delta)
- Flags set/unset
- Objects revealed
- Items added/removed
- Location changes
- Object state changes

### ✅ Output Stage
- Narrator response shown to player
- All messages displayed
- Images/audio shown
- Entities revealed

### ✅ Performance Metrics
- Preprocessing time
- AI interpretation time
- Execution time
- State update time
- **Total time**

### ✅ Context
- Chapter ID
- Location ID
- Turn number
- Session duration

### ✅ Quality Metrics
- Was command successful?
- Was AI unclear (low confidence)?
- Did player complain? (using `/feedback` command)
- Complaint type and text

---

## Database Schema

### Collection: `command_logs`

Each document ID: `{userId}_{timestamp}`

```typescript
{
  // Identification
  logId: "user_123_1234567890",
  gameId: "blood-on-brass",
  userId: "user_123",
  timestamp: Date,

  // State Snapshots (for bug reproduction)
  stateSnapshot: {
    before: PlayerState,  // Complete state BEFORE
    after: PlayerState,   // Complete state AFTER
  },

  // Input
  input: {
    raw: "hey can i maybe move that painting?",
    preprocessed: "move painting",
    wasHelpRequest: false,
    wasGibberish: false,
    wasMultiCommand: false,
    preprocessingMs: 5,
  },

  // AI Interpretation
  aiInterpretation: {
    primaryAI: {
      model: "gemini-2.5-flash",
      confidence: 0.65,
      commandToExecute: "move painting",
      reasoning: "...",
      latencyMs: 1200,
      tokens: { input: 450, output: 120 },
      costUSD: 0.0001,
    },
    safetyAI: {  // Only if triggered
      model: "gpt-5-nano",
      confidence: 0.78,
      commandToExecute: "move painting",
      latencyMs: 800,
      costUSD: 0.00005,
      wasTriggered: true,
      helpedImprove: true,
    },
    finalDecision: {
      source: "consensus",
      confidence: 0.80,
      commandToExecute: "move painting",
      disagreement: false,
    },
    totalAICalls: 2,
    totalAICostUSD: 0.00015,
    totalAILatencyMs: 2000,
  },

  // Execution
  execution: {
    handler: "handleMove",
    targetEntity: "painting",
    targetId: "painting_001",
    targetType: "object",
    effects: [...],
    effectsApplied: 5,
    success: true,
    errorMessage: undefined,
    errorType: undefined,
    executionMs: 150,
  },

  // Output
  output: {
    narratorResponse: "You move the painting...",
    imageUrl: "https://...",
    messages: [...],
    revealedEntities: ["safe_001"],
  },

  // State Changes
  stateChanges: {
    flagsSet: ["painting_moved"],
    flagsUnset: [],
    objectsRevealed: ["safe_001"],
    itemsAdded: [],
    itemsRemoved: [],
    locationChanged: undefined,
    objectStateChanges: [{
      objectId: "painting_001",
      property: "isMoved",
      before: false,
      after: true,
    }],
  },

  // Performance
  performance: {
    preprocessingMs: 5,
    aiInterpretationMs: 2000,
    executionMs: 150,
    stateUpdateMs: 50,
    totalMs: 2205,
  },

  // Context
  context: {
    chapterId: "ch1-the-cafe",
    locationId: "main_room",
    turnNumber: 42,
  },

  // Quality
  wasSuccessful: true,
  wasUnclear: false,
  playerComplaint: false,
}
```

---

## Usage

### Automatic Logging

Logs are created automatically for **every command** in `processCommand()`. No action needed!

### Get a Specific Log

```typescript
import { getCommandLog } from '@/lib/firebase/command-logging';

// When player reports bug, get their log
const log = await getCommandLog('user_123_1234567890');

// See EVERYTHING that happened
console.log('Input:', log.input.raw);
console.log('AI Decision:', log.aiInterpretation.finalDecision);
console.log('Success:', log.wasSuccessful);
console.log('Error:', log.execution.errorMessage);
```

### Get Player Session

```typescript
import { getUserGameSession } from '@/lib/firebase/command-logging';

// Get last 100 commands for a user's game
const session = await getUserGameSession('user_123', 'blood-on-brass');

// Replay entire session
session.forEach(log => {
  console.log('Turn', log.context.turnNumber);
  console.log('Player:', log.input.raw);
  console.log('Output:', log.output.narratorResponse);
  console.log('---');
});
```

### Get Unclear Commands

```typescript
import { getUnclearCommands } from '@/lib/firebase/command-logging';

// Find commands where AI had low confidence
const unclear = await getUnclearCommands(50);

// Improve your prompts based on these
unclear.forEach(log => {
  console.log('Input:', log.input.raw);
  console.log('Confidence:', log.aiInterpretation.finalDecision.confidence);
  console.log('Primary said:', log.aiInterpretation.primaryAI.commandToExecute);
  console.log('Safety said:', log.aiInterpretation.safetyAI?.commandToExecute);
});
```

### Get Complaints

```typescript
import { getComplainedCommands } from '@/lib/firebase/command-logging';

// See what players complained about
const complaints = await getComplainedCommands(50);

complaints.forEach(log => {
  console.log('Player:', log.input.raw);
  console.log('Complaint:', log.complaintText);
  console.log('Type:', log.complaintType);
  console.log('What happened:', log.execution);
});
```

### Flag a Complaint

```typescript
import { flagCommandAsComplaint } from '@/lib/firebase/command-logging';

// When player uses /feedback or /bug command
await flagCommandAsComplaint(
  'user_123_1234567890',
  'The game didnt understand me',
  'unclear'
);
```

### Analytics Dashboard

```typescript
import { getCommandAnalytics } from '@/lib/firebase/command-logging';

// Get analytics for last 7 days
const analytics = await getCommandAnalytics('blood-on-brass', 7);

console.log(analytics);
// {
//   period: "Last 7 days",
//   totalCommands: 1000,
//   successRate: 94.5,
//   unclearRate: 5.5,
//   complaintRate: 1.2,
//   safetyNet: {
//     usageRate: 23.0,
//     helpRate: 60.0,
//     timesUsed: 230,
//     timesHelped: 138,
//   },
//   performance: {
//     avgConfidence: 78.5,
//     avgLatencyMs: 1850,
//     totalCostUSD: 0.045,
//     costPerCommand: 0.000045,
//   },
// }
```

### Reproduce a Bug

```typescript
import { reproduceFromLog } from '@/lib/firebase/command-logging';

// Load the exact state when bug occurred
const stateAtBugTime = await reproduceFromLog('user_123_1234567890');

// Now you can replay the command in your test environment
// with the EXACT same state that caused the bug!
```

---

## Benefits

### 1. **Instant Debugging** 🐛
Player reports issue → Get log ID → See everything in ONE query

### 2. **Perfect Bug Reproduction** 🔄
State snapshots let you reproduce ANY bug by loading the exact game state

### 3. **Better Player Support** 🤝
See exactly what player did, what AI interpreted, and what went wrong

### 4. **Easy Analytics** 📊
All data in one place - no complex joins, no correlation needed

### 5. **Cost Tracking** 💰
Know exactly how much each command costs (AI + compute)

### 6. **Performance Monitoring** ⚡
Track latency at every stage - find bottlenecks instantly

### 7. **AI Optimization** 🤖
See when safety net helps, when AIs disagree, and where to improve prompts

### 8. **Session Replay** 📽️
Reconstruct complete player sessions for QA and testing

---

## Cost & Performance

### Storage Cost
- ~10-20KB per log
- Well under Firestore's 1MB document limit
- Cheaper than multiple collections (single write vs multiple writes)

### Query Performance
- Single query to get complete context
- Indexed on userId, gameId, timestamp
- Add composite indexes for advanced queries

### Recommended Cleanup
Keep logs for 30-90 days, then archive or delete:

```typescript
// Run this weekly via cron/Cloud Function
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

// Archive old logs to cheaper storage
// or simply delete them
```

---

## Firestore Indexes

Create these composite indexes:

```
Collection: command_logs

1. userId + gameId + timestamp (DESC)
2. gameId + wasUnclear + timestamp (DESC)
3. gameId + playerComplaint + timestamp (DESC)
4. userId + wasSuccessful + timestamp (DESC)
```

---

## Comparison: Old vs New

### Old System (3 Collections)
```
ai_interpretations: 1-2 docs per command
safety_net_sessions: 1 doc per command
logs: 1 doc per user (growing array)

To debug:
1. Find session doc by timestamp
2. Find AI interpretation docs by timestamp
3. Find log messages by timestamp
4. Manually correlate all data
5. 😫
```

### New System (1 Collection)
```
command_logs: 1 doc per command

To debug:
1. Get log by ID
2. ✅ Done!
```

---

## Migrating from Old System

**No migration needed!** The old collections can simply be:
1. Stopped (no new writes)
2. Kept for reference (30 days)
3. Deleted

New system starts fresh with complete data from day 1.

---

## Example: Debugging a Player Complaint

```typescript
// Player says: "The game didn't understand me at 3:47pm"

// 1. Find their log around that time
const logs = await getUserGameSession('user_123', 'blood-on-brass');
const suspectLog = logs.find(l =>
  l.timestamp.getHours() === 15 &&
  l.timestamp.getMinutes() === 47
);

// 2. See EVERYTHING in one object
console.log('What they typed:', suspectLog.input.raw);
console.log('How it was cleaned:', suspectLog.input.preprocessed);
console.log('Primary AI said:', suspectLog.aiInterpretation.primaryAI);
console.log('Safety AI said:', suspectLog.aiInterpretation.safetyAI);
console.log('Final decision:', suspectLog.aiInterpretation.finalDecision);
console.log('What handler ran:', suspectLog.execution.handler);
console.log('What happened:', suspectLog.execution.effects);
console.log('Did it succeed:', suspectLog.wasSuccessful);
console.log('Error:', suspectLog.execution.errorMessage);

// 3. Reproduce the bug
const stateBefore = suspectLog.stateSnapshot.before;
// Load this state into test environment
// Run the same command
// Debug with full context!
```

---

## Next Steps

1. ✅ System is active - logs are being created automatically
2. 📊 Check Firestore console to see data flowing
3. 🔍 Create Firestore indexes for queries
4. 📈 Build admin dashboard using analytics functions
5. 🐛 Use logs when players report issues
6. 🚀 Optimize AI prompts based on unclear command patterns

---

## Questions?

See implementation details in:
- `src/lib/firebase/command-logging.ts` - All logging functions
- `src/app/actions.ts` - Integration in processCommand()

The unified logging system gives you **complete visibility** into every command with **zero guesswork**. 🎯
