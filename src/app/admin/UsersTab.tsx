
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, LoaderCircle } from 'lucide-react';
import type { User, Game, PlayerState, Message } from '@/lib/game/types';
import { getPlayerState, getPlayerLogs } from './actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GameStats {
    totalMessages: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    estimatedCost: number;
}

const PRICING = {
    input: 0.30 / 1_000_000,  // $0.30 per 1M tokens
    output: 2.50 / 1_000_000, // $2.50 per 1M tokens
};

function calculateStats(logs: Message[]): GameStats {
    let totalMessages = logs.length;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    logs.forEach(log => {
        if (log.usage) {
            totalInputTokens += log.usage.inputTokens || 0;
            totalOutputTokens += log.usage.outputTokens || 0;
            // The AI flow currently puts the Gemini total into our totalTokens field
            totalTokens += log.usage.totalTokens || 0;
        }
    });

    // The cost calculation uses input for input cost, and the overall total for output/processing cost.
    const inputCost = totalInputTokens * PRICING.input;
    const outputCost = totalTokens * PRICING.output;
    const estimatedCost = inputCost + outputCost;

    return {
        totalMessages,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        estimatedCost,
    };
}


const PlayerDataDialog = ({ user, game }: { user: User; game: Game }) => {
  const [state, setState] = useState<PlayerState | null>(null);
  const [logs, setLogs] = useState<Message[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = async () => {
    setIsLoading(true);
    const [stateData, logsData] = await Promise.all([
      getPlayerState(user.id, game.id),
      getPlayerLogs(user.id, game.id),
    ]);
    setState(stateData);
    setLogs(logsData);
    if (logsData) {
        setStats(calculateStats(logsData));
    }
    setIsLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Eye className="mr-2 h-4 w-4" />
          View Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Player Data: {user.username} ({user.id}) for {game.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoaderCircle className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh]">
            <div className="md:col-span-2 grid grid-rows-6 gap-4">
              <Card className="row-span-1">
                 <CardHeader>
                    <CardTitle>Game Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="font-bold">Total Msgs</p>
                                <p>{stats.totalMessages}</p>
                            </div>
                            <div>
                                <p className="font-bold">Total Tokens</p>
                                <p>{stats.totalTokens.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="font-bold">I/O Tokens</p>
                                <p>{stats.totalInputTokens.toLocaleString()} / {stats.totalOutputTokens.toLocaleString()}</p>
                            </div>
                             <div>
                                <p className="font-bold">Est. Cost</p>
                                <p>${stats.estimatedCost.toFixed(6)}</p>
                            </div>
                        </div>
                    ) : <p>No stats available.</p>}
                </CardContent>
              </Card>
              <Card className="row-span-5">
                <CardHeader>
                    <CardTitle>Current State</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(70vh-12rem)]">
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre>
                    </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Message Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(70vh-4rem)]">
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="text-xs border-b pb-1">
                                <p><span className="font-bold">{log.senderName}</span> ({log.sender}):</p>
                                <p className="whitespace-pre-wrap">{log.content}</p>
                                {log.usage && (
                                    <p className="text-muted-foreground text-right">Tokens: {log.usage.totalTokens}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};


export function UsersTab({ users, games, isLoading }: { users: User[], games: Game[], isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>A list of all players who have registered.</CardDescription>
        <div className="pt-4">
          <Input
            placeholder="Search by phone number or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <LoaderCircle className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID (Phone)</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {user.purchasedGames.map(gameId => {
                        const game = games.find(g => g.id === gameId);
                        return game ? <PlayerDataDialog key={game.id} user={user} game={game} /> : null;
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
