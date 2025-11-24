# AI Error Tracking System

## Overview

Comprehensive error tracking system for AI/system failures. Now you can track what prompted errors, where they occurred, and full error details - no more blind spots!

## The Problem

**Before:** When errors occurred (like the temperature configuration error from the unicode bypass):
- ❌ Only a generic text message was logged
- ❌ No structured data about what caused the error
- ❌ No way to filter/analyze errors in admin dashboard
- ❌ Lost context: which AI service failed, what input triggered it, etc.
- ❌ No way to distinguish between validation errors, AI errors, and successful commands

**After:** Full error tracking with structured logging:
- ✅ Complete input context (both sanitized and raw)
- ✅ Detailed error information (message, stack trace, source)
- ✅ Orange "AI Error" tag for instant recognition
- ✅ Full game state context
- ✅ AI processing context (if available)

## Error Log Types

### 1. **Turn N** (Blue) - Successful Commands
- Type: `command`
- Tracks successful game turns
- Full AI interpretation and execution details

### 2. **Msg Error** (Red) - Validation/Security Errors
- Type: `validation_error`
- Input blocked by Prompt Watch-Dog
- Security violations, spam detection, etc.

### 3. **AI Error** (Orange) - System/AI Failures **[NEW]**
- Type: `ai_error`
- AI service failures, system errors, crashes
- Full error context and debugging information

## AI Error Structure

```typescript
{
  type: 'ai_error',
  errorId: 'ai_error_1234567890',
  timestamp: 1234567890,

  // What the player prompted
  playerInput: 'sanitized input text',
  rawInput: 'original input before sanitization',

  // Error details
  error: {
    message: 'Error message text',
    stack: 'Full stack trace',
    source: 'AI_INTERPRETATION' | 'AI_NARRATION' | 'HANDLER_EXECUTION' | 'STATE_UPDATE' | 'DATABASE' | 'UNKNOWN',
    name: 'Error' | 'TypeError' | 'APIError' | etc,
  },

  // What the system replied to the player
  systemResponse: 'User-friendly error message',

  // Full game context
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
    chapterId: 'ch1_intro',
    locationId: 'loc_office',
    focusId: 'obj_computer',
    focusType: 'object',
    activeConversation: 'npc_detective',
  },

  // AI processing context (if available)
  aiContext: {
    commandStartTime: 1234567890,
    hadAIInterpretation: true,
    hadSafetyNet: false,
  },

  // UI display (single consolidated error message)
  uiMessages: [{
    id: 'msg_xyz',
    sender: 'system',
    senderName: '⚠️ System Error',
    content: 'User-friendly error explanation',
    timestamp: 1234567890,
    type: 'text'
  }]
}
```

## Error Source Types

The system automatically categorizes errors by source:

1. **AI_INTERPRETATION**
   - Temperature configuration errors
   - Model API errors
   - Token limit errors
   - Timeout errors

2. **AI_NARRATION**
   - Gemini/OpenAI API failures
   - Genkit flow errors
   - Response generation failures

3. **HANDLER_EXECUTION**
   - Game command handler failures
   - Invalid targets/actions
   - State processing errors

4. **STATE_UPDATE**
   - Game state update failures
   - State validation errors

5. **DATABASE**
   - Firestore read/write failures
   - Connection errors
   - Permission errors

6. **UNKNOWN**
   - Unclassified errors
   - Catch-all for unexpected failures

## Admin Dashboard Display

### Collapsed View (List)
```
🟠 AI Error  "\u003cscript\u003ealert('XSS')\u003c/script\u003e"  ⚠
```

### Expanded View (Click to open)

#### 📥 Player Input (Orange border)
- Sanitized input (what was processed)
- Original input (if different from sanitized)

#### ❌ Error Details (Red border)
- **Source:** `AI_INTERPRETATION` (categorized)
- **Type:** `APIError`
- **Message:** Full error message text
- **Stack Trace:** Complete stack trace (collapsible, max height)

#### 💬 System Response (Green border)
- The user-friendly message shown to the player
- Explains what went wrong without technical jargon

#### 🤖 AI Context (Purple border) *[if available]*
- Had AI Interpretation: Yes/No
- Had Safety Net: Yes/No
- Command Start Time: timestamp

#### 📍 Context (Blue border)
- User ID
- Game ID
- Chapter
- Location
- Focus (if any)
- Active Conversation (if any)

#### 📊 Metadata (Gray border)
- Error ID
- Timestamp (full date/time)

## Game UI Display

AI errors appear in the game with:
- **Orange background**: `bg-orange-500/10`
- **Orange border**: `border-2 border-orange-500/50`
- **Label**: "⚠️ System Error" in orange text
- **Message**: User-friendly error explanation

