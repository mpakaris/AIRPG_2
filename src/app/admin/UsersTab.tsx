
'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoaderCircle, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type { User, Game, PlayerState, Message, Story, ChapterId, TokenUsage, GameId } from '@/lib/game/types';
import { getPlayerState, getPlayerLogs, deleteUser } from './actions';
import { generateStoryForChapter } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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

function calculateCostForUsage(usage: TokenUsage): number {
    if (!usage) return 0;
    const inputCost = (usage.inputTokens || 0) * PRICING.input;
    // The output price is based on the total tokens (including "thinking tokens")
    const outputCost = (usage.totalTokens || 0) * PRICING.output;
    return inputCost + outputCost;
}

function calculateStats(logs: Message[], stories: Record<ChapterId, Story>): GameStats {
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

    Object.values(stories).forEach(story => {
        if (story.usage) {
            totalInputTokens += story.usage.inputTokens || 0;
            totalOutputTokens += story.usage.outputTokens || 0;
            totalTokens += story.usage.totalTokens || 0;
        }
    });

    const inputCost = totalInputTokens * PRICING.input;
    // Use totalTokens for output cost calculation as it includes "thinking time"
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
    const [isStoryPending, startStoryTransition] = useTransition();
    const { toast } = useToast();

    const fetchData = async () => {
        if (!user || !game) return;
        setIsLoading(true);
        const [stateData, logsData] = await Promise.all([
            getPlayerState(user.id, game.id),
            getPlayerLogs(user.id, game.id),
        ]);
        setState(stateData);
        setLogs(logsData);
        if (logsData && stateData) {
            setStats(calculateStats(logsData, stateData.stories || {}));
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user, game]);

    const handleGenerateStory = () => {
        if (!user || !game || !state) {
          toast({ variant: "destructive", title: "Error", description: "Cannot generate story without user or game data."});
          return;
        }
        startStoryTransition(async () => {
          try {
            toast({ title: "Crafting Story...", description: `The AI is writing a story for ${user.username}. This may take a moment.` });
            const { newState } = await generateStoryForChapter(user.id, game.id, state.currentChapterId);
            setState(newState); // Update local state
            if (logs) {
                setStats(calculateStats(logs, newState.stories || {}));
            }
            toast({ title: "Story Complete!", description: `Personalized story for ${user.username} has been created.` });
          } catch (error) {
            console.error("Generate Story error:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
              variant: "destructive",
              title: "Story Generation Failed",
              description: errorMessage,
            });
          }
        });
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoaderCircle className="animate-spin h-8 w-8" />
            </div>
        );
    }
    
    if (!game || !state) {
        return <p>Game data or player state not found for this user.</p>
    }

    const stories = state?.stories ? Object.values(state.stories) : [];
    const hasStoryForCurrentChapter = state?.stories && state.stories[state.currentChapterId];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-6rem)]">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Current State</AccordionTrigger>
                                <AccordionContent>
                                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Generated Stories ({stories.length})</AccordionTrigger>
                                <AccordionContent>
                                    {stories.length > 0 ? (
                                        stories.map(story => (
                                            <div key={story.chapterId} className="mb-4 pb-2 border-b">
                                                <h4 className="font-bold text-sm mb-1">{story.title}</h4>
                                                <p className="text-xs whitespace-pre-wrap">{story.content}</p>
                                                {story.usage && (
                                                    <p className="text-muted-foreground text-right text-xs mt-1">
                                                        Tokens: {story.usage.totalTokens} (~${calculateCostForUsage(story.usage).toFixed(6)})
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : <p className="text-xs text-muted-foreground">No stories have been generated yet.</p>}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </ScrollArea>
                </CardContent>
            </Card>
            <div className="lg:col-span-2 grid grid-rows-6 gap-4">
                 <Card className="row-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Game Stats: {game.title}</CardTitle>
                        <Button 
                            size="sm" 
                            onClick={handleGenerateStory}
                            disabled={isStoryPending || !!hasStoryForCurrentChapter}
                        >
                            <Sparkles className={cn("mr-2 h-4 w-4", isStoryPending && "animate-spin")} />
                             {isStoryPending ? 'Generating...' : hasStoryForCurrentChapter ? 'Story Exists' : 'Generate Story'}
                        </Button>
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
                    <CardHeader><CardTitle>Message Logs</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(80vh-14rem)]">
                            <div className="space-y-2">
                                {logs.map(log => (
                                    <div key={log.id} className="text-xs border-b pb-1">
                                        <p><span className="font-bold">{log.senderName}</span> ({log.sender}):</p>
                                        <p className="whitespace-pre-wrap">{log.content}</p>
                                        {log.usage && (<p className="text-muted-foreground text-right">Tokens: {log.usage.totalTokens}</p>)}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export function UsersTab({ users, games, isLoading, onRefresh }: { users: User[], games: Game[], isLoading: boolean, onRefresh: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();
    const { toast } = useToast();

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

    const handleDeleteUser = (userToDelete: User) => {
        startDeleteTransition(async () => {
            try {
                await deleteUser(userToDelete.id, userToDelete.purchasedGames);
                toast({
                    title: "User Deleted",
                    description: `${userToDelete.username} (${userToDelete.id}) has been successfully deleted.`,
                });
                if (selectedUser?.id === userToDelete.id) {
                    setSelectedUser(null);
                }
                onRefresh(); // Refresh the user list
            } catch (error) {
                console.error("Delete user error:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                toast({
                    variant: "destructive",
                    title: "Deletion Failed",
                    description: errorMessage,
                });
            }
        });
    };


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>A list of all players. Select a user to see their game data.</CardDescription>
                </div>
                 <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading || isDeleting}>
                    <RefreshCw className={cn("h-4 w-4", (isLoading || isDeleting) && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Update</span>
                </Button>
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
                                        <TableHead className="text-right">Actions</TableHead>
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
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8"
                                                            onClick={(e) => e.stopPropagation()} // Prevent row selection
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the user <span className="font-bold">{user.username} ({user.id})</span> and all of their associated data (game state, logs).
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="bg-destructive hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
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
