#!/usr/bin/env tsx

/**
 * Delete construction site items from Firestore to force re-seed
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
db.settings({ ignoreUndefinedProperties: true });

async function deleteConstructionItems() {
  const gameId = 'chapter-1-investigation';

  console.log(`\n🔥 Deleting construction site items from Firestore...\n`);

  const itemsToDelete = [
    'item_hard_hat',
    'item_pliers',
    'item_spring',
    'item_safety_vest',
    'item_bus_ticket',
    'item_quarter',
    'item_soda_can',
    'item_food_wrapper'
  ];

  try {
    const batch = db.batch();

    for (const itemId of itemsToDelete) {
      const itemRef = db.collection('games').doc(gameId).collection('items').doc(itemId);
      batch.delete(itemRef);
    }

    await batch.commit();
    console.log(`✅ Deleted ${itemsToDelete.length} items from Firestore`);
    console.log(`\n✅ Now run: npm run db:seed:game\n`);

  } catch (error) {
    console.error('❌ Error deleting items:', error);
    process.exit(1);
  }
}

deleteConstructionItems();
