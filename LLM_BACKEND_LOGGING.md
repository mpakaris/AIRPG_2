# LLM Backend Logging - Reference Guide

## ✅ What Was Added

### 1. Main Game Flow (Safety Net)
**Location:** `src/app/actions.ts`

Shows which LLM backend is being used for command interpretation:

```
🤖 ═══════════════════════════════════════════════════════════
   AI COMMAND INTERPRETATION
═══════════════════════════════════════════════════════════
📥 Player Input: "look around"
🎯 Command Output: "look around"
📊 Confidence: 75.0%
🔄 AI Calls: 1 (primary)
🌐 LLM Backend: ☁️  API (Gemini Flash Lite)  ← NEW!
⏱️  Latency: 342ms
   ├─ Primary AI: 75.0% (Gemini)
   └─ Safety AI: (not called)
💭 Reasoning: Player wants to survey the area
═══════════════════════════════════════════════════════════
```

**Current Status:** Will always show `☁️ API (Gemini Flash Lite)` because your game uses the Safety Net flow.

---

### 2. Local LLM Hybrid Flow (When Used)
**Location:** `src/ai/flows/interpret-player-commands-hybrid.ts`

**If Local LLM is Used:**
```
🤖 USING LOCAL LLM (Ollama/Docker) - Request #1
🌐 LLM Backend: 🖥️  LOCAL (Llama 3.2 3B)  ← Shows local!
📝 Command: "look around"
✅ Local LLM responded in 234ms
💰 Cost: $0.00 (FREE!)
📊 Session Stats: Local=1 | API=0
```

**If Falls Back to API:**
```
⚠️  LOCAL LLM HEALTH CHECK FAILED - Falling back to API
🌐 LLM Backend: ☁️  API (Gemini Flash Lite) - FALLBACK
📊 Session Stats: Local=0 | API=1
```

**If API Mode Configured:**
```
☁️  USING API LLM (Gemini) - Request #1
🌐 LLM Backend: ☁️  API (Gemini Flash Lite)
📝 Command: "look around"
📊 Session Stats: Local=0 | API=1
```

---

## 📊 LLM Backend Indicators

| Icon | Backend | Model | Cost | Requires Internet |
|------|---------|-------|------|-------------------|
| 🖥️ | LOCAL | Llama 3.2 3B (Ollama) | $0.00 | ❌ No |
| ☁️ | API | Gemini Flash Lite | ~$0.001/cmd | ✅ Yes |
| ☁️ | API (FALLBACK) | Gemini Flash Lite | ~$0.001/cmd | ✅ Yes |

---

## 🎮 What You'll See When Playing

### Current Setup (Safety Net with API)
Every command will show:
```
🌐 LLM Backend: ☁️  API (Gemini Flash Lite)
```

This is expected! Your game uses the Safety Net flow which is API-based.

---

### If You Switch to Local LLM (Future)
If we integrate local LLM into the Safety Net flow, you'd see:
```
🌐 LLM Backend: 🖥️  LOCAL (Llama 3.2 3B)
```

And the session stats would track:
```
📊 Session Stats: Local=25 | API=0
```

Showing you're using 100% local LLM!

---

## 🔍 Quick Reference: Which Flow Uses What?

### Current Game Flow
```
Player Input
    ↓
interpretCommandWithSafetyNet (actions.ts)
    ↓
guidePlayerWithNarrator (Gemini Flash API) ← Always API
    ↓
Command Execution
```

**Log shows:** `🌐 LLM Backend: ☁️  API (Gemini Flash Lite)`

---

### Local LLM Hybrid Flow (Not Currently Used)
```
Player Input
    ↓
interpretPlayerCommandHybrid
    ↓
Check NEXT_PUBLIC_LLM_MODE
    ↓
├─ "local" → interpretPlayerCommandLocal (Ollama) → 🖥️  LOCAL
└─ "api"   → interpretPlayerCommandAPI (Gemini)   → ☁️  API
```

**Log shows:** Either `🖥️ LOCAL` or `☁️ API` depending on mode

---

## 🧪 Testing

### Test Current Game (API)
```bash
npm run dev
```
Enter "look around"

**Expected log:**
```
🌐 LLM Backend: ☁️  API (Gemini Flash Lite)
```

### Test Local LLM (Standalone)
```bash
npm run test:llm
```

**Expected log:**
```
🌐 LLM Backend: 🖥️  LOCAL (Llama 3.2 3B)
```
(But only if Ollama is running and NEXT_PUBLIC_LLM_MODE=local)

---

## 💡 Want to See Local LLM in Your Game?

To integrate local LLM into your game's Safety Net flow, I would need to:

1. Create `guide-player-with-narrator-local.ts` (local version)
2. Modify Safety Net to call local LLM for primary AI
3. Keep API as fallback for safety AI (dual-backend approach)
4. Test extensively

**Benefits:**
- 🖥️ Show `LOCAL` in logs
- 💰 Reduced costs
- 🚀 Faster responses (no network)
- 📊 Track Local vs API usage

**Considerations:**
- Local LLM may not handle complex game master role as well
- Would need thorough testing
- Gemini Flash Lite is already very cheap (~$0.001 per command)

**Let me know if you want me to build this!** 🚀
