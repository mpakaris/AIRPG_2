'use server';

/**
 * @fileOverview Client for communicating with local LLM running in Docker
 * Supports OpenAI-compatible API format (standard for llama.cpp, Ollama, vLLM, etc.)
 */

import { z } from 'zod';

interface LocalLLMConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

const DEFAULT_CONFIG: LocalLLMConfig = {
  baseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8080',
  model: process.env.LOCAL_LLM_MODEL_NAME || 'llama3.2-3b',
  timeout: 30000, // 30 seconds
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call the local LLM with a structured prompt
 */
export async function callLocalLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  responseSchema: z.ZodType<T>,
  config: Partial<LocalLLMConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // Check if using Ollama (port 11434) - it doesn't fully support response_format
  const isOllama = finalConfig.baseUrl.includes('11434');

  // Some models don't support custom temperature (e.g., gpt-5-nano)
  const supportsTemperature = !finalConfig.model.includes('gpt-5-nano');

  const requestBody: ChatCompletionRequest = {
    model: finalConfig.model,
    messages,
    ...(supportsTemperature ? { temperature: 0.3 } : {}), // Only set if model supports it
    max_tokens: 500, // Short responses for command parsing
    ...(isOllama ? {} : { response_format: { type: 'json_object' } }), // Only for non-Ollama
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

    const response = await fetch(`${finalConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Local LLM returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from local LLM');
    }

    // Extract JSON from response (handles markdown code blocks, extra text, etc.)
    let jsonString = content.trim();

    // Remove markdown code block wrappers if present
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    // If response contains both text and JSON, try to extract just the JSON
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    // Parse JSON response
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse JSON from LLM response:', content);
      throw new Error(`Invalid JSON response from local LLM: ${content.substring(0, 200)}`);
    }

    // Validate against schema
    const validatedResponse = responseSchema.parse(jsonResponse);

    return validatedResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Local LLM request timed out after ${finalConfig.timeout}ms`);
      }
      console.error('Local LLM error:', error.message);
      throw error;
    }
    throw new Error('Unknown error calling local LLM');
  }
}

/**
 * Check if local LLM is available and responding
 * Works with both Ollama and llama.cpp server
 */
export async function checkLocalLLMHealth(): Promise<boolean> {
  try {
    const config = DEFAULT_CONFIG;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try Ollama health endpoint first (port 11434)
    if (config.baseUrl.includes('11434')) {
      const response = await fetch(`${config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    }

    // Try llama.cpp health endpoint (port 8080)
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get token usage stats from the last request
 */
export interface TokenUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function getLastTokenUsage(): Promise<TokenUsageStats | null> {
  // This would be populated by the last callLocalLLM response
  // For now, return null - can be enhanced later
  return null;
}
