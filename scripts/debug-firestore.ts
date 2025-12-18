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
} catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
}

const db = getFirestore();

async function debugFirestore() {
    console.log('\n🔍 Checking Firestore for trash bag objects...\n');

    // Check game_objects for chapter-1-investigation
    const gameObjectsRef = db.collection('games').doc('chapter-1-investigation').collection('game_objects');
    const snapshot = await gameObjectsRef.get();

    console.log(`Found ${snapshot.size} game objects in chapter-1-investigation\n`);

    // Find all objects with "trash" or "bag" in name or alternateNames
    const trashBags: any[] = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.name?.toLowerCase() || '';
        const alternateNames = (data.alternateNames || []).map((n: string) => n.toLowerCase());

        if (name.includes('trash') || name.includes('bag') ||
            alternateNames.some((n: string) => n.includes('trash') || n.includes('bag'))) {
            trashBags.push({
                id: doc.id,
                name: data.name,
                alternateNames: data.alternateNames,
                parentId: data.parentId
            });
        }
    });

    if (trashBags.length === 0) {
        console.log('❌ No trash bag objects found!\n');
    } else {
        console.log(`📦 Found ${trashBags.length} trash/bag related objects:\n`);
        trashBags.forEach(obj => {
            console.log(`   ID: ${obj.id}`);
            console.log(`   Name: ${obj.name}`);
            console.log(`   Alternate Names: ${JSON.stringify(obj.alternateNames)}`);
            console.log(`   Parent: ${obj.parentId || 'none'}`);
            console.log('');
        });
    }

    // Also check player state
    const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';
    const stateRef = db.collection('player_states').doc(`${DEV_USER_ID}_chapter-1-investigation`);
    const stateSnap = await stateRef.get();

    if (stateSnap.exists()) {
        const state = stateSnap.data();
        console.log('\n📊 Player State:');
        console.log(`   Location: ${state?.currentLocationId}`);
        console.log(`   Focus: ${state?.currentFocusId}`);
        console.log(`   Visible entities: ${state?.world?.entities ? Object.keys(state.world.entities).filter((id: string) => state.world.entities[id].isVisible).length : 0}`);
    }
}

debugFirestore().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
