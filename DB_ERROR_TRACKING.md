# Database Error Tracking System

## Overview

Complete tracking system for database operation failures. Now you have full visibility into Firestore read/write failures with structured logging and clear error messages.

## The Complete Error Hierarchy

### 1. 🔵 Turn N (Blue) - Successful Commands
- Type: `command`
- Tracks successful game turns with full AI interpretation and execution details

### 2. 🔴 Msg Error (Red) - Security/Validation Errors
- Type: `validation_error`
- Input blocked by Prompt Watch-Dog
- Security violations, spam detection, injection attempts

### 3. 🟠 AI Error (Orange) - System/AI Failures
- Type: `ai_error`
- AI service failures, interpretation errors, handler crashes
- Full error context and debugging information

### 4. 🟡 DB Error (Yellow) - Database Failures **[NEW]**
- Type: `db_error`
- Firestore read/write failures, connection errors
- State loading/saving failures

## Database Error Structure

```typescript
{
  type: 'db_error',
  errorId: 'db_error_1234567890',
  timestamp: 1234567890,

  // What the player prompted (if available)
  playerInput: 'sanitized input text',

  // Database operation that failed
  operation: 'READ_STATE' | 'READ_LOGS' | 'WRITE_STATE' | 'WRITE_LOGS' | 'INIT_FIRESTORE' | 'DELETE_DATA',
  operationDescription: 'Loading player state from database',

  // Error details
  error: {
    message: 'Error message text',
    stack: 'Full stack trace',
    name: 'FirebaseError' | 'NetworkError' | etc,
  },

  // What the system replied to the player
  systemResponse: 'User-friendly error message about database failure',

  // Context
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
  },

  // UI Messages (single consolidated error message)
  uiMessages: [{
    id: 'msg_xyz',
    sender: 'system',
    senderName: '⚠️ Database Error',
    content: 'User-friendly error explanation',
    timestamp: 1234567890,
    type: 'text'
  }]
}
```

## Database Operation Types

### READ Operations

**READ_STATE**
- Loading player state from Firestore
- Triggered at: Start of `processCommand()`
- Fallback: Uses initial state if read fails
- User Impact: May lose saved progress, starts fresh

**READ_LOGS**
- Loading message history from Firestore
- Triggered at: Start of `processCommand()`
- Fallback: Creates initial messages if read fails
- User Impact: May lose message history

### WRITE Operations

**WRITE_STATE**
- Saving player state to Firestore
- Triggered at: End of `processCommand()` via `logAndSave()`
- Fallback: Error shown to user, progress not saved
- User Impact: Progress lost, needs to retry command

**WRITE_LOGS**
- Saving message logs to Firestore
- Triggered at: End of `processCommand()` via `logAndSave()`
- Fallback: Error shown to user, logs not saved
- User Impact: Message history not persisted

### OTHER Operations

**INIT_FIRESTORE**
- Initializing Firestore connection
- Triggered at: `logAndSave()` if Firestore not initialized
- Fallback: Cannot proceed, early return
- User Impact: Game cannot function

**DELETE_DATA**
- Deleting user data (reset game)
- Triggered at: `resetGame()`
- Fallback: Reset fails, data remains
- User Impact: Cannot reset game

## Error Handling Flow

### Read Error Flow

```
1. User issues command
2. Try to read state/logs from Firestore
3. ❌ Read fails (network error, permission error, etc.)
4. Create db_error log entry
5. Use fallback (initial state + initial messages)
6. Add db_error to messages
7. Return to user with yellow error message
```

Example:
```
┌────────────────────────────────────────┐
│ ⚠️ Database Error                      │
│                                        │
│ Sorry, we couldn't load your game     │
│ data.                                  │
│                                        │
│ Error: Permission denied               │
│                                        │
│ Your progress may not be saved.       │
│ Please try again or contact support.  │
└────────────────────────────────────────┘
```

### Write Error Flow

```
1. User command executes successfully
2. Try to save state/logs to Firestore
3. ❌ Write fails (network error, quota exceeded, etc.)
4. Create db_error log entry
5. Try to save again with db_error included (best effort)
6. Return to user with yellow error message
7. User sees command result + database error warning
```

Example:
```
Game processes "look around" command successfully...
↓
Game state updated in memory ✓
↓
Try to save to Firestore ✗
↓
Show user: Command result + warning about save failure
```

