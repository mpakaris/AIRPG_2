# AI Cost Comparison: Gemini Flash Lite vs GPT-5 Nano

## Pricing Overview

### Gemini Flash Lite (Primary AI)
- **Input:** $0.10 per 1M tokens
- **Output:** $0.40 per 1M tokens
- **Usage:** Always used for every command (100%)

### GPT-5 Nano (Safety AI)
- **Input:** $0.05 per 1M tokens
- **Output:** $0.40 per 1M tokens
- **Usage:** Only triggered when primary confidence < 70% (~10% of commands)

---

## Per-Command Token Usage

Based on actual game data:
- **Input tokens:** ~1,420 per command
- **Output tokens:** ~75 per command

---

## Cost Breakdown

### Scenario 1: Primary AI Only (90% of commands)

**Gemini Flash Lite:**
- Input: 1,420 tokens × $0.10/1M = $0.000142
- Output: 75 tokens × $0.40/1M = $0.000030
- **Total: $0.000172 per command**

### Scenario 2: Primary + Safety AI (10% of commands)

**Gemini Flash Lite (Primary):**
- Input: 1,420 tokens × $0.10/1M = $0.000142
- Output: 75 tokens × $0.40/1M = $0.000030
- Subtotal: $0.000172

**GPT-5 Nano (Safety):**
- Input: 1,420 tokens × $0.05/1M = $0.000071
- Output: 75 tokens × $0.40/1M = $0.000030
- Subtotal: $0.000101

**Combined Total: $0.000273 per command**

### Average Cost Per Command

Weighted average:
- (90% × $0.000172) + (10% × $0.000273) = **$0.000182**

---

## Total Cost Projections

### Low Usage: 1,000 Commands/Month

| Metric | Primary Only | With Safety Net |
|--------|--------------|-----------------|
| Commands | 900 (90%) | 100 (10%) |
| Cost | $0.155 | $0.027 |
| **Monthly Total** | **$0.182** | - |
| **Annual Total** | **$2.18** | - |

**Breakdown:**
- Primary AI calls: 1,000
- Safety AI calls: 100
- Total AI calls: 1,100

### Medium Usage: 10,000 Commands/Month

| Metric | Primary Only | With Safety Net |
|--------|--------------|-----------------|
| Commands | 9,000 (90%) | 1,000 (10%) |
| Cost | $1.548 | $0.273 |
| **Monthly Total** | **$1.82** | - |
| **Annual Total** | **$21.84** | - |

**Breakdown:**
- Primary AI calls: 10,000
- Safety AI calls: 1,000
- Total AI calls: 11,000

### High Usage: 100,000 Commands/Month

| Metric | Primary Only | With Safety Net |
|--------|--------------|-----------------|
| Commands | 90,000 (90%) | 10,000 (10%) |
| Cost | $15.48 | $2.73 |
| **Monthly Total** | **$18.20** | - |
| **Annual Total** | **$218.40** | - |

**Breakdown:**
- Primary AI calls: 100,000
- Safety AI calls: 10,000
- Total AI calls: 110,000

### Very High Usage: 1,000,000 Commands/Month

| Metric | Primary Only | With Safety Net |
|--------|--------------|-----------------|
| Commands | 900,000 (90%) | 100,000 (10%) |
| Cost | $154.80 | $27.30 |
| **Monthly Total** | **$182.00** | - |
| **Annual Total** | **$2,184.00** | - |

**Breakdown:**
- Primary AI calls: 1,000,000
- Safety AI calls: 100,000
- Total AI calls: 1,100,000

---

## Model Comparison: Using Only One Model

What if we used only one model for all commands (no Safety Net)?

### Option 1: Gemini Flash Lite Only

**Per command cost:** $0.000172

| Usage Level | Monthly Cost | Annual Cost |
|-------------|--------------|-------------|
| 1,000 | $0.17 | $2.04 |
| 10,000 | $1.72 | $20.64 |
| 100,000 | $17.20 | $206.40 |
| 1,000,000 | $172.00 | $2,064.00 |

### Option 2: GPT-5 Nano Only

**Per command cost:** $0.000101

