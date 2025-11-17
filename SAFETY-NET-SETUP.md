# 🔄 DEPRECATED: Safety Net Setup

**This setup guide is deprecated.**

The system has been **upgraded to Unified Command Logging**, which includes all safety net functionality plus comprehensive state tracking.

---

## ✅ What You Need to Know

### Safety Net Still Works!
Your AI Safety Net is still active:
- ✅ Primary AI: Gemini 2.5 Flash
- ✅ Safety AI: GPT-5 Nano
- ✅ Confidence thresholds: Same as before
- ✅ Cost optimization: Same as before

### What Changed
Instead of logging to multiple collections (`ai_interpretations`, `safety_net_sessions`), everything now logs to **ONE collection**: `command_logs`

---

## 🎯 New Documentation

**See:** `UNIFIED-COMMAND-LOGGING.md`

This provides:
- Complete setup instructions
- Usage examples
- Analytics functions
- Debugging guide
- State snapshot reproduction

---

## Environment Variables

**No changes needed!** Your `.env` is still correct:

```bash
GOOGLE_GENAI_API_KEY=your_google_key    # ✅ Still used
OPENAI_API_KEY=your_openai_key          # ✅ Still used
```

---

## How It Works Now

### Before (Old Multi-Collection System)
```
Player Command
  ↓
AI Interpretation (with safety net)
  ↓
Log to ai_interpretations (1-2 docs)
  ↓
Log to safety_net_sessions (1 doc)
  ↓
Execute command
  ↓
Log messages to logs collection
```

### Now (Unified System)
```
Player Command
  ↓
Capture state snapshot (BEFORE)
  ↓
AI Interpretation (with safety net)
  ↓
Execute command
  ↓
Capture state snapshot (AFTER)
  ↓
Log EVERYTHING to command_logs (1 doc)
```

---

## Benefits of New System

### Old System
- ❌ 3 collections to query
- ❌ Manual correlation by timestamp
- ❌ No state snapshots
- ❌ Complex analytics queries

### New System
- ✅ 1 collection
- ✅ Single query for everything
- ✅ Complete state snapshots (before/after)
- ✅ Simple analytics
- ✅ Bug reproduction capability

---

## Migration Steps

### For Users
**Nothing to do!** System automatically uses new logging.

### For Developers
1. ✅ Old files removed (`ai-tracking.ts`, `ai-analytics.ts`)
2. ✅ New file added (`command-logging.ts`)
3. ✅ `actions.ts` updated to use unified logging
4. ✅ Documentation updated

### For Database
- Old collections (`ai_interpretations`, `safety_net_sessions`) can be:
  1. Left in place (read-only)
  2. Deleted after 30 days
- New collection (`command_logs`) is active now

---

## Quick Start

The system is **already running!** Every command is logged to `command_logs`.

### View Logs
```typescript
import { getUserGameSession } from '@/lib/firebase/command-logging';

// Get player's complete session
const logs = await getUserGameSession(userId, gameId);

// Each log contains EVERYTHING:
logs.forEach(log => {
  console.log('Input:', log.input.raw);
  console.log('AI Decision:', log.aiInterpretation.finalDecision);
  console.log('Execution:', log.execution);
  console.log('State Before:', log.stateSnapshot.before);
  console.log('State After:', log.stateSnapshot.after);
});
```

### Analytics
```typescript
import { getCommandAnalytics } from '@/lib/firebase/command-logging';

// Get analytics for last 7 days
const analytics = await getCommandAnalytics(gameId, 7);
console.log(analytics);
// {
//   totalCommands: 1000,
//   successRate: 94.5,
//   safetyNet: { usageRate: 23%, helpRate: 60% },
//   performance: { avgLatencyMs: 1850, totalCostUSD: 0.045 }
// }
```

---

## Models & Costs

**No changes!** Same as before:

| Role | Model | Cost (per 1M tokens) |
|------|-------|---------------------|
| Primary AI | Gemini 2.5 Flash | $0.075 / $0.30 |
| Safety AI | GPT-5 Nano | $0.03 / $0.06 |

### Typical Cost per Command
- Primary only (80%): $0.0001
- Primary + Safety (20%): $0.00015
- **Average: ~$0.00011 per command**

---

## Firestore Indexes

Create these for best performance:

```
Collection: command_logs

1. userId + gameId + timestamp (DESC)
2. gameId + wasUnclear + timestamp (DESC)
3. gameId + playerComplaint + timestamp (DESC)
```

---

## See Also

- **`UNIFIED-COMMAND-LOGGING.md`** - Complete documentation
- **`src/lib/firebase/command-logging.ts`** - Implementation
- **`src/app/actions.ts`** - Integration
- **`src/ai/flows/interpret-with-safety-net.ts`** - AI safety net logic (unchanged)

---

**Last Updated:** 2025-01-17
**Status:** Deprecated - Use unified logging documentation instead
