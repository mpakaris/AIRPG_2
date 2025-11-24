# Admin Dashboard Update - Detailed Log Viewing

## ✅ Changes Made

### 1. Fixed Firebase Logging
**File:** `src/app/actions.ts`

**What Was Fixed:**
- ✅ Added correct model name: `gemini-2.5-flash-lite`
- ✅ Updated pricing to Gemini Flash Lite rates:
  - Input: $0.10 per 1M tokens
  - Output: $0.40 per 1M tokens
- ✅ Fixed token estimates (1420 input, 75 output per command)
- ✅ Calculate actual costs instead of hardcoded values

**AI Metadata Now Saved:**
```javascript
aiInterpretation: {
    primaryAI: {
        model: 'gemini-2.5-flash-lite',
        confidence: 0.75,
        commandToExecute: 'look around',
        reasoning: '...',
        latencyMs: 342,
        costUSD: 0.000172
    },
    safetyAI: {  // Only if triggered
        model: 'gpt-5-nano',
        confidence: 0.65,
        ...
    },
    finalDecision: {
        source: 'primary',
        confidence: 0.75,
        ...
    },
    totalAICalls: 1,
    totalCostUSD: 0.000172
}
```

---

### 2. Redesigned Admin Dashboard
**File:** `src/app/admin/UsersTab.tsx`

**Before (Broken):**
- Tried to show all logs as simple messages
- Showed empty brackets `{}` for EnhancedCommandLog entries
- No way to see AI metadata, performance metrics, or detailed information

**After (New Accordion UI):**
- **Accordion layout** with expandable sections
- **Player prompt as title** - easy to scan
- **All details hidden by default** - clean interface
- **Click to expand** - shows comprehensive information

---

## 🎨 New UI Layout

### Accordion Title (Collapsed State)
```
┌─────────────────────────────────────────────────────────┐
│ Turn 5   "I stand up and look around"                ✓ │
└─────────────────────────────────────────────────────────┘
```

Shows:
- Turn number (blue badge)
- Player's exact input (truncated if too long)
- Success indicator (✓ green or ✗ red)

### Expanded State
Click to see full details organized in colored sections:

#### 📥 Player Input (Blue Border)
- Raw input
- Preprocessed input (if different)

#### 🤖 AI Interpretation (Purple Border)
**Primary AI Card:**
- Model name (gemini-2.5-flash-lite)
- Confidence score (75.0%)
- Command output
- Reasoning
- Latency & Cost

**Safety AI Card (if triggered):**
- Model name (gpt-5-nano)
- Confidence score
- Command output
- Cost

**Final Decision:**
- Which AI was used (primary/safety/consensus)
- Final confidence
- Total AI calls
- Total cost

#### ⚙️ Execution (Green Border)
- Verb executed (examine, take, use, etc.)
- Target entity
- Effects applied (count and types)
- Success status
- Error message (if any)

#### 💬 UI Messages (Gray Border)
Shows all messages sent to player:
- Narrator responses
- System messages
- Media attachments (images, etc.)

#### ⏱️ Performance (Yellow Border)
- Preprocessing time
- AI interpretation time
- Execution time
- Total time

#### 📊 Token Usage
- Input tokens
- Output tokens
- Total tokens

---

## 📊 Updated Pricing

### Admin Dashboard
**File:** `src/app/admin/UsersTab.tsx:38-41`

```typescript
const PRICING = {
    input: 0.10 / 1_000_000,  // Gemini Flash Lite
    output: 0.40 / 1_000_000, // Gemini Flash Lite
};
```

### Firebase Logging
**File:** `src/app/actions.ts:774-777`

```typescript
const GEMINI_PRICING = {
    input: 0.10 / 1_000_000,
    output: 0.40 / 1_000_000,
};
```

**Cost per command:** ~$0.000172 ($0.00017)

---

## 🎯 What You Can Now See

### For Each Player Command:

1. **At a Glance (Collapsed)**
   - Turn number
   - What the player typed
   - Whether it succeeded

2. **Detailed View (Expanded)**
   - Complete AI decision-making process
   - Which model was used
   - Confidence scores and reasoning
   - Performance metrics
   - Actual costs
   - Complete message history
   - Token usage

---

## 🔍 Example: What You'll See

### Command Log Entry

**Title:**
```
Turn 15 | "examine the safe" | ✓
```

