import { GameClient } from '@/components/game/GameClient';
import { game as gameCartridge } from '@/lib/game/cartridge';
import { getInitialState } from '@/lib/game-state';

export default function Home() {
  const initialGameState = getInitialState(gameCartridge);

  return <GameClient game={gameCartridge} initialGameState={initialGameState} />;
}