| Usage Level | Monthly Cost | Annual Cost |
|-------------|--------------|-------------|
| 1,000 | $0.10 | $1.21 |
| 10,000 | $1.01 | $12.12 |
| 100,000 | $10.10 | $121.20 |
| 1,000,000 | $101.00 | $1,212.00 |

---

## Key Insights

### 1. GPT-5 Nano is Cheaper Per Token
- **Input cost:** 50% cheaper ($0.05 vs $0.10)
- **Output cost:** Same as Gemini ($0.40)
- **Overall:** ~41% cheaper per command ($0.000101 vs $0.000172)

### 2. Safety Net Adds Only 5.8% Overhead
- Single model (Gemini): $0.000172/command
- Safety Net hybrid: $0.000182/command
- **Overhead: $0.000010 (5.8%)**

### 3. Cost Savings by Using Only GPT-5 Nano
At high scale (1M commands/month):
- Gemini Flash Lite: $172.00/month
- GPT-5 Nano: $101.00/month
- **Savings: $71.00/month ($852/year)**

### 4. Break-Even Analysis
Using Safety Net vs Gemini-only:
- Safety Net: $0.000182/command
- Gemini-only: $0.000172/command
- **Extra cost: $0.000010/command**

At 1M commands:
- Extra cost = $10.00/month
- **This buys you quality validation on 100,000 commands**

---

## Recommendations

### For Current Scale (<10,000 commands/month)
✅ **Keep Safety Net with Gemini + GPT-5 Nano**
- Cost: ~$2/month
- Benefit: Quality validation, confidence scoring
- The 5.8% overhead is negligible at this scale

### For Medium Scale (10,000-100,000 commands/month)
✅ **Keep Safety Net**
- Cost: $2-$20/month
- Still provides valuable quality assurance
- Consider monitoring safety trigger rate

### For Large Scale (100,000+ commands/month)
🤔 **Consider alternatives:**
1. **Switch to GPT-5 Nano only:** Save 41% ($71/month at 1M commands)
2. **Optimize Safety Net triggers:** Reduce from 10% to 5% (save ~$5/month per 1M commands)
3. **Use local LLM for high-confidence scenarios:** Could save 50-90% on primary AI calls

### For Enterprise Scale (1M+ commands/month)
🚀 **Hybrid local + API approach:**
- Local LLM for simple commands (70%): $0/month
- Gemini for complex commands (25%): $43/month
- GPT-5 Nano for validation (5%): $5/month
- **Total: ~$48/month vs $182/month (73% savings)**

---

## Current Configuration

Your current setup:
```bash
# Primary AI: Gemini Flash Lite
PRIMARY_AI_INPUT_COST=0.10
PRIMARY_AI_OUTPUT_COST=0.40

# Safety AI: GPT-5 Nano
SAFETY_AI_INPUT_COST=0.05
SAFETY_AI_OUTPUT_COST=0.40
```

**Current average cost:** $0.000182 per command

---

## Action Items

### Immediate
- ✅ Monitor actual Safety AI trigger rate in admin dashboard
- ✅ Track costs per player to identify heavy users
- ✅ Set up alerts if costs exceed expected thresholds

### Short-term (if costs increase)
- 🔄 Tune confidence threshold (currently 70%) to reduce Safety AI triggers
- 🔄 Optimize prompts to reduce token usage
- 🔄 Cache common command interpretations

### Long-term (if reaching 100K+ commands/month)
- 🚀 Implement local LLM for simple commands
- 🚀 Consider switching primary model to GPT-5 Nano (41% cheaper)
- 🚀 Implement smart routing based on command complexity

---

## Summary

| Model Strategy | Cost/Command | Cost at 1M/mo | Notes |
|----------------|--------------|---------------|-------|
| Gemini only | $0.000172 | $172 | Current quality baseline |
| GPT-5 Nano only | $0.000101 | $101 | 41% cheaper, untested quality |
| **Safety Net (Current)** | **$0.000182** | **$182** | **+5.8% for quality validation** |
| Local + API hybrid | $0.000050 | $50 | 73% savings, requires setup |

**Verdict:** At your current scale, the Safety Net overhead is trivial. Keep it for quality assurance. Consider optimizations only if you exceed 100,000 commands/month.