Example:
```
┌───────────────────────────────────────┐
│ ⚠️ System Error                       │
│                                       │
│ Sorry, something went wrong while    │
│ processing your command.              │
│                                       │
│ Error: 400 Unsupported value:        │
│ 'temperature' does not support 0.3   │
│ with this model. Only the default    │
│ (1) value is supported.              │
│                                       │
│ Please try a different command or    │
│ contact support if this persists.    │
└───────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Temperature Configuration Error

**Input:** `\u003cscript\u003ealert('XSS')\u003c/script\u003e` (unicode bypass)

**Before Fix:**
- Unicode bypassed validation
- Reached AI layer
- Temperature error occurred
- Only generic message logged: "Sorry, an error occurred: 400 Unsupported value..."
- ❌ No context, no structured data

**After Fix (Unicode now blocked):**
- Validation catches decoded `<script>`
- Creates validation_error entry
- Red "Msg Error" tag
- Never reaches AI

**If Similar Error Occurs:**
- Creates ai_error entry
- Orange "AI Error" tag
- Full details: input, stack trace, source, context

### Scenario 2: AI API Timeout

**Input:** `tell me a very long story about everything`

**Logged Data:**
```typescript
{
  type: 'ai_error',
  errorId: 'ai_error_1234567891',
  playerInput: 'tell me a very long story about everything',
  error: {
    message: 'Request timed out after 30000ms',
    source: 'AI_NARRATION',
    name: 'TimeoutError',
    stack: '...'
  },
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
    chapterId: 'ch1',
    locationId: 'loc_office',
  },
  systemResponse: 'Sorry, the AI took too long to respond. Please try a simpler command.'
}
```

### Scenario 3: Handler Execution Failure

**Input:** `use key on broken door`

**Logged Data:**
```typescript
{
  type: 'ai_error',
  errorId: 'ai_error_1234567892',
  playerInput: 'use key on broken door',
  error: {
    message: 'Cannot read property lockState of undefined',
    source: 'HANDLER_EXECUTION',
    name: 'TypeError',
    stack: '...'
  },
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
    focusId: 'obj_door',
    focusType: 'object',
  },
  systemResponse: 'Sorry, something went wrong...'
}
```

## Files Modified

### 1. src/app/actions.ts (lines 1019-1108)
- Enhanced error catching with detailed context
- Automatic error source detection
- Structured AI error log creation
- Consolidated uiMessages array

### 2. src/lib/utils/extract-ui-messages.ts (line 14)
- Added `ai_error` to CONSOLIDATED_TYPES
- Extracts uiMessages from AI error entries

### 3. src/app/admin/UsersTab.tsx (lines 226, 318-414)
- Added `isAIError` detection
- Orange "AI Error" accordion with full details
- Error source, stack trace, AI context display

### 4. src/components/game/GameScreen.tsx (lines 185, 205, 214)
- Added `isSystemError` detection
- Orange border and background for system errors
- Orange text for "⚠️ System Error" label

## Benefits

### For Developers
- **Debugging**: Full stack traces and context for every error
- **Monitoring**: Track error rates by source type
- **Analytics**: Identify most common failure points
- **Optimization**: See which inputs cause AI failures

### For Admins
- **Visibility**: See all errors at a glance with orange tags
- **Context**: Know exactly what the player was doing
- **Support**: Help users with specific error details
- **Filtering**: Query Firestore for specific error types

### For Users
- **Clarity**: User-friendly error messages (not technical jargon)
- **Visual**: Orange highlighting clearly indicates system error
- **Action**: Clear guidance on what to do next

## Query Examples

### Get All AI Errors for a User
```typescript
const errorsQuery = query(
  collection(firestore, 'logs'),
  where('messages', 'array-contains', { type: 'ai_error' })
);
```

### Count Errors by Source
```javascript
// In admin dashboard
const errorsBySource = logs
  .filter(log => log.type === 'ai_error')
  .reduce((acc, log) => {
    const source = log.error?.source || 'UNKNOWN';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

console.log(errorsBySource);
// { AI_INTERPRETATION: 5, HANDLER_EXECUTION: 2, DATABASE: 1 }
```

### Find Most Common Error Messages
```javascript
const errorCounts = logs
  .filter(log => log.type === 'ai_error')
  .reduce((acc, log) => {
    const msg = log.error?.message || 'Unknown';
    acc[msg] = (acc[msg] || 0) + 1;
    return acc;
  }, {});

console.log(Object.entries(errorCounts).sort((a, b) => b[1] - a[1]));
```

## Future Enhancements

### 1. Error Analytics Dashboard
- Real-time error rate graphs
- Error breakdown by source/type
- Most common failures
- Error trends over time

### 2. Automatic Alerts
- Email/Slack notifications for critical errors
- Threshold alerts (e.g., >10 errors/hour)
- Spike detection

### 3. Error Recovery
- Automatic retry logic for transient failures
- Fallback AI models (if primary fails, try backup)
- Graceful degradation

### 4. User Error Reports
- "Report Bug" button on errors
- Include full error context
- User comments/description

## Testing

Try these scenarios to generate AI errors:

1. **Invalid Temperature** (now fixed, but for testing)
   - Temporarily revert temperature fix
   - Trigger with any command

2. **API Timeout**
   - Use extremely complex command
   - Disconnect network mid-request

3. **Database Error**
   - Temporarily break Firestore credentials
   - Try any command

4. **Handler Error**
   - Use command on non-existent object
   - Try impossible action

Each should create an orange "AI Error" entry with full details!
