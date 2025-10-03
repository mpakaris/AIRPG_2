'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import Image from 'next/image';
import { Send, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
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
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-4">
      <Input
        type="text"
        placeholder="Type your command..."
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        disabled={isLoading}
        className="text-base"
        autoFocus
      />
      <Button type="submit" size="icon" disabled={isLoading}>
        {isLoading ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Send />
        )}
        <span className="sr-only">Send Command</span>
      </Button>
    </form>
  );
};

const MessageLog: FC<Pick<GameScreenProps, 'messages'>> = ({ messages }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <ScrollArea className="h-full flex-grow" viewportRef={scrollAreaRef}>
      <div className="space-y-6 pr-4">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col">
            <div
              className={cn(
                'font-bold font-headline',
                message.sender === 'player' ? 'text-accent' : 'text-primary'
              )}
            >
              {message.senderName}
            </div>
            <p className="whitespace-pre-wrap">{message.content}</p>
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
        ))}
      </div>
    </ScrollArea>
  );
};


export const GameScreen: FC<GameScreenProps> = ({ messages, onCommandSubmit, isLoading, game, playerState }) => {
    const chapter = game.chapters[playerState.currentChapterId];
  return (
    <SidebarInset className="flex h-screen flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="font-headline text-xl font-bold text-foreground">
                    {chapter.title}
                </h1>
            </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
            <MessageLog messages={messages} />
            <Separator />
            <div className="px-2 pb-2">
                <CommandInput onCommandSubmit={onCommandSubmit} isLoading={isLoading} />
            </div>
        </main>
    </SidebarInset>
  );
};
