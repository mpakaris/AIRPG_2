#!/usr/bin/env tsx

/**
 * Test script to verify 3-state container logic:
 * - isOpen/isClosed → Controls VISIBILITY
 * - isLocked/isUnlocked → Controls TAKEABILITY
 * - isBroken → BYPASSES all locks
 */

import { config } from 'dotenv';
config();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey && getApps().length === 0) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
}

try {
  if (getApps().length === 0) {
    const parsedKey = JSON.parse(serviceAccountKey!);
    initializeApp({ credential: cert(parsedKey) });
  }
} catch (error: any) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

const db = getFirestore();

async function testContainerStates() {
  const gameId = 'chapter-1-investigation';
  const containerId = 'obj_scaffolding_zip_ties';
  const itemId = 'item_hard_hat';

  console.log(`\n📦 Testing Container 3-State Logic\n`);
  console.log(`Container: ${containerId}`);
  console.log(`Item: ${itemId}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get container state
  const containerRef = db.collection('games').doc(gameId).collection('game_objects').doc(containerId);
  const containerSnap = await containerRef.get();

  if (!containerSnap.exists) {
    console.log(`❌ Container not found in Firestore`);
    return;
  }

  const containerData = containerSnap.data();
  console.log(`Container State:`);
  console.log(`  isLocked: ${containerData?.state?.isLocked}`);
  console.log(`  isOpen: ${containerData?.state?.isOpen}`);
  console.log(`  isBroken: ${containerData?.state?.isBroken}`);
  console.log(`\nContainer Capabilities:`);
  console.log(`  lockable: ${containerData?.capabilities?.lockable}`);
  console.log(`  openable: ${containerData?.capabilities?.openable}`);
  console.log(`  breakable: ${containerData?.capabilities?.breakable}`);

  // Get item state
  const itemRef = db.collection('games').doc(gameId).collection('items').doc(itemId);
  const itemSnap = await itemRef.get();

  if (!itemSnap.exists) {
    console.log(`\n❌ Item not found in Firestore`);
    return;
  }

  const itemData = itemSnap.data();
  console.log(`\nItem State:`);
  console.log(`  parentId: ${itemData?.parentId}`);
  console.log(`  zone: ${itemData?.zone || 'UNDEFINED'}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Expected Behavior:`);
  console.log(`${'='.repeat(60)}\n`);

  const isLocked = containerData?.state?.isLocked;
  const isOpen = containerData?.state?.isOpen;
  const isBroken = containerData?.state?.isBroken;

  if (isBroken) {
    console.log(`✅ Container is BROKEN → Item should be TAKEABLE (bypass all locks)`);
  } else if (isLocked) {
    console.log(`❌ Container is LOCKED (even if opened) → Item should be BLOCKED`);
    console.log(`   Hard hat is VISIBLE but NOT takeable until zip-ties are cut`);
  } else if (!isOpen) {
    console.log(`❌ Container is CLOSED → Item should be BLOCKED (not visible)`);
  } else {
    console.log(`✅ Container is UNLOCKED + OPENED → Item should be TAKEABLE`);
  }

  console.log('\n');
}

testContainerStates();
