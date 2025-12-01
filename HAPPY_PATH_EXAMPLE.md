# Happy Path System - Usage Guide

## Overview

The Happy Path system provides:
1. **AI-generated contextual hints** based on player progress
2. **Limited help requests** - 10 AI-powered hints per chapter (prevents spam, encourages exploration)
3. **Automatic chapter completion** detection
4. **Progressive hint system** (generic → specific)
5. **Player question support** (e.g., "help, I don't know how to open the box")

## How It Works

### Step 1: Define Happy Path in Cartridge

Add a `happyPath` array to your chapter definition with ordered steps:

```typescript
{
  id: 'ch1-the-cafe' as ChapterId,
  title: 'The Cafe',
  goal: 'Uncover the mystery hidden in the cafe',

  // NEW: Define the happy path
  happyPath: [
    {
      id: 'step_find_box',
      order: 1,
      description: 'Find the metal box',
      completionFlags: ['found_metal_box' as Flag],
      baseHint: 'Look around the cafe carefully. Something unusual might be hidden.',
      detailedHint: 'Check under the tables and examine the surroundings thoroughly.',

      // Optional: Context-aware hints
      conditionalHints: [
        {
          conditions: [{ type: 'LOCATION_IS', locationId: 'loc_cafe_main' }],
          hint: 'You\'re in the right place. Look under the furniture.'
        }
      ]
    },

    {
      id: 'step_open_box',
      order: 2,
      description: 'Open the metal box',
      completionFlags: ['opened_metal_box' as Flag],
      baseHint: 'The box is locked. You\'ll need to find a way to open it.',
      detailedHint: 'Someone in the cafe might have the key or know how to open it.',

      conditionalHints: [
        {
          conditions: [{ type: 'HAS_ITEM', itemId: 'item_key' }],
          hint: 'You have something that might help. Try using it on the box.'
        }
      ]
    },

    {
      id: 'step_talk_barista',
      order: 3,
      description: 'Talk to the Barista',
      completionFlags: ['talked_to_barista' as Flag, 'barista_topic_business_card' as Flag],
      baseHint: 'The person working here might have useful information.',
      detailedHint: 'Talk to the barista and ask about the business card.'
    },

    {
      id: 'step_get_business_card',
      order: 4,
      description: 'Receive the business card from Barista',
      completionFlags: ['received_business_card' as Flag],
      baseHint: 'Continue your conversation with the barista.',
      detailedHint: 'Ask the barista about what was in the box.'
    }
  ],

  // Optional: Chapter completion requirements
  completionRequirements: {
    requireAllSteps: true,  // Default: true - all steps must be completed
    // OR use: minimumStepsRequired: 3,  // Alternative: complete at least 3 steps
    // additionalFlags: ['special_ending' as Flag],  // Optional: additional flags required
  },

  completionVideo: 'https://example.com/chapter1-complete.mp4',
  postChapterMessage: 'You\'ve uncovered the first clue in the mystery. The journey has just begun...',

  // ... rest of chapter definition
}
```

### Step 2: Set Completion Flags in Your Handlers

When the player completes an action, set the appropriate flag:

```typescript
// In handle-open.ts or wherever the box is opened
{
  type: 'SET_FLAG',
  flag: 'opened_metal_box' as Flag,
  value: true
}

// In handle-conversation.ts when talking to barista
{
  type: 'SET_FLAG',
  flag: 'talked_to_barista' as Flag,
  value: true
}
```

### Step 3: Player Uses Help (Limited to 10 per Chapter)

The player gets **10 AI-powered hints per chapter**. The system shows how many they have left:

```
> help
💡 "Look around the cafe carefully. Something unusual might be hidden."

💬 AI Hints remaining: 9/10

> help I don't know where to look
💡 "Check under the tables and examine the surroundings thoroughly. The metal box might be hidden beneath the furniture."

💬 AI Hints remaining: 8/10

> help how do I open the box
💡 "The box is locked. Talk to the barista - they seem to know something about it."

⚠️ You have 3 AI-powered hints remaining for this chapter. Use them wisely!
```

**After using all 10 AI hints:**
```
> help
💡 "Find a way to open the metal box."

🔋 You've used all 10 AI-powered hints for this chapter. Think carefully and explore!
```

