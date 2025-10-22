
'use server';

import { game as gameCartridge } from '@/lib/game/cartridge';
import type { Game, Chapter, Location, GameObject, Item, NPC } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

/**
 * Loads the entire game structure from Firestore.
 */
export async function getGameData(gameId: string = 'blood-on-brass'): Promise<Game | null> {
    const { firestore } = initializeFirebase();
    
    try {
        const gameRef = doc(firestore, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
            console.error(`Game with ID ${gameId} not found in Firestore.`);
            return null;
        }

        const gameData = gameSnap.data() as Game;

        // Fetch all sub-collections
        const chaptersSnap = await getDocs(collection(firestore, `games/${gameId}/chapters`));
        const locationsSnap = await getDocs(collection(firestore, `games/${gameId}/locations`));
        const gameObjectsSnap = await getDocs(collection(firestore, `games/${gameId}/game_objects`));
        const itemsSnap = await getDocs(collection(firestore, `games/${gameId}/items`));
        const npcsSnap = await getDocs(collection(firestore, `games/${gameId}/npcs`));
        const portalsSnap = await getDocs(collection(firestore, `games/${gameId}/portals`));

        gameData.chapters = Object.fromEntries(chaptersSnap.docs.map(d => [d.id, d.data() as Chapter]));
        gameData.locations = Object.fromEntries(locationsSnap.docs.map(d => [d.id, d.data() as Location]));
        gameData.gameObjects = Object.fromEntries(gameObjectsSnap.docs.map(d => [d.id, d.data() as GameObject]));
        gameData.items = Object.fromEntries(itemsSnap.docs.map(d => [d.id, d.data() as Item]));
        gameData.npcs = Object.fromEntries(npcsSnap.docs.map(d => [d.id, d.data() as NPC]));
        gameData.portals = Object.fromEntries(portalsSnap.docs.map(d => [d.id, d.data() as any]));

        return gameData;

    } catch(error) {
        console.error("Error fetching game data from Firestore:", error);
        return null;
    }
}