## Admin Dashboard Display

### Collapsed View (List)
```
🟡 DB Error  "Loading player state from database"  ⚠
```

### Expanded View (Click to open)

#### 💾 Database Operation (Yellow border)
- **Operation:** `WRITE_STATE`
- **Description:** "Saving player state to database"
- **Player Input:** (if available)

#### ❌ Error Details (Red border)
- **Type:** `FirebaseError`
- **Message:** Full error message text
- **Stack Trace:** Complete stack trace (collapsible)

#### 💬 System Response (Green border)
- The user-friendly message shown to the player
- Explains what went wrong without technical jargon

#### 📍 Context (Blue border)
- User ID
- Game ID

#### 📊 Metadata (Gray border)
- Error ID
- Timestamp (full date/time)

## Game UI Display

Database errors appear in the game with:
- **Yellow background**: `bg-yellow-500/10`
- **Yellow border**: `border-2 border-yellow-500/50`
- **Label**: "⚠️ Database Error" in yellow text
- **Message**: User-friendly error explanation

Example:
```
┌───────────────────────────────────────┐
│ ⚠️ Database Error                     │
│                                       │
│ Sorry, we couldn't save your game    │
│ data.                                 │
│                                       │
│ Error: quota_exceeded                │
│                                       │
│ Your progress may not be saved.      │
│ Please try again or contact support. │
└───────────────────────────────────────┘
```

## Implementation Details

### Helper Function: `createDatabaseErrorLog()`

**Location:** `src/app/actions.ts:1256-1310`

**Purpose:** Creates structured db_error log entries

**Parameters:**
- `operation`: Which database operation failed
- `error`: The caught error object
- `userId`: User identifier
- `gameId`: Game identifier
- `playerInput`: Optional player input that triggered the operation

**Returns:** Complete db_error object with:
- Structured error information
- User-friendly message
- UI message array

### Enhanced `logAndSave()` Function

**Location:** `src/app/actions.ts:1312-1341`

**Changes:**
- Now returns `{ success: boolean; error?: Error }`
- Catches and returns database errors instead of silently logging
- Allows callers to detect and handle save failures

**Before:**
```typescript
await logAndSave(userId, gameId, state, messages);
// Silent failure, no way to detect errors
```

**After:**
```typescript
const saveResult = await logAndSave(userId, gameId, state, messages);
if (!saveResult.success) {
  // Handle database error
  const dbErrorLog = createDatabaseErrorLog(...);
  // Add to messages and notify user
}
```

### Read Error Handling

**Location:** `src/app/actions.ts:362-388`

Wraps database reads in dedicated try-catch:
```typescript
try {
  [stateSnap, logSnap] = await Promise.all([
    getDoc(stateRef),
    getDoc(logRef)
  ]);
} catch (dbReadError) {
  console.error('[Database Error] Failed to read game data:', dbReadError);

  // Create db_error log
  const dbErrorLog = createDatabaseErrorLog('READ_STATE', ...);

  // Use fallback state
  currentState = getInitialState(game);
  allMessagesForSession = await createInitialMessages(...);

  // Add error to messages
  allMessagesForSession.push(dbErrorLog);

  // Return early with error
  return {
    newState: currentState,
    messages: extractUIMessages(allMessagesForSession)
  };
}
```

### Write Error Handling

**Location:** `src/app/actions.ts:997-1026`

Checks save result and creates db_error if failed:
```typescript
const saveResult = await logAndSave(userId, gameId, finalResult.newState, consolidatedMessages);

if (!saveResult.success && saveResult.error) {
  console.error('[Database Error] Failed to save game data:', saveResult.error);

  const dbErrorLog = createDatabaseErrorLog('WRITE_STATE', saveResult.error, userId, gameId, safePlayerInput);

  finalMessages = [...consolidatedMessages, dbErrorLog];

  // Try to save with error included (best effort)
  try {
    await logAndSave(userId, gameId, finalResult.newState, finalMessages);
  } catch (secondaryError) {
    console.error('[Database Error] Failed to save db_error log:', secondaryError);
    // At least return the error to the user
  }
}
```

## Files Modified

### 1. src/app/actions.ts
- **Lines 1256-1310**: Added `createDatabaseErrorLog()` helper function
- **Lines 1312-1341**: Enhanced `logAndSave()` to return success/failure
- **Lines 362-388**: Added database read error handling
- **Lines 997-1026**: Added database write error handling

