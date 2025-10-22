
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
    // The key might be a stringified JSON wrapped in single quotes.
    // This logic robustly parses it.
    let keyString = serviceAccountKey;
    if (keyString.startsWith("'") && keyString.endsWith("'")) {
        keyString = keyString.substring(1, keyString.length - 1);
    }
    const parsedKey = JSON.parse(keyString);
    
    if (getApps().length === 0) {
        initializeApp({
            credential: cert(parsedKey)
        });
    }
} catch (error) {
    // This can happen in some environments where initialization is automatic.
    if (error.code !== 'app/duplicate-app') {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        // It's helpful to log what the key looks like (without sensitive info)
        console.error("Key starts with:", serviceAccountKey.substring(0, 30));
        throw new Error(`Could not parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON string in your .env file.`);
    }
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
 * Seeds only the game cartridge to the 'games' collection and its subcollections.
 * This is safe to run to update game content without affecting users.
 */
async function seedGameCartridge() {
    console.log('Starting game cartridge seed...');
    
    // Seed main game document
    const gameId = gameCartridge.id;
    const gameDocData: Omit<Game, 'chapters' | 'locations' | 'gameObjects' | 'items' | 'npcs' | 'portals' | 'structures' | 'world'> = { ...gameCartridge };
    delete (gameDocData as any).chapters;
    delete (gameDocData as any).locations;
    delete (gameDocData as any).gameObjects;
    delete (gameDocData as any).items;
    delete (gameDocData as any).npcs;
    delete (gameDocData as any).portals;
    delete (gameDocData as any).structures;
    delete (gameDocData as any).world;

    const gameRef = db.collection('games').doc(gameId);
    await gameRef.set(gameDocData, { merge: true });
    console.log(`Game document ${gameId} seeded.`);

    // Seed sub-collections within the game document
    const seedSubCollection = async <T extends {id: string}>(subCollectionName: string, data: Record<string, T>) => {
        console.log(`Seeding sub-collection: games/${gameId}/${subCollectionName}...`);
        const batch = db.batch();
        for (const key in data) {
            const entity = data[key];
            const docRef = db.collection('games').doc(gameId).collection(subCollectionName).doc(entity.id);
            batch.set(docRef, { ...entity }, { merge: true });
        }
        await batch.commit();
        console.log(`Sub-collection ${subCollectionName} seeded with ${Object.keys(data).length} documents.`);
    };

    await seedSubCollection('chapters', gameCartridge.chapters as Record<string, Chapter>);
    await seedSubCollection('locations', gameCartridge.locations as Record<string, Location>);
    await seedSubCollection('game_objects', gameCartridge.gameObjects as Record<string, GameObject>);
    await seedSubCollection('items', gameCartridge.items as Record<string, Item>);
    await seedSubCollection('npcs', gameCartridge.npcs as Record<string, NPC>);
    await seedSubCollection('portals', gameCartridge.portals as Record<string, Portal>);
    
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
    console.log('Logs wiped successfully.');


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
