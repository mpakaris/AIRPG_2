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
        initializeApp({
            credential: cert(parsedKey)
        });
    }
} catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
}

const db = getFirestore();

async function checkPortals() {
    const gameId = 'chapter-1-investigation';
    console.log(`\nChecking portals for game: ${gameId}\n`);

    const portalsSnap = await db.collection('games').doc(gameId).collection('portals').get();

    console.log(`Total portals in Firestore: ${portalsSnap.size}`);

    // Group by fromLocationId
    const byFromLocation: Record<string, any[]> = {};

    portalsSnap.forEach(doc => {
        const portal = doc.data();
        const from = portal.fromLocationId || 'unknown';
        if (!byFromLocation[from]) {
            byFromLocation[from] = [];
        }
        byFromLocation[from].push({
            id: doc.id,
            to: portal.toLocationId,
            isRevealed: portal.isRevealed
        });
    });

    console.log('\nPortals from Elm Street:');
    if (byFromLocation['loc_elm_street']) {
        byFromLocation['loc_elm_street'].forEach(p => {
            console.log(`  ${p.id} -> ${p.to} (isRevealed: ${p.isRevealed ?? 'undefined'})`);
        });
    }

    console.log('\nPortals to florist (all sources):');
    portalsSnap.forEach(doc => {
        const portal = doc.data();
        if (portal.toLocationId?.includes('florist')) {
            console.log(`  ${doc.id}: ${portal.fromLocationId} -> ${portal.toLocationId} (isRevealed: ${portal.isRevealed ?? 'undefined'})`);
        }
    });
}

checkPortals().catch(console.error);