### 2. src/lib/utils/extract-ui-messages.ts
- **Line 14**: Added `db_error` to CONSOLIDATED_TYPES array
- Extracts uiMessages from db_error entries

### 3. src/app/admin/UsersTab.tsx
- **Line 227**: Added `isDBError` detection
- **Lines 417-495**: Yellow "DB Error" accordion with full details
- Operation description, error message, stack trace display

### 4. src/components/game/GameScreen.tsx
- **Line 186**: Added `isDatabaseError` detection
- **Line 207**: Yellow border and background for database errors
- **Line 217**: Yellow text for "⚠️ Database Error" label

## Common Database Error Scenarios

### 1. Network Disconnected

**Trigger:** User loses internet connection mid-game

**Error:**
```
FirebaseError: Failed to get document because the client is offline
```

**Result:**
- 🟡 DB Error logged
- Fallback to cached data (if read) or show warning (if write)
- User warned their progress may not be saved

### 2. Quota Exceeded

**Trigger:** Firestore daily quota reached

**Error:**
```
FirebaseError: quota_exceeded
```

**Result:**
- 🟡 DB Error logged
- Cannot save new data
- User notified to try again later

### 3. Permission Denied

**Trigger:** Firestore security rules reject the operation

**Error:**
```
FirebaseError: permission-denied
```

**Result:**
- 🟡 DB Error logged
- Operation fails
- User notified to contact support

### 4. Firestore Not Initialized

**Trigger:** Firebase configuration error

**Error:**
```
Error: Firestore is not initialized
```

**Result:**
- 🟡 DB Error logged (type: INIT_FIRESTORE)
- Game cannot function
- User sees critical error

## Testing Database Errors

### Test Read Errors

**Method 1: Temporarily break Firestore credentials**
```typescript
// In firebase.ts, temporarily use invalid credentials
const firebaseConfig = {
  apiKey: "invalid-key",
  // ...
};
```

**Method 2: Simulate offline mode**
- Open Chrome DevTools
- Network tab → Throttling → Offline
- Try to play the game

**Expected Result:**
- 🟡 Yellow "DB Error" message in game
- "Loading player state from database" failed
- User sees initial state as fallback

### Test Write Errors

**Method 1: Temporarily make logAndSave throw**
```typescript
export async function logAndSave(...) {
  throw new Error('Simulated database error');
}
```

**Method 2: Fill Firestore quota**
- Make thousands of writes to exceed daily quota
- Try to save game state

**Expected Result:**
- 🟡 Yellow "DB Error" message in game
- "Saving player state to database" failed
- User warned progress not saved

## Benefits

### For Developers
- **Debugging**: See exactly which database operation failed
- **Monitoring**: Track database error rates
- **Root Cause Analysis**: Full stack traces for investigation
- **Operation Tracking**: Know if reads or writes are failing more

### For Admins
- **Visibility**: Yellow tags make database issues obvious
- **Context**: Know which user and game experienced the error
- **Support**: Help users with specific error details
- **Trends**: Identify patterns (e.g., quota issues at peak times)

### For Users
- **Transparency**: Clear explanation when saves fail
- **Guidance**: Instructions on what to do next
- **Trust**: Not silently losing progress
- **Fallback**: Can still play even if database is down (until next save)

## Future Enhancements

### 1. Retry Logic
- Automatic retry for transient failures (network blips)
- Exponential backoff
- Max retry attempts

### 2. Offline Mode
- Local storage fallback
- Sync when connection restored
- Conflict resolution

### 3. Database Health Monitoring
- Real-time error rate tracking
- Alert when error rate spikes
- Proactive quota monitoring

### 4. User Recovery Options
- "Retry Save" button on db_error messages
- "Export Game State" to download progress
- "Load from Backup" if available

## Color Coding Summary

| Error Type | Color | Use Case |
|------------|-------|----------|
| 🔵 Turn N | Blue | Successful commands |
| 🔴 Msg Error | Red | Security/validation failures |
| 🟠 AI Error | Orange | AI/system failures |
| 🟡 DB Error | Yellow | Database operation failures |

Now you have complete visibility into all four categories of operations with clear, color-coded tracking! 🎯
