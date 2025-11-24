#!/usr/bin/env tsx

/**
 * Test script for Hybrid C narrative expansion system
 *
 * Tests:
 * - System message expansion with keywords
 * - NPC dialogue expansion
 * - Cache functionality
 * - Fallback behavior when Ollama is unavailable
 *
 * Usage:
 *   npx tsx scripts/test-narrative-expansion.ts
 */

import { expandNarration, getNarrationCacheStats, clearNarrationCache } from '../src/ai/expand-narration';
import { expandNPCDialogue, getNPCDialogueCacheStats, clearNPCDialogueCache } from '../src/ai/expand-npc-dialogue';
import { checkLocalLLMHealth } from '../src/ai/local-llm-client';

async function main() {
  console.log('\n🎭 HYBRID C NARRATIVE EXPANSION TEST\n');
  console.log('=' .repeat(60));

  // Check Ollama health
  console.log('\n1️⃣  Checking Ollama availability...\n');
  const isHealthy = await checkLocalLLMHealth();

  if (isHealthy) {
    console.log('✅ Ollama is running and healthy');
  } else {
    console.log('⚠️  Ollama is not available - tests will use fallbacks');
  }

  // Test 1: System Message Expansion
  console.log('\n' + '='.repeat(60));
  console.log('\n2️⃣  Testing System Message Expansion\n');

  const testCases: Array<{
    keyword: string;
    context: Record<string, string>;
    description: string;
  }> = [
    {
      keyword: 'cant_use_item',
      context: { itemName: 'crowbar' },
      description: 'Can\'t use item (crowbar)'
    },
    {
      keyword: 'cant_smash_object',
      context: { objectName: 'metal box' },
      description: 'Can\'t smash object (metal box)'
    },
    {
      keyword: 'item_not_visible',
      context: { itemName: 'key' },
      description: 'Item not visible (key)'
    },
    {
      keyword: 'wrong_password',
      context: {},
      description: 'Wrong password entered'
    },
    {
      keyword: 'already_have_item',
      context: { itemName: 'badge' },
      description: 'Already have item (badge)'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Keyword: "${testCase.keyword}"`);
    console.log(`   Context: ${JSON.stringify(testCase.context)}`);

    try {
      const result = await expandNarration({
        keyword: testCase.keyword,
        context: testCase.context,
        useCache: false // Disable cache for testing variety
      });

      console.log(`   ✅ Result: "${result}"`);
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  // Test 2: Cache functionality
  console.log('\n' + '='.repeat(60));
  console.log('\n3️⃣  Testing Cache Functionality\n');

  await clearNarrationCache();
  console.log('🧹 Cache cleared');

  // First call (should generate)
  console.log('\n📝 First call (should generate and cache)...');
  const msg1 = await expandNarration({
    keyword: 'cant_use_item',
    context: { itemName: 'hammer' },
    useCache: true
  });
  console.log(`   Result: "${msg1}"`);

  let stats = await getNarrationCacheStats();
  console.log(`   Cache size: ${stats.size} entries`);

  // Second call (should use cache)
  console.log('\n📝 Second call (should use cached result)...');
  const msg2 = await expandNarration({
    keyword: 'cant_use_item',
    context: { itemName: 'hammer' },
    useCache: true
  });
  console.log(`   Result: "${msg2}"`);
  console.log(`   Match: ${msg1 === msg2 ? '✅ Same (cached)' : '❌ Different (not cached)'}`);

  // Third call without cache (should generate new)
  console.log('\n📝 Third call (cache disabled, should generate new)...');
  const msg3 = await expandNarration({
    keyword: 'cant_use_item',
    context: { itemName: 'hammer' },
    useCache: false
  });
  console.log(`   Result: "${msg3}"`);
  console.log(`   Match: ${msg1 === msg3 ? '⚠️  Same (might be coincidence)' : '✅ Different (generated new)'}`);

  // Test 3: NPC Dialogue Expansion
  console.log('\n' + '='.repeat(60));
  console.log('\n4️⃣  Testing NPC Dialogue Expansion\n');

  const npcTests: Array<{
    npcName: string;
    personality: string;
    keyword: string;
    context: Record<string, string>;
    description: string;
  }> = [
    {
      npcName: 'Frank the Bartender',
      personality: 'Gruff, world-weary, but secretly kind. Seen too much, cares too little.',
      keyword: 'greeting_late_night',
      context: { playerName: 'Detective' },
      description: 'Late night greeting from bartender'
    },
    {
      npcName: 'Sarah the Witness',
      personality: 'Nervous, scared, knows more than she says. Fidgets constantly.',
      keyword: 'refuse_answer',
      context: {},
      description: 'Refusing to answer questions'
    },
    {
      npcName: 'Tommy "The Rat" Johnson',
      personality: 'Sarcastic street informant. Sells information, trusts no one.',
      keyword: 'topic_murder',
      context: {},
      description: 'Discussing the murder'
    }
  ];

  for (const npcTest of npcTests) {
    console.log(`\n💬 NPC Test: ${npcTest.description}`);
    console.log(`   NPC: ${npcTest.npcName}`);
    console.log(`   Personality: ${npcTest.personality}`);
    console.log(`   Keyword: "${npcTest.keyword}"`);

    try {
      const result = await expandNPCDialogue({
        npcName: npcTest.npcName,
        npcPersonality: npcTest.personality,
        keyword: npcTest.keyword,
        context: npcTest.context,
        useCache: false
      });

      console.log(`   ✅ Dialogue: "${result.dialogue}"`);
      if (result.emotion) {
        console.log(`   😊 Emotion: ${result.emotion}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  // Test 4: Show variety (same keyword, different results)
  if (isHealthy) {
    console.log('\n' + '='.repeat(60));
    console.log('\n5️⃣  Testing Variety (Same Keyword, Multiple Generations)\n');

    console.log('📝 Generating 3 responses for "cant_open_object" with "safe"...\n');

    for (let i = 1; i <= 3; i++) {
      const result = await expandNarration({
        keyword: 'cant_open_object',
        context: { objectName: 'safe' },
        useCache: false
      });
      console.log(`   ${i}. "${result}"`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');

  const narrationStats = await getNarrationCacheStats();
  const npcStats = await getNPCDialogueCacheStats();

  console.log(`✅ Narration cache: ${narrationStats.size} entries`);
  console.log(`✅ NPC dialogue cache: ${npcStats.size} entries`);
  console.log(`\n🎉 Tests complete!\n`);

  // Cleanup
  await clearNarrationCache();
  await clearNPCDialogueCache();
}

main().catch(console.error);
