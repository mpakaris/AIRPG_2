
'use server';

import type { Game, Chapter, Location, GameObject, Item, NPC, Portal } from '@/lib/game/types';
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

        // Helper function to fetch all documents from a sub-collection
        const fetchSubCollection = async (subCollectionName: string) => {
            const snap = await getDocs(collection(firestore, `games/${gameId}/${subCollectionName}`));
            // Use the document ID as the key in the resulting object
            return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
        };

        // Fetch all sub-collections in parallel
        const [
            chaptersData,
            locationsData,
            gameObjectsData,
            itemsData,
            npcsData,
            portalsData
        ] = await Promise.all([
            fetchSubCollection('chapters'),
            fetchSubCollection('locations'),
            fetchSubCollection('game_objects'),
            fetchSubCollection('items'),
            fetchSubCollection('npcs'),
            fetchSubCollection('portals')
        ]);

        gameData.chapters = chaptersData as Record<string, Chapter>;
        gameData.locations = locationsData as Record<string, Location>;
        gameData.gameObjects = gameObjectsData as Record<string, GameObject>;
        gameData.items = itemsData as Record<string, Item>;
        gameData.npcs = npcsData as Record<string, NPC>;
        gameData.portals = portalsData as Record<string, Portal>;

        return gameData;

    } catch(error) {
        console.error("Error fetching game data from Firestore:", error);
        return null;
    }
}
