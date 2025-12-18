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
db.settings({ ignoreUndefinedProperties: true });

async function clearChapter1Objects() {
    console.log('\n🧹 Clearing all game_objects and items for chapter-1-investigation...\n');

    // Clear game_objects
    const gameObjectsRef = db.collection('games').doc('chapter-1-investigation').collection('game_objects');
    const objSnapshot = await gameObjectsRef.get();

    if (!objSnapshot.empty) {
        console.log(`Found ${objSnapshot.size} game objects to delete...`);
        const objBatch = db.batch();
        objSnapshot.docs.forEach(doc => {
            console.log(`   🗑️  Object: ${doc.id} (${doc.data().name || 'unnamed'})`);
            objBatch.delete(doc.ref);
        });
        await objBatch.commit();
        console.log(`✅ Deleted ${objSnapshot.size} game objects\n`);
    } else {
        console.log('No game objects found.\n');
    }

    // Clear items
    const itemsRef = db.collection('games').doc('chapter-1-investigation').collection('items');
    const itemSnapshot = await itemsRef.get();

    if (!itemSnapshot.empty) {
        console.log(`Found ${itemSnapshot.size} items to delete...`);
        const itemBatch = db.batch();
        itemSnapshot.docs.forEach(doc => {
            console.log(`   🗑️  Item: ${doc.id} (${doc.data().name || 'unnamed'})`);
            itemBatch.delete(doc.ref);
        });
        await itemBatch.commit();
        console.log(`✅ Deleted ${itemSnapshot.size} items\n`);
    } else {
        console.log('No items found.\n');
    }

    console.log('Now run: npm run db:bake && npm run db:seed\n');
}

clearChapter1Objects().catch(error => {
    console.error('Error clearing game objects:', error);
    process.exit(1);
});
