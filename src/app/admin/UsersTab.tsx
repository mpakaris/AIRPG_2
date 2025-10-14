
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import type { User, Game, PlayerState, Message } from '@/lib/game/types';
import { getPlayerState, getPlayerLogs } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
            totalTokens += log.usage.totalTokens || 0;
        }
    });

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

const PlayerDetails = ({ user, game }: { user: User, game: Game | undefined }) => {
    const [state, setState] = useState<PlayerState | null>(null);
    const [logs, setLogs] = useState<Message[]>([]);
    const [stats, setStats] = useState<GameStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user || !game) return;
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
        }
        fetchData();
    }, [user, game]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoaderCircle className="animate-spin h-8 w-8" />
            </div>
        );
    }
    
    if (!game) {
        return <p>Game data not found for this user.</p>
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <div className="lg:col-span-2 grid grid-rows-6 gap-4">
                <Card className="row-span-1">
                    <CardHeader>
                        <CardTitle>Game Stats: {game.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><p className="font-bold">Total Msgs</p><p>{stats.totalMessages}</p></div>
                                <div><p className="font-bold">Total Tokens</p><p>{stats.totalTokens.toLocaleString()}</p></div>
                                <div><p className="font-bold">I/O Tokens</p><p>{stats.totalInputTokens.toLocaleString()} / {stats.totalOutputTokens.toLocaleString()}</p></div>
                                <div><p className="font-bold">Est. Cost</p><p>${stats.estimatedCost.toFixed(6)}</p></div>
                            </div>
                        ) : <p>No stats available.</p>}
                    </CardContent>
                </Card>
                <Card className="row-span-5">
                    <CardHeader><CardTitle>Current State</CardTitle></CardHeader>
                    <CardContent><ScrollArea className="h-[calc(80vh-14rem)]"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre></ScrollArea></CardContent>
                </Card>
            </div>
            <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Message Logs</CardTitle></CardHeader>
                <CardContent><ScrollArea className="h-[calc(80vh-6rem)]">
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="text-xs border-b pb-1">
                                <p><span className="font-bold">{log.senderName}</span> ({log.sender}):</p>
                                <p className="whitespace-pre-wrap">{log.content}</p>
                                {log.usage && (<p className="text-muted-foreground text-right">Tokens: {log.usage.totalTokens}</p>)}
                            </div>
                        ))}
                    </div>
                </ScrollArea></CardContent>
            </Card>
        </div>
    );
};

export function UsersTab({ users, games, isLoading }: { users: User[], games: Game[], isLoading: boolean }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const selectedUserGame = useMemo(() => {
        if (!selectedUser || selectedUser.purchasedGames.length === 0) return undefined;
        return games.find(g => g.id === selectedUser.purchasedGames[0]);
    }, [selectedUser, games]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>A list of all players. Select a user to see their game data.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col gap-4">
                    <Input
                        placeholder="Search by phone number or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><LoaderCircle className="animate-spin h-8 w-8" /></div>
                    ) : (
                        <Card>
                          <ScrollArea className="h-[70vh]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow 
                                            key={user.id} 
                                            onClick={() => setSelectedUser(user)}
                                            className={cn(
                                                "cursor-pointer",
                                                selectedUser?.id === user.id && "bg-muted/80"
                                            )}
                                        >
                                            <TableCell>
                                                <div className="font-medium">{user.username}</div>
                                                <div className="text-xs text-muted-foreground">{user.id}</div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </ScrollArea>
                        </Card>
                    )}
                </div>
                <div className="md:col-span-2">
                    {selectedUser ? (
                        <PlayerDetails user={selectedUser} game={selectedUserGame} />
                    ) : (
                        <div className="flex items-center justify-center h-full rounded-lg border border-dashed text-muted-foreground">
                            <p>Select a user from the list to view their data.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
