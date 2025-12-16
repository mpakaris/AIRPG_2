
import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

import type { Chapter, Game, GameObject, Item, Location, NPC, Portal } from '../src/lib/game/types';
import { getInitialState } from '../src/lib/game-state';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || '36308548589';

if (!serviceAccountKey && getApps().length === 0) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in the environment variables. Please add it to your .env file, wrapped in double quotes.");
}

try {
    if (getApps().length === 0) {
        // The key from dotenv should be a valid JSON string if quoted correctly in the .env file.
        const parsedKey = JSON.parse(serviceAccountKey!);
        initializeApp({
            credential: cert(parsedKey)
        });
    }
} catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    if (serviceAccountKey) {
        console.error("The provided key (starting with a few characters) was:", serviceAccountKey.substring(0, 30));
    }
    throw new Error(`Could not parse or use FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON string in your .env file and wrapped in double quotes.`);
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Function to load all baked cartridges
function loadAllCartridges(): Game[] {
    const bakedDir = path.resolve(__dirname, '../src/lib/game/cartridges/baked');
    if (!fs.existsSync(bakedDir)) {
        throw new Error(`Baked cartridges directory not found at ${bakedDir}. Please run 'npm run db:bake' first.`);
    }

    const files = fs.readdirSync(bakedDir);
    const cartridgeFiles = files.filter(file => file.endsWith('.json'));

    if (cartridgeFiles.length === 0) {
        throw new Error('No baked cartridges found. Please run \'npm run db:bake\' first.');
    }

    const cartridges: Game[] = [];
    for (const file of cartridgeFiles) {
        const filePath = path.join(bakedDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const cartridge = JSON.parse(fileContent);
        cartridges.push(cartridge);
        console.log(`Loaded cartridge: ${file} (${cartridge.id})`);
    }

    return cartridges;
}

const allCartridges = loadAllCartridges();

async function seedGameCartridge() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting game cartridge seed...`);
    console.log(`Found ${allCartridges.length} cartridge(s) to seed`);
    console.log(`${'='.repeat(60)}\n`);

    for (const gameCartridge of allCartridges) {
        console.log(`\n📦 Seeding: ${gameCartridge.title} (${gameCartridge.id})\n`);

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
        console.log(`   ✅ Game document ${gameId} seeded`);

        const seedSubCollection = async <T extends {id?: string; locationId?: string; portalId?: string}>(subCollectionName: string, data: Record<string, T> | undefined) => {
            if (!data) {
                console.log(`   ⏭️  Skipping empty sub-collection: ${subCollectionName}`);
                return;
            }
            const batch = db.batch();
            for (const key in data) {
                const entity = data[key];
                const docId = entity.id || entity.locationId || entity.portalId;
                if (!docId) {
                    console.warn(`   ⚠️  Skipping entity in ${subCollectionName} with key ${key} (no ID)`);
                    continue;
                }
                const docRef = db.collection('games').doc(gameId).collection(subCollectionName).doc(docId);
                batch.set(docRef, { ...entity }, { merge: true });
            }
            await batch.commit();
            console.log(`   ✅ ${subCollectionName}: ${Object.keys(data).length} documents`);
        };

        await seedSubCollection('chapters', gameCartridge.chapters as Record<string, Chapter>);
        await seedSubCollection('locations', gameCartridge.locations as Record<string, Location>);
        await seedSubCollection('game_objects', gameCartridge.gameObjects as Record<string, GameObject>);
        await seedSubCollection('items', gameCartridge.items as Record<string, Item>);
        await seedSubCollection('npcs', gameCartridge.npcs as Record<string, NPC>);
        await seedSubCollection('portals', gameCartridge.portals as Record<string, Portal>);

        console.log(`   ✅ ${gameCartridge.title} seeded successfully!`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`All game cartridges seeded successfully!`);
    console.log(`${'='.repeat(60)}\n`);
}

async function seedAll() {
    console.log('\n🌱 Starting full database seed...\n');
    await seedGameCartridge();

    // Seed user with all cartridge IDs
    const allGameIds = allCartridges.map(c => c.id);
    const userRef = db.collection('users').doc(DEV_USER_ID);
    console.log(`\n👤 Seeding user: ${DEV_USER_ID}`);
    await userRef.set({
        id: DEV_USER_ID,
        username: 'dev_user',
        purchasedGames: allGameIds,
    }, { merge: true });
    console.log('   ✅ User seeded successfully');

    // Seed player states and logs for each cartridge
    console.log(`\n📊 Seeding player states and logs...\n`);
    for (const gameCartridge of allCartridges) {
        console.log(`   ${gameCartridge.title} (${gameCartridge.id}):`);

        const initialPlayerState = getInitialState(gameCartridge);
        const playerStateRef = db.collection('player_states').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
        await playerStateRef.set(initialPlayerState);
        console.log(`      ✅ Player state seeded`);

        const logRef = db.collection('logs').doc(`${DEV_USER_ID}_${gameCartridge.id}`);
        await logRef.set({ messages: [] });
        console.log(`      ✅ Logs wiped`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Full database seeding complete!');
    console.log(`${'='.repeat(60)}\n`);
}

const args = process.argv.slice(2);
const seedType = args[0] || 'all'; // Default to 'all' if no argument is provided

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
    console.log(`Invalid seed type: '${seedType}'. Please use 'game' or 'all'.`);
    console.log("Example: `npm run db:seed game` or `npm run db:seed` (for all)");
    console.log("If you changed cartridge.ts, run `npm run db:bake` first (though this is now automatic).");
}
