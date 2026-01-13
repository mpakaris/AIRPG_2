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

async function cleanOldPortals() {
    const gameId = 'chapter-1-investigation';
    console.log(`\nCleaning old portals for game: ${gameId}\n`);

    const portalsToDelete = [
        'portal_elm_to_florist',
        'portal_florist_to_elm',
        'portal_elm_to_butcher',
        'portal_butcher_to_elm',
        'portal_elm_to_cctv',
        'portal_cctv_to_elm',
        'portal_elm_to_construction',
        'portal_construction_to_elm'
    ];

    const batch = db.batch();
    let count = 0;

    for (const portalId of portalsToDelete) {
        const docRef = db.collection('games').doc(gameId).collection('portals').doc(portalId);
        batch.delete(docRef);
        count++;
        console.log(`  Marking for deletion: ${portalId}`);
    }

    await batch.commit();
    console.log(`\n✅ Deleted ${count} old portal documents\n`);
}

cleanOldPortals().catch(console.error);
