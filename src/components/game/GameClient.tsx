
'use client';

import { useState, useTransition, type FC, useEffect } from 'react';
import { processCommand, resetGame, resetPlayer, switchChapter } from '@/app/actions';
import type { SerializableGame, Message, PlayerState, GameId } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { UserRegistration } from './UserRegistration';
import { LoaderCircle } from 'lucide-react';

interface GameClientProps {
  game: SerializableGame;
  initialGameState: PlayerState;
  initialMessages: Message[];
}

export const GameClient: FC<GameClientProps> = ({ game: initialGame, initialGameState, initialMessages }) => {
  const { userId, isUserLoading, showRegistration, registerUser, userState, refetchUserData } = useUser();
  const [game, setGame] = useState<SerializableGame>(initialGame);
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [commandInputValue, setCommandInputValue] = useState('');
  const [isCommandPending, startCommandTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [isSwitchingChapter, startChapterSwitchTransition] = useTransition();
  const { toast } = useToast();

  const showSidebar = true;

  // Effect to load the correct chapter's game data on mount
  useEffect(() => {
    const loadCorrectChapterGame = async () => {
      const storedChapter = typeof window !== 'undefined'
        ? localStorage.getItem('airpg_current_chapter')
        : null;

      // If there's a stored chapter and it's different from the current game
      if (storedChapter && storedChapter !== game.id && userId) {
        try {
          // Just load the game structure, userState will provide player state and messages
          const result = await switchChapter(userId, storedChapter as GameId);
          setGame(result.game as SerializableGame);
          // Don't set playerState or messages here - let userState handle it
        } catch (error) {
          console.error('Failed to load stored chapter game:', error);
        }
      }
    };

    // Only run if we have a userId
    if (userId) {
      loadCorrectChapterGame();
    }
  }, [userId, game.id]); // Run when userId becomes available

  // Effect to update local state when the user's state is loaded by the hook
  // This provides the correct player state and messages for the current chapter
  useEffect(() => {
    if (userState) {
      setPlayerState(userState.playerState);
      setMessages(userState.messages);
    }
  }, [userState]);


  const handleResetGame = () => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot reset game without a user.' });
      return;
    }
    startResetTransition(async () => {
        try {
            const result = await resetGame(userId, game.id as GameId);

            // Update state for current chapter
            setPlayerState(result.newState);
            setMessages(result.messages);

            // Refetch user data to ensure hook state is synced with Firebase
            await refetchUserData();

            toast({
              title: "Chapter Reset",
              description: `${game.title} has been reset to the beginning.`,
            });
        } catch(error) {
             console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset game.';
            toast({
              variant: 'destructive',
              title: 'Error',
              description: errorMessage,
            });
        }
    });
  };

  const handleResetPlayer = () => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot reset player without a user.' });
      return;
    }
    startResetTransition(async () => {
        try {
            const result = await resetPlayer(userId);

            if (result.shouldReload) {
                toast({
                  title: "Player Reset",
                  description: "Deleting all player data and reloading...",
                });
                // Give the toast time to show, then reload
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch(error) {
             console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset player.';
            toast({
              variant: 'destructive',
              title: 'Error',
              description: errorMessage,
            });
        }
    });
  };

  const handleCommandSubmit = (command: string) => {
    if (!command.trim()) return;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot process command without a user.' });
      return;
    }
    
    setCommandInputValue(''); // Clear input after submission

    startCommandTransition(async () => {
      try {
        const result = await processCommand(userId, command);

        if (result.newState) {
            setPlayerState(result.newState);
        }
        if (result.messages) {
            setMessages(result.messages);
        }

      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process command.';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    });
  };
  
  const handleStateUpdate = (newState: PlayerState, newMessages?: Message[]) => {
      setPlayerState(newState);
      if (newMessages) {
        setMessages(newMessages);
      }
  };

  const handleChapterSwitch = (targetGameId: string) => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot switch chapters without a user.' });
      return;
    }

    startChapterSwitchTransition(async () => {
      try {
        toast({ title: "Switching Chapter...", description: "Loading chapter data from Firebase" });

        const result = await switchChapter(userId, targetGameId as any);

        // Save current chapter to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('airpg_current_chapter', targetGameId);
        }

        // Update all game state
        setGame(result.game as SerializableGame);
        setPlayerState(result.playerState);
        setMessages(result.messages);

        toast({
          title: "Chapter Switched!",
          description: `Now playing: ${result.game.title}`,
        });
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to switch chapter.';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    });
  };

  if (isUserLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (showRegistration) {
    return <UserRegistration onRegister={registerUser} />;
  }
  
  if (!userId) {
    // This state can happen briefly or if something goes wrong.
     return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <p>Could not identify user. Please refresh the page.</p>
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className='relative min-h-screen'>
        {showSidebar && (
          <GameSidebar
              game={game}
              playerState={playerState}
              onCommandSubmit={handleCommandSubmit}
              onResetGame={handleResetGame}
              onResetPlayer={handleResetPlayer}
              setCommandInputValue={setCommandInputValue}
              userId={userId}
              onStateUpdate={handleStateUpdate}
              onChapterSwitch={handleChapterSwitch}
          />
        )}
        <main className={`transition-all duration-300 ease-in-out ${showSidebar ? 'md:pl-[20rem] group-data-[state=collapsed]/sidebar-wrapper:md:pl-0' : ''}`}>
            <GameScreen
            messages={messages}
            onCommandSubmit={handleCommandSubmit}
            isLoading={isCommandPending || isResetting || isSwitchingChapter}
            game={game}
            playerState={playerState}
            commandInputValue={commandInputValue}
            setCommandInputValue={setCommandInputValue}
            />
        </main>
      </div>
    </SidebarProvider>
  );
};
