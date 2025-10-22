
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, PlusCircle } from 'lucide-react';
import type { Game } from '@/lib/game/types';
import { getGames } from './actions';

function GameSelection() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const gamesData = await getGames();
      setGames(gamesData);
    } catch (error) {
      console.error("Failed to fetch games:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load game list from database.'});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const { toast } = useToast();

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 p-4">
      <div className="w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Writer's Room</h1>
          <p className="text-muted-foreground">Select a game to edit or create a new one.</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Card 
                key={game.id} 
                className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => router.push(`/writer/${game.id}`)}
              >
                <CardHeader>
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description.substring(0, 100)}...</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Game ID: {game.id}</p>
                </CardContent>
              </Card>
            ))}
             <Card 
                className="flex items-center justify-center cursor-pointer border-dashed hover:border-primary hover:text-primary transition-all"
                onClick={() => toast({ title: "Coming Soon!", description: "Creating new games will be enabled in a future update."})}
              >
                <div className="text-center text-muted-foreground">
                  <PlusCircle className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-semibold">Create New Game</p>
                </div>
              </Card>
          </div>
        )}
      </div>
    </div>
  );
}


export default function WriterAuthPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // In a real app, this would be more secure. For this tool, env variable is fine.
  const correctPassword = process.env.NEXT_PUBLIC_WRITER_PASSWORD;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!correctPassword) {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Writer password is not set in the environment variables.',
        });
        setIsLoading(false);
        return;
    }

    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'The password you entered is incorrect.',
      });
    }
    setIsLoading(false);
  };

  if (isAuthenticated) {
    return <GameSelection />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Writer's Room Access</CardTitle>
          <CardDescription>
            Please enter the password to access the game creation tools.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Enter'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
