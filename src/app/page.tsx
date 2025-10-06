
import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const DEV_USER_ID = '0036308548589';

async function getInitialData(): Promise<{ playerState: PlayerState, messages: Message[] }> {
    const { firestore } = initializeFirebase();
    const gameId = gameCartridge.id;

    const stateRef = doc(firestore, 'player_states', `${DEV_USER_ID}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${DEV_USER_ID}_${gameId}`);

    const stateSnap = await getDoc(stateRef);
    const logSnap = await getDoc(logRef);

    let playerState: PlayerState;
    if (stateSnap.exists()) {
        playerState = stateSnap.data() as PlayerState;
    } else {
        playerState = getInitialState(gameCartridge);
    }

    let messages: Message[] = [];
    if (logSnap.exists()) {
        messages = logSnap.data()?.messages || [];
    }

    return { playerState, messages };
}


export default async function Home() {
  const { playerState, messages } = await getInitialData();

  return <GameClient game={gameCartridge} initialGameState={playerState} initialMessages={messages} />;
}
