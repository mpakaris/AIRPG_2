import { config } from 'dotenv';
config();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';

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

async function checkPlayerState() {
    console.log('\n🔍 Checking player state for trash bag entities...\n');

    const stateRef = db.collection('player_states').doc(`${DEV_USER_ID}_chapter-1-investigation`);
    const stateDoc = await stateRef.get();

    if (!stateDoc.exists) {
        console.log('❌ Player state not found!');
        return;
    }

    const state = stateDoc.data();
    if (!state) {
        console.log('❌ Player state is empty!');
        return;
    }

    console.log('📊 Player State Info:');
    console.log(`   Location: ${state.currentLocationId}`);
    console.log(`   Focus: ${state.currentFocusId || 'none'}`);
    console.log('');

    if (state.world?.entities) {
        const trashBagEntities = Object.entries(state.world.entities)
            .filter(([id, entity]: [string, any]) => {
                const name = entity.name?.toLowerCase() || '';
                return name.includes('trash') || name.includes('bag');
            });

        if (trashBagEntities.length > 0) {
            console.log(`📦 Found ${trashBagEntities.length} trash/bag entities in world state:\n`);
            trashBagEntities.forEach(([id, entity]: [string, any]) => {
                console.log(`   ID: ${id}`);
                console.log(`   Name: ${entity.name}`);
                console.log(`   Visible: ${entity.isVisible}`);
                console.log(`   Parent: ${entity.parentId || 'none'}`);
                console.log('');
            });
        } else {
            console.log('✅ No trash/bag entities found in world state');
        }
    } else {
        console.log('⚠️  No world.entities in player state');
    }

    // Check visible entities
    if (state.world?.entities) {
        const visibleEntities = Object.entries(state.world.entities)
            .filter(([id, entity]: [string, any]) => entity.isVisible);
        console.log(`\n👁️  Total visible entities: ${visibleEntities.length}`);
    }
}

checkPlayerState().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
