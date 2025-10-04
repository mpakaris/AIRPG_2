'use client';

import { useEffect, useRef, useState, type FC, Fragment } from 'react';
import Image from 'next/image';
import { Send, LoaderCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Game, Message, PlayerState } from '@/lib/game/types';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface GameScreenProps {
  messages: Message[];
  onCommandSubmit: (command: string) => void;
  isLoading: boolean;
  game: Game;
  playerState: PlayerState;
}

const CommandInput: FC<Pick<GameScreenProps, 'onCommandSubmit' | 'isLoading'>> = ({
  onCommandSubmit,
  isLoading,
}) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isLoading) {
      onCommandSubmit(command.trim());
      setCommand('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full items-center">
      <Input
        type="text"
        placeholder="Type your command..."
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        disabled={isLoading}
        className="h-12 flex-1 rounded-full bg-muted pl-4 pr-14 text-base"
        autoFocus
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading}
        className="absolute right-2 h-9 w-9 rounded-full"
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        <span className="sr-only">Send Command</span>
      </Button>
    </form>
  );
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

const MessageContent: FC<{ message: Message }> = ({ message }) => {
    const isAgent = message.sender === 'agent';
    const parts = message.content.split(urlRegex);

    return (
        <p className={cn("whitespace-pre-wrap", isAgent && "italic")}>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                        >
                            {part}
                        </a>
                    );
                }
                return <Fragment key={index}>{part}</Fragment>;
            })}
        </p>
    );
};


const MessageLog: FC<Pick<GameScreenProps, 'messages'>> = ({ messages }) => {
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <ScrollArea viewportRef={scrollViewportRef} className="h-full flex-grow">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {messages.map((message) => {
          const isPlayer = message.sender === 'player';
          const isAgent = message.sender === 'agent';
          return (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-2',
                isPlayer ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2',
                  isPlayer
                    ? 'rounded-br-none bg-primary text-primary-foreground'
                    : 'rounded-bl-none bg-muted',
                  isAgent && 'bg-blue-500/10 border border-blue-500/20'
                )}
              >
                {!isPlayer && (
                  <div
                    className={cn(
                      'text-xs font-bold text-primary mb-1',
                      isAgent && 'text-blue-500'
                    )}
                  >
                    {message.senderName}
                  </div>
                )}
                <MessageContent message={message} />
                 {message.type === 'image' && message.image && (
                    <Image
                        src={message.image.imageUrl}
                        alt={message.image.description}
                        width={200}
                        height={200}
                        className="mt-2 rounded-lg border-2 border-border"
                        data-ai-hint={message.image.imageHint}
                    />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};


export const GameScreen: FC<GameScreenProps> = ({ messages, onCommandSubmit, isLoading, game, playerState }) => {
    const chapter = game.chapters[playerState.currentChapterId];
  return (
    <div className="flex h-screen flex-col bg-background">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm">
            <div className="flex items-center gap-4">
                <SidebarTrigger>
                  <Menu/>
                </SidebarTrigger>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-foreground">
                      {game.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">{chapter.title}</p>
                </div>
            </div>
        </header>
        <main className="flex flex-1 flex-col overflow-hidden">
            <MessageLog messages={messages} />
        </main>
         <footer className="border-t bg-card p-4">
            <div className="mx-auto max-w-4xl">
              <CommandInput onCommandSubmit={onCommandSubmit} isLoading={isLoading} />
            </div>
        </footer>
    </div>
  );
};
