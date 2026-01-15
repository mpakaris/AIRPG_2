#!/usr/bin/env tsx

/**
 * Hard Reset Player State
 *
 * Completely wipes player_states collection for the dev user.
 * Use this when testing cartridge changes that affect initial state.
 */

import { config } from 'dotenv';
config(); // Load .env file

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey && getApps().length === 0) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
}

try {
  if (getApps().length === 0) {
    const parsedKey = JSON.parse(serviceAccountKey!);
    initializeApp({
      credential: cert(parsedKey)
    });
  }
} catch (error: any) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function hardResetPlayer() {
  const userId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  const gameId = 'chapter-1-investigation';

  if (!userId) {
    console.error('❌ NEXT_PUBLIC_DEV_USER_ID not set');
    process.exit(1);
  }

  console.log(`\n🔥 HARD RESET for user ${userId} in game ${gameId}\n`);

  try {
    // Delete player_states document
    const playerStateId = `${userId}_${gameId}`;
    await db.collection('player_states').doc(playerStateId).delete();
    console.log(`✅ Deleted player_states/${playerStateId}`);

    // Delete logs collection
    const logsSnapshot = await db
      .collection('logs')
      .where('userId', '==', userId)
      .where('gameId', '==', gameId)
      .get();

    const batch = db.batch();
    logsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✅ Deleted ${logsSnapshot.size} log documents`);

    console.log('\n✅ Hard reset complete! Refresh your browser to start fresh.\n');
  } catch (error) {
    console.error('❌ Error during hard reset:', error);
    process.exit(1);
  }
}

hardResetPlayer();
