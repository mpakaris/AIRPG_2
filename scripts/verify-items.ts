#!/usr/bin/env tsx

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

async function verifyItems() {
  const gameId = 'chapter-1-investigation';

  const itemIds = ['item_hard_hat', 'item_pliers', 'item_spring'];

  console.log(`\n🔍 Checking items in Firestore...\n`);

  for (const itemId of itemIds) {
    const itemRef = db.collection('games').doc(gameId).collection('items').doc(itemId);
    const itemSnap = await itemRef.get();

    if (itemSnap.exists) {
      const data = itemSnap.data();
      console.log(`\n📦 ${itemId}:`);
      console.log(`   zone: ${data?.zone || 'UNDEFINED'}`);
      console.log(`   parentId: ${data?.parentId || 'UNDEFINED'}`);
    } else {
      console.log(`\n❌ ${itemId}: NOT FOUND`);
    }
  }

  console.log('\n');
}

verifyItems();
