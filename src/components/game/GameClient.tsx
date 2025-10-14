
'use client';

import { useState, useTransition, type FC } from 'react';
import { processCommand, resetGame } from '@/app/actions';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GameSidebar } from './GameSidebar';
import { GameScreen } from './GameScreen';
import { useToast } from '@/hooks/use-toast';

interface GameClientProps {
  game: Game;
  initialGameState: PlayerState;
  initialMessages: Message[];
}

// Hardcoded for dev environment
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID || "36308548589";

export const GameClient: FC<GameClientProps> = ({ game, initialGameState, initialMessages }) => {
  const [playerState, setPlayerState] = useState<PlayerState>(initialGameState);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [commandInputValue, setCommandInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const showSidebar = process.env.NEXT_PUBLIC_NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'test';

  const handleResetGame = () => {
    startTransition(async () => {
        try {
            const result = await resetGame(DEV_USER_ID);
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
    
    setCommandInputValue(''); // Clear input after submission

    startTransition(async () => {
      try {
        const result = await processCommand(DEV_USER_ID, command);
        
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
          />
        )}
        <main className={`transition-all duration-300 ease-in-out ${showSidebar ? 'md:pl-[20rem] group-data-[state=collapsed]/sidebar-wrapper:md:pl-0' : ''}`}>
            <GameScreen
            messages={messages}
            onCommandSubmit={handleCommandSubmit}
            isLoading={isPending}
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
