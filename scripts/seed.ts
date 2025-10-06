
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

import { game as gameCartridge } from '../src/lib/game/cartridge';
import { getInitialState } from '../src/lib/game-state';

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
        credential: cert(parsedKey),
        projectId: gameCartridge.id,
    });
} catch (error) {
    if (error.code !== 'app/duplicate-app') {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        throw error;
    }
    console.log('Firebase Admin already initialized.');
}


const db = getFirestore();

const DEV_USER_ID = '0036308548589';

async function seedDatabase() {
    console.log('Starting database seed...');

    // 1. Seed Games Collection
    const gameRef = db.collection('games').doc(gameCartridge.id);
    console.log(`Seeding game: ${gameCartridge.id}`);
    await gameRef.set({ ...gameCartridge });
    console.log('Game seeded successfully.');

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


    console.log('Database seeding complete!');
}

seedDatabase().catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
});
