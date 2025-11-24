# Validation Error Database Structure

## Overview
Each validation error now creates **ONE consolidated database entry** with complete tracking information.

## Database Entry Structure

```typescript
{
  type: 'validation_error',
  errorId: 'error_1234567890',
  timestamp: 1234567890,

  // ✅ What the player prompted
  originalInput: "player's blocked input text",

  // ✅ What the system replied to the player
  systemResponse: "Error message explaining why input was blocked",

  // ✅ What the Watchdog filtered and why (Reasoning)
  violations: [
    {
      type: 'PROMPT_INJECTION',
      severity: 'critical',
      message: 'Detailed explanation of why this was flagged'
    },
    // ... more violations if multiple detected
  ],

  // Additional metadata
  metadata: {
    originalLength: 123,
    sanitizedLength: 100,
    strippedChars: 23
  },

  // Context (where this error occurred)
  context: {
    userId: 'user_abc',
    gameId: 'game_123',
    chapterId: 'ch1_intro',
    locationId: 'loc_office'
  },

  // UI display (single consolidated message)
  uiMessages: [
    {
      id: 'msg_xyz',
      sender: 'system',
      senderName: '🛡️ Security Filter',
      content: 'Formatted error message for player',
      timestamp: 1234567890,
      type: 'text'
    }
  ]
}
```

## Admin Dashboard Display

The admin dashboard now shows validation errors with:

### Header (Collapsed View)
- **Red "Msg Error" chip** - Clearly identifies error messages
- Truncated preview of blocked input
- Red X icon indicating failure

### Expanded View (Click to open)

#### 🚫 Blocked Input Section (Red border)
- Shows the complete original unfiltered input
- Character count

#### ⚠️ Violations Section (Orange border)
- Lists all detected violations
- Each violation shows:
  - Violation type (e.g., "PROMPT INJECTION")
  - Severity badge (critical/high/medium) with color coding
  - Detailed explanation message

#### 💬 System Response Section (Green border)
- Shows exactly what the system replied to the player
- This is the error message the player saw in the game UI

#### 📊 Metadata Section (Gray border)
- Original length
- Sanitized length
- Stripped characters count
- Timestamp

#### 📍 Context Section (Blue border)
- User ID
- Game ID
- Chapter ID
- Location ID

## Benefits

1. **Single Entry per Error** - No more 3 separate entries cluttering the logs
2. **Complete Tracking** - All information in one place:
   - Player's input
   - Watchdog's reasoning
   - System's response
3. **Easy Filtering** - Red "Msg Error" tag makes errors instantly recognizable
4. **Full Context** - Know exactly where and when the error occurred
5. **UI Consistency** - Players see a single red-highlighted message in-game

## Files Modified

1. **src/app/actions.ts** (lines 271-318)
   - Create consolidated validation_error entry with all fields
   - Single uiMessages array for display

2. **src/lib/utils/extract-ui-messages.ts**
   - Extract uiMessages from validation_error entries (like command entries)

3. **src/components/game/GameScreen.tsx** (lines 180-216)
   - Red highlighting for security filter messages
   - Special styling: red background, red border, red text

4. **src/app/admin/UsersTab.tsx** (lines 278-310)
   - Added System Response section
   - Enhanced Context section with userId and gameId
   - All information displayed in organized sections
