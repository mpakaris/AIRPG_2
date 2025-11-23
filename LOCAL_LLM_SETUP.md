# Local LLM Setup Guide

This guide will help you run a local LLM in Docker for cost-free command interpretation.

## What We Built

Your codebase now has a **hybrid AI system**:
- ✅ **Local LLM** (Docker) - For command interpretation (fast, free, private)
- ✅ **API LLM** (Gemini) - For narrative, NPC dialogue, story generation (creative tasks)
- ✅ **Automatic Fallback** - If local LLM fails, it falls back to API

## Environment Variables

Add these to your `.env` file:

```bash
# LLM Mode Configuration
# Options: "local" (use Docker LLM) or "api" (use Gemini API)
NEXT_PUBLIC_LLM_MODE=local

# Local LLM Server Configuration (only needed if using local mode)
LOCAL_LLM_BASE_URL=http://localhost:8080
LOCAL_LLM_MODEL_NAME=llama3.2-3b
```

## Recommended Models for M1 Mac

Your M1 Mac is perfect for running these models. Here are the best options:

### Option 1: Llama 3.2 3B (Recommended)
- **Size**: ~2GB (Q4 quantization)
- **Speed**: Very fast on M1
- **Quality**: Excellent for command interpretation
- **Best for**: Your use case!

### Option 2: Phi-3.5 Mini 3.8B
- **Size**: ~2.3GB (Q4)
- **Speed**: Fast
- **Quality**: Great instruction following

### Option 3: Qwen2.5 3B
- **Size**: ~2GB (Q4)
- **Speed**: Fast
- **Quality**: Strong multilingual support

## Docker Setup Steps

### Step 1: Pull and Run the Model

Choose ONE of these commands based on your preferred model:

**Llama 3.2 3B (Recommended):**
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

**Phi-3.5 Mini:**
```bash
docker run -d \
  --name llm-server \
  -p 8080:8080 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/ggerganov/llama.cpp:server \
  --model hf://microsoft/Phi-3.5-mini-instruct-gguf/Phi-3.5-mini-instruct-q4.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -c 2048
```

**Qwen2.5 3B:**
```bash
docker run -d \
  --name llm-server \
  -p 8080:8080 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/ggerganov/llama.cpp:server \
  --model hf://Qwen/Qwen2.5-3B-Instruct-GGUF/qwen2.5-3b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -c 2048
```

### Step 2: Verify the Model is Running

Check container status:
```bash
docker ps | grep llm-server
```

Check logs:
```bash
docker logs llm-server
```

Test the API endpoint:
```bash
curl http://localhost:8080/health
```

### Step 3: Test with Your Game

1. Make sure `NEXT_PUBLIC_LLM_MODE=local` in your `.env`
2. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```
3. Play the game and enter a command
4. Check console logs - you should see "Using local LLM for command interpretation"

## Managing the Docker Container

**Stop the LLM:**
```bash
docker stop llm-server
```

**Start the LLM:**
```bash
docker start llm-server
```

**Remove the LLM (to switch models):**
```bash
docker stop llm-server
docker rm llm-server
```

**View resource usage:**
```bash
docker stats llm-server
```

## Switching Between Local and API

Edit your `.env` file:

```bash
# Use local Docker LLM
NEXT_PUBLIC_LLM_MODE=local

# OR use API (Gemini)
NEXT_PUBLIC_LLM_MODE=api
```

Then restart your dev server.

## Troubleshooting

### "Local LLM health check failed, falling back to API"
- Check if Docker container is running: `docker ps`
- Check logs: `docker logs llm-server`
- Verify port 8080 is not in use: `lsof -i :8080`

### Model download is slow
- First run downloads the model (~2GB)
- The `-v ~/.cache/huggingface` flag caches it locally
- Subsequent runs will be instant

### High memory usage
- 3B parameter models use ~2-3GB RAM
- M1 Mac handles this easily
- Check usage: `docker stats llm-server`

### Want to use a different model?
1. Stop and remove current container
2. Run docker command with new model
3. Update `LOCAL_LLM_MODEL_NAME` in `.env` (optional, for logging)

## Performance Expectations

On M1 Mac with 3B model:
- **Cold start**: 5-10 seconds (first request after restart)
- **Warm requests**: 200-500ms per command
- **Memory**: 2-3GB RAM
- **CPU**: Low (10-20% during inference)

This is **significantly faster** than API calls and costs **$0**! 🎉

## Cost Savings

Assuming 1000 commands per day:
- **API mode**: Variable cost depending on provider
- **Local mode**: $0 (just electricity)
- **Break-even**: Instant! No monthly API costs.

## Advanced: Using Ollama (Alternative)

If you prefer Ollama over llama.cpp:

```bash
# Install Ollama
brew install ollama

# Pull model
ollama pull llama3.2:3b

# Run server
ollama serve
```

Update `.env`:
```bash
LOCAL_LLM_BASE_URL=http://localhost:11434
```

## Next Steps

1. Choose your model
2. Run the Docker command
3. Update your `.env` file
4. Restart your dev server
5. Test the game!

For questions or issues, check the logs with `docker logs llm-server`.
