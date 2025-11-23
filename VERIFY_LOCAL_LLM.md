# How to Verify Local LLM is Working

This guide shows you **5 different ways** to confirm your game is using the local Docker LLM instead of the API.

---

## Method 1: Run the Test Script (Easiest) ⭐

Run this simple command:

```bash
npm run test:llm
```

**What it does:**
- Checks if Docker LLM is healthy
- Sends a test command interpretation request
- Shows response time and validates output
- Confirms it's working locally

**Expected output:**
```
🔍 Testing Local LLM Connection...

1️⃣ Health Check...
✅ Local LLM is healthy and responding

2️⃣ Testing Command Interpretation...
✅ Successfully received response from local LLM
⏱️  Response time: 247ms

📦 Result:
{
  "commandToExecute": "examine door",
  "responseToPlayer": "You examine the door."
}

🎉 Local LLM is working correctly!
```

**To prove it's really local:**
1. Disconnect WiFi
2. Run `npm run test:llm` again
3. If it still works → **definitely using local LLM!** ✅

---

## Method 2: Check Console Logs (Most Visible) 👀

When you play the game and enter commands, check your terminal where `npm run dev` is running.

### If using LOCAL LLM, you'll see:
```
🤖 USING LOCAL LLM (Docker) - Request #1
📝 Command: "look at the door"
✅ Local LLM responded in 234ms
💰 Cost: $0.00 (FREE!)
📊 Usage Stats: Local=1 | API=0
```

### If using API LLM, you'll see:
```
☁️  USING API LLM (Gemini) - Request #1
📝 Command: "look at the door"
📊 Usage Stats: Local=0 | API=1
```

**These logs appear EVERY time a command is processed!**

---

## Method 3: Monitor Docker Logs (Technical) 🔧

Watch the Docker container logs in real-time:

```bash
docker logs -f llm-server
```

**What to look for:**
When you enter a game command, you should see activity in the Docker logs like:
```
llama_decode: n_tokens = 42, n_seq = 1
slot 0: processing request
...
slot 0: completed response
```

If you see these logs appearing when you play the game → **local LLM is being used!** ✅

---

## Method 4: Monitor Network Traffic (Advanced) 🌐

### Option A: Use Docker stats
```bash
docker stats llm-server
```

Watch the `NET I/O` column. When you enter commands, you should see network traffic increase (local communication on port 8080).

### Option B: Check what's listening on port 8080
```bash
lsof -i :8080
```

You should see the Docker container:
```
COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
docker    1234  niko   42u  IPv6  0x...      0t0  TCP *:8080 (LISTEN)
```

---

## Method 5: The WiFi Test (Definitive Proof) 📡

This is the **most definitive test** - exactly what you suggested!

### Steps:

1. **First, verify it works WITH WiFi:**
   ```bash
   # Make sure local mode is enabled
   # In .env: NEXT_PUBLIC_LLM_MODE=local

   npm run dev
   # Play the game, enter a command
   # Check console - should see "🤖 USING LOCAL LLM"
   ```

2. **Now disconnect WiFi:**
   - Turn off WiFi on your Mac
   - OR unplug ethernet cable

3. **Test again:**
   ```bash
   # Dev server should still be running
   # Enter another command in the game
   ```

4. **Results:**
   - ✅ **Still works + sees local LLM logs** → Using local LLM!
   - ❌ **Error about network/API** → Falling back to API (Docker not running?)
   - ❌ **Dev server crashes** → Something else is wrong

### Why this works:
- **Local LLM**: Only needs localhost network (WiFi not needed)
- **API LLM**: Requires internet to reach Gemini servers
- If commands work offline → **must be using local LLM!** 🎉

---

## Quick Troubleshooting

### ❌ Seeing "LOCAL LLM HEALTH CHECK FAILED"

**Check if Docker container is running:**
```bash
docker ps | grep llm-server
```

**If not running, start it:**
```bash
docker start llm-server
```

**If doesn't exist, create it:**
```bash
docker run -d \
  --name llm-server \
  -p 8080:8080 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/ggerganov/llama.cpp:server \
  --model hf://unsloth/Llama-3.2-3B-Instruct-GGUF/Llama-3.2-3B-Instruct-Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -c 2048
```

### ❌ Seeing "USING API LLM" instead of local

**Check your .env file:**
```bash
# Should have this line:
NEXT_PUBLIC_LLM_MODE=local
```

**Restart dev server after changing .env:**
```bash
# Ctrl+C to stop
npm run dev
```

### ❌ Port 8080 already in use

**Find what's using it:**
```bash
lsof -i :8080
```

**Kill it or use a different port:**
```bash
# Use port 8081 instead
docker run -d \
  --name llm-server \
  -p 8081:8080 \
  ...
```

Then update `.env`:
```bash
LOCAL_LLM_BASE_URL=http://localhost:8081
```

---

## Understanding the Usage Stats

After playing for a while, you'll see:
```
📊 Usage Stats: Local=25 | API=0
```

This means:
- **25 commands** processed by local LLM (FREE!)
- **0 commands** processed by API (no costs!)

If you see `API=X` where X > 0, it means some commands fell back to the API (usually because Docker wasn't running at that moment).

---

## My Recommendation

Use **Method 1** (test script) and **Method 5** (WiFi test) together:

1. Run `npm run test:llm` WITH WiFi → Should work ✅
2. Turn OFF WiFi
3. Run `npm run test:llm` again → Should STILL work ✅
4. Turn WiFi back on
5. Play the game and watch console logs for "🤖 USING LOCAL LLM"

**If all three work → you're 100% using the local Docker LLM!** 🎉

---

## Visual Confirmation Checklist

- [ ] `npm run test:llm` succeeds
- [ ] `npm run test:llm` works with WiFi OFF
- [ ] Console shows "🤖 USING LOCAL LLM (Docker)"
- [ ] Console shows "💰 Cost: $0.00 (FREE!)"
- [ ] `docker logs -f llm-server` shows activity when playing
- [ ] Game works with WiFi disconnected
- [ ] Usage stats show `Local=X | API=0`

If you can check all of these → **Local LLM is confirmed working!** ✅
