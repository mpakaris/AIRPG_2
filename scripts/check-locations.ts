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

async function checkLocations() {
    const gameId = 'chapter-1-investigation';
    console.log(`\nChecking locations for game: ${gameId}\n`);

    const locationsSnap = await db.collection('games').doc(gameId).collection('locations').get();

    console.log(`Total locations in Firestore: ${locationsSnap.size}`);
    console.log('\nAll locations:');

    locationsSnap.forEach(doc => {
        const loc = doc.data();
        console.log(`  ${doc.id}: ${loc.name}`);
    });

    console.log('\nOld location IDs (should not exist):');
    const oldIds = ['loc_florist_shop', 'loc_butcher_shop', 'loc_cctv_building', 'loc_construction_site'];
    for (const id of oldIds) {
        const docSnap = await db.collection('games').doc(gameId).collection('locations').doc(id).get();
        if (docSnap.exists()) {
            console.log(`  ❌ FOUND: ${id}`);
        } else {
            console.log(`  ✅ NOT FOUND: ${id}`);
        }
    }
}

checkLocations().catch(console.error);
