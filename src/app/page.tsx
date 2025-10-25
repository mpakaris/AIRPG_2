import { GameClient } from '@/components/game/GameClient';
import { getInitialState } from '@/lib/game-state';
import type { PlayerState, Message, Game, GameId } from '@/lib/game/types';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getGameData, createInitialMessages } from '@/app/actions';

const GAME_ID = 'blood-on-brass' as GameId;

async function getInitialData(userId: string | null, game: Game): Promise<{ playerState: PlayerState, messages: Message[] }> {
    const initialGameState = getInitialState(game);
    
    if (!userId) {
        return { 
            playerState: initialGameState, 
            messages: await createInitialMessages(initialGameState, game)
        };
    }

    const { firestore } = initializeFirebase();
    const gameId = game.id;

    const stateRef = doc(firestore, 'player_states', `${userId}_${gameId}`);
    const logRef = doc(firestore, 'logs', `${userId}_${gameId}`);

    const stateSnap = await getDoc(stateRef);
    const logSnap = await getDoc(logRef);

    let playerState: PlayerState;
    if (stateSnap.exists()) {
        playerState = stateSnap.data() as PlayerState;
    } else {
        playerState = initialGameState;
    }

    let messages: Message[] = [];
    if (logSnap.exists() && logSnap.data()?.messages?.length > 0) {
        messages = logSnap.data()?.messages || [];
    } else {
        messages = await createInitialMessages(playerState, game);
    }

    return { playerState, messages };
}


export default async function Home() {
  const game = await getGameData(GAME_ID);
  if (!game) {
      return <div>Error: Could not load game data. Please ensure the database is seeded correctly.</div>
  }

  const initialUserId = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
      ? process.env.NEXT_PUBLIC_DEV_USER_ID || null
      : null;

  const { playerState, messages } = await getInitialData(initialUserId, game);

  return <GameClient game={game} initialGameState={playerState} initialMessages={messages} />;
}
