
import { Dashboard } from '../Dashboard';
import type { GameId } from '@/lib/game/types';

export default function WriterDashboardPage({ params }: { params: { gameId: string } }) {
  // We can eventually add more logic here for auth or validation
  const gameId = params.gameId as GameId;

  return <Dashboard gameId={gameId} />;
}
