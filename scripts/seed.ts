
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
config();

import type { Chapter, Game, GameObject, Item, Location, NPC, Portal } from '../src/lib/game/types';
import { getInitialState } from '../src/lib/game-state';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey && getApps().length === 0) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in the environment variables. Please add it to your .env file.");
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
    if (serviceAccountKey) {
        console.error("Key starts with:", serviceAccountKey.substring(0, 30));
    }
    throw new Error(`Could not parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON string in your .env file.`);
}

const db = getFirestore();
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';

// Function to read the baked JSON cartridge
function loadCartridgeFromFile(): Game {
    const filePath = path.resolve(__dirname, '../src/lib/game/cartridge.json');
    if (!fs.existsSync(filePath)) {
        throw new Error(`cartridge.json not found at ${filePath}. Please run 'npm run db:bake' first.`);
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
}

const gameCartridge = loadCartridgeFromFile();

async function seedGameCartridge() {
    console.log('Starting game cartridge seed from cartridge.json...');
    
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

    const seedSubCollection = async <T extends {id: string}>(subCollectionName: string, data: Record<string, T> | undefined) => {
        if (!data) {
            console.log(`Skipping empty sub-collection: ${subCollectionName}`);
            return;
        }
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

async function seedAll() {
    console.log('Starting full database seed...');
    await seedGameCartridge();

    const userRef = db.collection('users').doc(DEV_USER_ID);
    console.log(`Seeding user: ${DEV_USER_ID}`);
    await userRef.set({
        id: DEV_USER_ID,
        username: 'dev_user',
        purchasedGames: [gameCartridge.id],
    }, { merge: true });
    console.log('User seeded successfully.');

    const initialPlayerState = getInitialState(gameCartridge);
    const playerStateRef = db.collection('player_states').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
    console.log(`Seeding player state for user ${DEV_USER_ID} and game ${gameCartridge.id}`);
    await playerStateRef.set(initialPlayerState);
    console.log('Player state seeded successfully.');

    const logRef = db.collection('logs').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
    console.log(`Wiping logs for user ${DEV_USER_ID} and game ${gameCartridge.id}`);
    await logRef.set({ messages: [] });
    console.log('Logs wiped successfully.');

    console.log('Full database seeding complete!');
}

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
    console.log("If you changed cartridge.ts, run `npm run db:bake` first.");
}
