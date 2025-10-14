
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, LoaderCircle } from 'lucide-react';
import type { User, Game, GameId, PlayerState, Message } from '@/lib/game/types';
import { getPlayerState, getPlayerLogs } from './actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const PlayerDataDialog = ({ user, game }: { user: User; game: Game }) => {
  const [state, setState] = useState<PlayerState | null>(null);
  const [logs, setLogs] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = async () => {
    setIsLoading(true);
    const [stateData, logsData] = await Promise.all([
      getPlayerState(user.id, game.id),
      getPlayerLogs(user.id, game.id),
    ]);
    setState(stateData);
    setLogs(logsData);
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Player Data: {user.username} ({user.id})</DialogTitle>
          <DialogTitle>Game: {game.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoaderCircle className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh]">
            <Card>
              <CardHeader>
                <CardTitle>Current State</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[50vh]">
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Message Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[50vh]">
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
