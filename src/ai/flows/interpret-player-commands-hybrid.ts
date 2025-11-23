'use server';

/**
 * @fileOverview Hybrid player command interpreter
 * Routes to either local LLM (Docker) or API LLM (Gemini) based on configuration
 */

import { interpretPlayerCommand as interpretPlayerCommandAPI } from './interpret-player-commands';
import { interpretPlayerCommandLocal } from './interpret-player-commands-local';
import { checkLocalLLMHealth } from '@/ai/local-llm-client';
import type { InterpretPlayerCommandInput, InterpretPlayerCommandOutput } from './interpret-player-commands';

// Request counter for tracking usage
let localRequestCount = 0;
let apiRequestCount = 0;

/**
 * Get the LLM mode from environment
 */
function getLLMMode(): 'local' | 'api' {
  const mode = process.env.NEXT_PUBLIC_LLM_MODE?.toLowerCase();
  return mode === 'local' ? 'local' : 'api';
}

/**
 * Interpret player command using either local or API LLM
 *
 * Flow:
 * 1. Check NEXT_PUBLIC_LLM_MODE environment variable
 * 2. If 'local', attempt to use Docker LLM with fallback to API
 * 3. If 'api' or undefined, use API LLM directly
 */
export async function interpretPlayerCommandHybrid(
  input: InterpretPlayerCommandInput
): Promise<InterpretPlayerCommandOutput> {
  const mode = getLLMMode();

  if (mode === 'local') {
    try {
      // Check if local LLM is healthy before attempting
      const isHealthy = await checkLocalLLMHealth();

      if (!isHealthy) {
        console.warn('\n⚠️  LOCAL LLM HEALTH CHECK FAILED - Falling back to API');
        console.log(`🌐 LLM Backend: ☁️  API (Gemini Flash Lite) - FALLBACK`);
        apiRequestCount++;
        console.log(`📊 Session Stats: Local=${localRequestCount} | API=${apiRequestCount}\n`);
        return await interpretPlayerCommandAPI(input);
      }

      localRequestCount++;
      const startTime = Date.now();
      console.log(`\n🤖 USING LOCAL LLM (Ollama/Docker) - Request #${localRequestCount}`);
      console.log(`🌐 LLM Backend: 🖥️  LOCAL (Llama 3.2 3B)`);
      console.log(`📝 Command: "${input.playerCommand}"`);

      const result = await interpretPlayerCommandLocal(input);
      const duration = Date.now() - startTime;

      console.log(`✅ Local LLM responded in ${duration}ms`);
      console.log(`💰 Cost: $0.00 (FREE!)`);
      console.log(`📊 Session Stats: Local=${localRequestCount} | API=${apiRequestCount}\n`);

      return result;
    } catch (error) {
      console.error('\n❌ LOCAL LLM FAILED - Falling back to API:', error);
      console.log(`🌐 LLM Backend: ☁️  API (Gemini Flash Lite) - FALLBACK`);
      apiRequestCount++;
      console.log(`📊 Session Stats: Local=${localRequestCount} | API=${apiRequestCount}\n`);
      return await interpretPlayerCommandAPI(input);
    }
  }

  // Use API by default
  apiRequestCount++;
  console.log(`\n☁️  USING API LLM (Gemini) - Request #${apiRequestCount}`);
  console.log(`🌐 LLM Backend: ☁️  API (Gemini Flash Lite)`);
  console.log(`📝 Command: "${input.playerCommand}"`);
  console.log(`📊 Session Stats: Local=${localRequestCount} | API=${apiRequestCount}\n`);
  return await interpretPlayerCommandAPI(input);
}

/**
 * Get current LLM mode status
 */
export async function getLLMStatus(): Promise<{
  mode: 'local' | 'api';
  localAvailable: boolean;
  usageStats: {
    localRequests: number;
    apiRequests: number;
    totalRequests: number;
  };
}> {
  const mode = getLLMMode();
  let localAvailable = false;

  if (mode === 'local') {
    localAvailable = await checkLocalLLMHealth();
  }

  return {
    mode,
    localAvailable,
    usageStats: {
      localRequests: localRequestCount,
      apiRequests: apiRequestCount,
      totalRequests: localRequestCount + apiRequestCount,
    },
  };
}