**Expanded Details:**

**📥 Player Input**
- Raw: "examine the safe"
- Preprocessed: "examine the safe"

**🤖 AI Interpretation**
- Primary AI (gemini-2.5-flash-lite)
  - Confidence: 85.0%
  - Command: "examine safe"
  - Reasoning: "Player wants to inspect the safe"
  - 342ms • $0.000172

- Final Decision: primary (85.0%)
- Total AI Calls: 1
- Total Cost: $0.000172

**⚙️ Execution**
- Verb: examine
- Target: safe
- Effects: 2 (SHOW_MESSAGE, SET_FOCUS)
- Success: ✓ Yes

**💬 UI Messages (2)**
- Narrator: "You examine the safe closely..."
- 📎 Image of safe

**⏱️ Performance**
- Preprocessing: 5ms
- AI: 342ms
- Execution: 23ms
- Total: 370ms

**Tokens: 1420 in / 75 out / 1495 total**

---

## 🚀 How to Use

### Access Admin Dashboard
```
http://localhost:9002/admin
```

### View Player Logs
1. Go to "Users" tab
2. Click on a user
3. Scroll to "Message Logs" card
4. Click any accordion item to expand details

### What to Look For

**Performance Issues:**
- High latency (>1000ms)
- Many effects applied
- Long execution times

**AI Issues:**
- Low confidence scores (<60%)
- Safety AI being triggered often
- Invalid commands

**Cost Tracking:**
- Per-command costs
- Total costs shown in stats card
- Compare costs across players

---

## 📈 Benefits

### Before
- ❌ Couldn't see AI decisions
- ❌ Empty brackets for new logs
- ❌ No performance metrics
- ❌ No cost tracking
- ❌ Hard to debug issues

### After
- ✅ Complete AI transparency
- ✅ All logs display properly
- ✅ Performance metrics visible
- ✅ Accurate cost tracking
- ✅ Easy debugging with detailed info

---

## 🔧 Technical Details

### Log Types Supported

**1. EnhancedCommandLog (New Format)**
- Type: 'command'
- Contains: input, aiInterpretation, execution, uiMessages, performance, tokens
- Display: Full accordion with all sections

**2. Message (Legacy Format)**
- Type: 'text', 'image', etc.
- Contains: senderName, content, media, usage
- Display: Simple accordion with sender and content

### Backward Compatibility
- ✅ Old logs still display
- ✅ New logs show enhanced details
- ✅ Mixed logs handled gracefully

---

## 💡 Pro Tips

### Monitor Costs
Check the "Game Stats" card to see:
- Total messages
- Total tokens
- Estimated cost

### Debug Commands
Expand a failed command (✗) to see:
- What the player typed
- How AI interpreted it
- Where it failed
- Error message

### Performance Optimization
Look for:
- Commands with high latency
- Many effects (slow state updates)
- Large token usage

### AI Quality
Monitor:
- Confidence scores
- Safety AI trigger rate
- Invalid command rate

---

## 🧪 Testing the Update

### Test Plan

1. **Play the game** - Enter 5-10 commands
2. **Go to admin dashboard** - http://localhost:9002/admin
3. **Select your user** in the Users tab
4. **Check Message Logs** card
5. **Click an accordion item** to expand

**Expected Result:**
- ✅ See turn numbers and player inputs
- ✅ Click to expand shows full details
- ✅ AI model: gemini-2.5-flash-lite
- ✅ Costs match Gemini pricing
- ✅ All sections display properly

### Verification Checklist

- [ ] Can see player input in accordion titles
- [ ] Success/failure indicators show correctly
- [ ] Expanding shows all 6 sections (Input, AI, Execution, Messages, Performance, Tokens)
- [ ] AI model name shows as "gemini-2.5-flash-lite"
- [ ] Costs are realistic (~$0.00017 per command)
- [ ] Performance metrics display
- [ ] UI messages section shows narrator responses
- [ ] Token counts are reasonable

---

## 🎉 Summary

Your admin dashboard now provides:
1. **Complete visibility** into player interactions
2. **AI transparency** - see exactly how commands are interpreted
3. **Accurate cost tracking** with Gemini Flash Lite pricing
4. **Performance metrics** for optimization
5. **Clean, organized UI** with expandable sections

**No more empty brackets!** All logs display properly with comprehensive details. 🚀
