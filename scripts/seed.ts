
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

import { game as gameCartridge } from '../src/lib/game/cartridge';
import { getInitialState } from '../src/lib/game-state';
import { Chapter, Game, GameObject, Item, Location, NPC, Portal, Structure } from '../src/lib/game/types';

// IMPORTANT: Replace with your actual service account key content
// You can get this from your Firebase project settings -> Service accounts -> Generate new private key
// For security, it's best to load this from an environment variable
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in the environment variables. Please add it to your .env file.");
}

try {
    // The key might be wrapped in single quotes, so we parse it carefully
    const parsedKey = JSON.parse(serviceAccountKey.startsWith("'") ? serviceAccountKey.slice(1, -1) : serviceAccountKey);
    initializeApp({
        credential: cert(parsedKey)
    });
} catch (error) {
    if (error.code !== 'app/duplicate-app') {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        throw error;
    }
    console.log('Firebase Admin already initialized.');
}


const db = getFirestore();

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';

async function seedCollection<T extends {id: string}>(collectionName: string, data: Record<string, T>) {
    console.log(`Seeding collection: ${collectionName}...`);
    const collectionRef = db.collection(collectionName);
    const batch = db.batch();

    for (const key in data) {
        const entity = data[key];
        const docRef = collectionRef.doc(entity.id);
        batch.set(docRef, { ...entity }, { merge: true });
    }

    await batch.commit();
    console.log(`Collection ${collectionName} seeded with ${Object.keys(data).length} documents.`);
}

/**
 * Seeds only the game cartridge to the 'games' collection.
 * This is safe to run to update game content without affecting users.
 */
async function seedGameCartridge() {
    console.log('Starting game cartridge seed...');
    
    // Seed main game document
    const gameDoc: Omit<Game, 'chapters' | 'locations' | 'gameObjects' | 'items' | 'npcs' | 'portals' | 'structures' | 'world'> = { ...gameCartridge };
    const gameRef = db.collection('games').doc(gameCartridge.id);
    await gameRef.set(gameDoc, { merge: true });
    console.log(`Game document ${gameCartridge.id} seeded.`);

    // Seed sub-collections
    await seedCollection('chapters', gameCartridge.chapters as Record<string, Chapter>);
    await seedCollection('locations', gameCartridge.locations as Record<string, Location>);
    await seedCollection('game_objects', gameCartridge.gameObjects as Record<string, GameObject>);
    await seedCollection('items', gameCartridge.items as Record<string, Item>);
    await seedCollection('npcs', gameCartridge.npcs as Record<string, NPC>);
    await seedCollection('portals', gameCartridge.portals as Record<string, Portal>);
    await seedCollection('structures', gameCartridge.structures as Record<string, Structure>);
    // World is a bit different as it contains cells, not a simple record
    const worldRef = db.collection('worlds').doc(gameCartridge.world.worldId);
    await worldRef.set(gameCartridge.world, { merge: true });
    console.log('World data seeded.');

    console.log('Game cartridge seeded successfully.');
}

/**
 * Seeds the entire database including a dev user, their state, and logs.
 * WARNING: This will overwrite existing dev user data.
 */
async function seedAll() {
    console.log('Starting full database seed...');

    // 1. Seed Games Collection and all related sub-collections
    await seedGameCartridge();

    // 2. Seed Users Collection
    const userRef = db.collection('users').doc(DEV_USER_ID);
    console.log(`Seeding user: ${DEV_USER_ID}`);
    await userRef.set({
        id: DEV_USER_ID,
        username: 'dev_user',
        purchasedGames: [gameCartridge.id],
    }, { merge: true });
    console.log('User seeded successfully.');

    // 3. Seed Player States Collection
    const initialPlayerState = getInitialState(gameCartridge);
    const playerStateRef = db.collection('player_states').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
    console.log(`Seeding player state for user ${DEV_USER_ID} and game ${gameCartridge.id}`);
    await playerStateRef.set(initialPlayerState);
    console.log('Player state seeded successfully.');

    // 4. Wipe and Seed Logs Collection
    const logRef = db.collection('logs').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
    console.log(`Wiping logs for user ${DEV_USER_ID} and game ${gameCartridge.id}`);
    await logRef.set({ messages: [] });
    consolelog('Logs wiped successfully.');


    console.log('Full database seeding complete!');
}

// Check for command line arguments to decide which function to run
const args = process.argv.slice(2);
const seedType = args[0];

if (seedType === 'game') {
    seedGameCartridge().catch((error) => {
        console.error('Error seeding game cartridge:', error);
        process.exit(1);
    });
} else if (seedType === 'all') {
    seedAll().catch((error) => {
        console.error('Error seeding all data:', error);
        process.exit(1);
    });
} else {
    console.log("No seed type specified. Please run with 'game' or 'all'.");
    console.log("Example: `npm run db:seed game` or `npm run db:seed all`");
}
