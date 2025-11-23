# Quick Setup: Ollama for Mac M1

Ollama is the easiest way to run local LLMs on Mac. Much simpler than Docker!

## Installation Steps

### Step 1: Install Ollama

```bash
brew install ollama
```

### Step 2: Start Ollama Service

```bash
# Start in background
ollama serve &

# OR use this to keep it running in a separate terminal
ollama serve
```

You should see:
```
Ollama is running
```

### Step 3: Download the Model

```bash
# Download Llama 3.2 3B (recommended - ~2GB)
ollama pull llama3.2:3b
```

This will download the model (one-time, takes a few minutes).

### Step 4: Test It Works

```bash
ollama run llama3.2:3b "Convert this to a game command: look at the door"
```

You should get a response! Press Ctrl+D to exit.

### Step 5: Update Your .env

```bash
# In your .env file:
NEXT_PUBLIC_LLM_MODE=local
LOCAL_LLM_BASE_URL=http://localhost:11434
LOCAL_LLM_MODEL_NAME=llama3.2:3b
```

### Step 6: Test with Your Game

```bash
# Run the test script
npm run test:llm
```

Should see:
```
✅ Local LLM is healthy and responding
✅ Successfully received response from local LLM
```

### Step 7: Start Your Dev Server

```bash
npm run dev
```

Play the game and watch console logs - you should see:
```
🤖 USING LOCAL LLM (Docker) - Request #1
💰 Cost: $0.00 (FREE!)
```

---

## Managing Ollama

### Stop Ollama
```bash
# Find the process
ps aux | grep ollama

# Kill it
killall ollama
```

### Restart Ollama
```bash
ollama serve &
```

### List Downloaded Models
```bash
ollama list
```

### Remove a Model
```bash
ollama rm llama3.2:3b
```

### Download Other Models
```bash
# Smaller, faster (1.3B)
ollama pull llama3.2:1b

# Larger, better quality (7B - needs 8GB RAM)
ollama pull llama3.2:7b

# Microsoft Phi-3.5 (3.8B)
ollama pull phi3.5
```

---

## Troubleshooting

### Port 11434 already in use?
```bash
# Check what's using it
lsof -i :11434

# Kill Ollama and restart
killall ollama
ollama serve &
```

### Model download is slow?
This is normal - it's a ~2GB download. Be patient!

### Test if Ollama is running
```bash
curl http://localhost:11434/api/tags
```

Should return list of models.

---

## Why Ollama > Docker llama.cpp

| Feature | Ollama | llama.cpp Docker |
|---------|--------|------------------|
| Installation | `brew install ollama` | Complex Docker commands |
| Mac M1 Optimization | ✅ Native | ⚠️ Through Docker |
| Model Management | `ollama pull model` | Manual HuggingFace downloads |
| Updates | `brew upgrade ollama` | Manual container rebuilds |
| API Compatibility | OpenAI-compatible | OpenAI-compatible |
| Memory Usage | Optimized | Higher overhead |

---

## Performance on M1 Mac

With llama3.2:3b on M1:
- First request: ~1-2 seconds (loading)
- Subsequent requests: 200-500ms
- Memory usage: 2-3GB
- CPU usage: 10-20% during inference

---

## Make Ollama Start on Boot (Optional)

Create a LaunchAgent:

```bash
# Create the plist file
cat > ~/Library/LaunchAgents/com.ollama.server.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load it
launchctl load ~/Library/LaunchAgents/com.ollama.server.plist
```

Now Ollama will start automatically when you log in!

---

## Quick Reference

```bash
# Start Ollama
ollama serve &

# Pull model
ollama pull llama3.2:3b

# Test model
ollama run llama3.2:3b "test"

# Check status
curl http://localhost:11434/api/tags

# Test with your game
npm run test:llm

# Start dev server
npm run dev
```

**That's it! Much simpler than Docker.** 🎉
