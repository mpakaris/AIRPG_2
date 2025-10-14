
'use client';

import { useState, useTransition, type FC, useEffect } from 'react';
import { processCommand, resetGame } from '@/app/actions';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { UserRegistration } from './UserRegistration';

interface GameClientProps {
  game: Game;
  initialGameState: PlayerState;
  initialMessages: Message[];
}

export const GameClient: FC<GameClientProps> = ({ game, initialGameState, initialMessages }) => {
  const { userId, isUserLoading, showRegistration, registerUser } = useUser(initialGameState, initialMessages);
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [commandInputValue, setCommandInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'production';
  const showSidebar = currentEnv === 'development' || currentEnv === 'test';

  // Effect to update local state when user changes (e.g., after registration or loading from localStorage)
  useEffect(() => {
    if (userId) {
        // When a user is identified, we might need to fetch their specific state.
        // For now, we assume the initial data is correct or will be updated on the first command.
        // A more robust solution could fetch user-specific data here.
    }
  }, [userId]);


  const handleResetGame = () => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot reset game without a user.' });
      return;
    }
    startTransition(async () => {
        try {
            const result = await resetGame(userId);
            setPlayerState(result.newState);
            setMessages(result.messages);
            toast({
              title: "Game Reset",
              description: "The game state and logs have been reset.",
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

  const handleCommandSubmit = (command: string) => {
    if (!command.trim()) return;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot process command without a user.' });
      return;
    }
    
    setCommandInputValue(''); // Clear input after submission

    startTransition(async () => {
      try {
        const result = await processCommand(userId, command);
        
        if (result.newState) {
            setPlayerState(result.newState);
        }

        // The result.messages contains the complete log for the session, including the player's input.
        // We replace the client-side messages with this authoritative list.
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

  if (showRegistration) {
    return <UserRegistration onRegister={registerUser} />;
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
              setCommandInputValue={setCommandInputValue}
              userId={userId}
          />
        )}
        <main className={`transition-all duration-300 ease-in-out ${showSidebar ? 'md:pl-[20rem] group-data-[state=collapsed]/sidebar-wrapper:md:pl-0' : ''}`}>
            <GameScreen
            messages={messages}
            onCommandSubmit={handleCommandSubmit}
            isLoading={isPending || isUserLoading}
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

    