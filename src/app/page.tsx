
import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { PlayerState, Message } from '@/lib/game/types';

// Hardcoded for dev environment
const DEV_USER_ID = "0036308548589";

async function getInitialData() {
    const initialGameState = getInitialState(gameCartridge);
    
    try {
        const { firestore } = initializeFirebase();
        const stateRef = doc(firestore, 'player_states', `${DEV_USER_ID}_${gameCartridge.id}`);
        const logRef = doc(firestore, 'logs', `${DEV_USER_ID}_${gameCartridge.id}`);

        const [stateSnap, logSnap] = await Promise.all([getDoc(stateRef), getDoc(logRef)]);

        let playerState: PlayerState;
        let messages: Message[] = [];

        if (stateSnap.exists()) {
            playerState = stateSnap.data() as PlayerState;
        } else {
            console.log('No existing player state found, using initial state.');
            playerState = initialGameState;
        }

        if (logSnap.exists()) {
            messages = logSnap.data().messages || [];
        }

        return { playerState, messages };

    } catch (error) {
        console.error("Failed to fetch initial data from Firestore, falling back to local initial state:", error);
        return { playerState: initialGameState, messages: [] };
    }
}


export default async function Home() {
  const { playerState, messages } = await getInitialData();

  return <GameClient game={gameCartridge} initialGameState={playerState} initialMessages={messages} />;
}
