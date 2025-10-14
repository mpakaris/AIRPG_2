
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { User, PlayerState, Message, Game, GameId } from '@/lib/game/types';
import { game as gameCartridge } from '@/lib/game/cartridge';

// Since we only have one game cartridge for now, we'll return it directly.
// In the future, this could fetch from a 'games' collection.
export async function getGames(): Promise<Game[]> {
    return [gameCartridge];
}

export async function getUsers(): Promise<User[]> {
    const { firestore } = initializeFirebase();
    const usersCol = collection(firestore, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => doc.data() as User);
    return userList;
}

export async function getPlayerState(userId: string, gameId: GameId): Promise<PlayerState | null> {
    const { firestore } = initializeFirebase();
    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const stateSnap = await getDoc(stateRef);
    if (stateSnap.exists()) {
        return stateSnap.data() as PlayerState;
    }
    return null;
}

export async function getPlayerLogs(userId: string, gameId: GameId): Promise<Message[]> {
    const { firestore } = initializeFirebase();
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);
    const logSnap = await getDoc(logRef);
    if (logSnap.exists()) {
        return logSnap.data()?.messages || [];
    }
    return [];
}
