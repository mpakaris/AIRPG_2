/**
 * Test script to verify local LLM is working
 * Run with: npx tsx scripts/test-local-llm.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

import { callLocalLLM, checkLocalLLMHealth } from '../src/ai/local-llm-client';
import { z } from 'zod';

const TestOutputSchema = z.object({
  commandToExecute: z.string(),
  responseToPlayer: z.string(),
});

async function testLocalLLM() {
  console.log('🔍 Testing Local LLM Connection...\n');

  // Show configuration
  const baseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8080';
  const modelName = process.env.LOCAL_LLM_MODEL_NAME || 'llama3.2-3b';
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Model: ${modelName}\n`);

  // Test 1: Health Check
  console.log('1️⃣ Health Check...');
  const isHealthy = await checkLocalLLMHealth();

  if (!isHealthy) {
    console.log('❌ Local LLM is NOT responding');
    console.log('\n💡 Troubleshooting:');
    if (baseUrl.includes('11434')) {
      console.log('   • Check if Ollama is running: ps aux | grep ollama');
      console.log('   • Start Ollama: ollama serve &');
      console.log('   • Test Ollama: curl http://localhost:11434/api/tags');
    } else {
      console.log('   • Check if Docker container is running: docker ps | grep llm-server');
      console.log('   • Start container: docker start llm-server');
    }
    console.log('');
    process.exit(1);
  }

  console.log('✅ Local LLM is healthy and responding\n');

  // Test 2: Simple Command Interpretation
  console.log('2️⃣ Testing Command Interpretation...');

  const systemPrompt = `You are a command interpreter for a text game.

You MUST respond with ONLY valid JSON in this exact format:
{"responseToPlayer": "message", "commandToExecute": "command"}

Available commands: examine, take, go, use

Example:
Input: "look at the door"
Output: {"responseToPlayer": "Looking at the door", "commandToExecute": "examine door"}

Remember: Output ONLY JSON, no other text!`;

  const userPrompt = 'Player input: "look at the door"\n\nRespond with ONLY JSON:';

  try {
    const startTime = Date.now();
    const result = await callLocalLLM(
      systemPrompt,
      userPrompt,
      TestOutputSchema
    );
    const duration = Date.now() - startTime;

    console.log('✅ Successfully received response from local LLM');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('\n📦 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n🎉 Local LLM is working correctly!\n');

    // Test 3: Verify it's really local (no internet needed)
    console.log('3️⃣ Internet Check...');
    console.log('💡 The test succeeded, which means:');
    console.log(`   ✅ Local LLM is running on ${baseUrl}`);
    console.log('   ✅ Your Next.js app can communicate with it');
    console.log('   ✅ Command interpretation will work offline');
    console.log('\n🔬 To prove it\'s local, you can:');
    console.log('   1. Disconnect WiFi');
    console.log('   2. Run this test again (npm run test:llm)');
    console.log('   3. If it still works → definitely using local LLM!\n');

  } catch (error) {
    console.log('❌ Failed to get response from local LLM');
    console.log('Error:', error);
    console.log('\n💡 Troubleshooting:');
    if (baseUrl.includes('11434')) {
      console.log('   • Check Ollama logs: tail -f ~/.ollama/logs/server.log');
      console.log('   • Test directly: ollama run llama3.2:3b "hello"');
    } else {
      console.log('   • Check Docker logs: docker logs llm-server');
    }
    console.log('');
    process.exit(1);
  }
}

testLocalLLM().catch(console.error);