The player still gets pre-written hints, but they're more generic. This encourages exploration!

### Step 4: Automatic Chapter Completion

When all steps are complete (all flags are set), the game automatically:
1. Shows the completion video
2. Displays the post-chapter message
3. Prompts for the next chapter (if defined)

## Example: Your Current Chapter

Based on your description, here's a complete happy path definition:

```typescript
happyPath: [
  // Step 1: Find the metal box
  {
    id: 'step_find_metal_box',
    order: 1,
    description: 'Find the metal box in the cafe',
    completionFlags: ['found_metal_box' as Flag, 'examined_metal_box' as Flag],
    baseHint: 'Explore the cafe. Pay attention to unusual objects.',
    detailedHint: 'Look under the tables. One of them might be hiding something.',
    conditionalHints: [
      {
        conditions: [{ type: 'FLAG', flag: 'examined_brown_notebook', value: true }],
        hint: 'You\'ve found the notebook. Keep exploring, there\'s more to discover.'
      }
    ]
  },

  // Step 2: Open the metal box
  {
    id: 'step_open_metal_box',
    order: 2,
    description: 'Find a way to open the metal box',
    completionFlags: ['opened_metal_box' as Flag],
    baseHint: 'The box won\'t open easily. You need to find the right approach.',
    detailedHint: 'The box is locked. Maybe someone in the cafe knows how to open it.',
    conditionalHints: [
      {
        conditions: [{ type: 'HAS_ITEM', itemId: 'item_key' }],
        hint: 'You found a key! Try using it on the metal box.'
      },
      {
        conditions: [
          { type: 'NO_FLAG', flag: 'talked_to_barista' },
          { type: 'LOCATION_IS', locationId: 'loc_cafe_main' }
        ],
        hint: 'Have you talked to the barista? They might be able to help.'
      }
    ]
  },

  // Step 3: Talk to the Barista
  {
    id: 'step_talk_to_barista',
    order: 3,
    description: 'Talk to the Barista about the metal box',
    completionFlags: ['talked_to_barista' as Flag],
    baseHint: 'The barista seems to know something. Strike up a conversation.',
    detailedHint: 'Talk to the barista and mention the metal box you found.'
  },

  // Step 4: Get the business card
  {
    id: 'step_receive_business_card',
    order: 4,
    description: 'Receive the business card from the Barista',
    completionFlags: ['received_business_card' as Flag, 'has_item_business_card' as Flag],
    baseHint: 'Continue your conversation with the barista.',
    detailedHint: 'Ask the barista about what they know. They might give you something useful.',
    conditionalHints: [
      {
        conditions: [{ type: 'FLAG', flag: 'barista_trusts_player', value: true }],
        hint: 'The barista seems to trust you now. Ask them directly about helping you.'
      }
    ]
  }
],

completionRequirements: {
  requireAllSteps: true
}
```

## Benefits

1. **AI adapts hints** to player's context (location, inventory, progress)
2. **Progressive difficulty** - generic hints first, detailed hints if player asks specific questions
3. **Limited helps** - 10 per chapter prevents spam and encourages exploration
4. **Cost control** - After 10 helps, uses pre-written hints (no AI cost)
5. **Automatic tracking** - no need to manually check completion
6. **Cleaner code** - all hint logic in one place
7. **Better UX** - players get help exactly when they need it, but must think strategically

## Testing

To test your happy path:

1. **Add the happy path** to your chapter in cartridge.ts
2. **Set completion flags** in your handlers (onOpen, onTake, conversation topics, etc.)
3. **Type "help"** at various stages to see contextual hints
4. **Complete all steps** and watch the automatic chapter completion

## Notes

- **Flags are OR conditions**: A step is complete if ANY of its completionFlags are true
- **Order matters**: Steps are shown in order, only the NEXT incomplete step gets a hint
- **Conditional hints**: Use conditions to provide smarter hints based on player state
- **Fallback system**: If AI fails, pre-written hints are used automatically (and don't count against limit!)
- **10 helps per chapter**: After 10 AI hints, players get pre-written baseHint/detailedHint
- **Counter resets**: Each chapter gets a fresh 10 AI-powered helps
- **Warnings**: Players get warned at 3 remaining, 1 remaining, and 0 remaining
