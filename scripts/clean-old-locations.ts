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

async function cleanOldLocations() {
    const gameId = 'chapter-1-investigation';
    console.log(`\nCleaning old locations for game: ${gameId}\n`);

    const locationsToDelete = [
        'loc_florist_shop',
        'loc_butcher_shop',
        'loc_cctv_building',
        'loc_construction_site'
    ];

    const batch = db.batch();
    let count = 0;

    for (const locationId of locationsToDelete) {
        const docRef = db.collection('games').doc(gameId).collection('locations').doc(locationId);
        batch.delete(docRef);
        count++;
        console.log(`  Marking for deletion: ${locationId}`);
    }

    await batch.commit();
    console.log(`\n✅ Deleted ${count} old location documents\n`);
}

cleanOldLocations().catch(console.error);
