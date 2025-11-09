"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Message, PlayerState, SerializableGame } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { LoaderCircle, Menu, Send } from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useRef, type FC } from "react";

interface GameScreenProps {
  messages: Message[];
  onCommandSubmit: (command: string) => void;
  isLoading: boolean;
  game: SerializableGame;
  playerState: PlayerState;
  commandInputValue: string;
  setCommandInputValue: (value: string) => void;
}

const CommandInput: FC<
  Pick<
    GameScreenProps,
    | "onCommandSubmit"
    | "isLoading"
    | "commandInputValue"
    | "setCommandInputValue"
  >
> = ({
  onCommandSubmit,
  isLoading,
  commandInputValue,
  setCommandInputValue,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandInputValue.trim() && !isLoading) {
      onCommandSubmit(commandInputValue.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full items-center">
      <Input
        type="text"
        placeholder="Type your command..."
        value={commandInputValue}
        onChange={(e) => setCommandInputValue(e.target.value)}
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
  const isAgent = message.sender === "agent";

  const content = message.content.replace(/_|\*/g, "");
  const parts = content.split(urlRegex);

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

// Split messages with both content and images into separate display items (WhatsApp-style)
const splitMessagesForDisplay = (
  messages: Message[]
): Array<Message & { isImageOnly?: boolean }> => {
  const result: Array<Message & { isImageOnly?: boolean }> = [];

  messages.forEach((message) => {
    // If message has both content and image, split into two messages
    if (message.content.trim() && message.image) {
      // Text message first
      result.push({
        ...message,
        id: `${message.id}-text`,
        image: undefined,
      });
      // Image message second
      result.push({
        ...message,
        id: `${message.id}-image`,
        content: "",
        isImageOnly: true,
      });
    } else {
      // Message has only content or only image - keep as is
      result.push({
        ...message,
        isImageOnly: !message.content.trim() && !!message.image,
      });
    }
  });

  return result;
};

const MessageLog: FC<Pick<GameScreenProps, "messages">> = ({ messages }) => {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    // Immediate scroll
    scrollToBottom();

    // Delayed scroll to account for image loading
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [messages]);

  const displayMessages = splitMessagesForDisplay(messages);

  return (
    <ScrollArea viewportRef={scrollViewportRef} className="h-full flex-grow">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {displayMessages.map((message) => {
          const isPlayer = message.sender === "player";
          const isAgent = message.sender === "agent";
          const isImageOnly = message.isImageOnly;

          return (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2",
                isPlayer ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl",
                  !isImageOnly && "px-4 py-2",
                  isImageOnly && "overflow-hidden",
                  isPlayer
                    ? "rounded-br-none bg-primary text-primary-foreground"
                    : "rounded-bl-none bg-muted",
                  isAgent && "bg-blue-500/10 border border-blue-500/20"
                )}
              >
                {!isPlayer && !isImageOnly && (
                  <div
                    className={cn(
                      "text-xs font-bold text-primary mb-1",
                      isAgent && "text-blue-500"
                    )}
                  >
                    {message.senderName}
                  </div>
                )}
                {message.content && <MessageContent message={message} />}
                {message.image &&
                  typeof message.image.url === "string" &&
                  (() => {
                    const src = message.image.url.trim();
                    const valid =
                      src.startsWith("http://") ||
                      src.startsWith("https://") ||
                      src.startsWith("/");

                    if (!valid) {
                      if (process.env.NODE_ENV === "development") {
                        console.warn(
                          "[GameScreen] Invalid image URL:",
                          message.image
                        );
                      }
                      return null;
                    }

                    // Check if this is an audio URL (by file extension OR message type)
                    const isAudioUrl =
                      src.match(/\.(mp3|wav|m4a|aac|ogg)$/i) ||
                      message.type === "audio";

                    // Check if this is a video URL (by file extension OR message type)
                    const isVideoUrl =
                      src.match(/\.(mp4|webm|mov)$/i) ||
                      message.type === "video";

                    if (isAudioUrl) {
                      return (
                        <div className={cn(!isImageOnly && "mt-2")}>
                          <audio
                            src={src}
                            controls
                            className="w-full rounded-lg border-2 border-border bg-muted/30 p-2"
                            preload="metadata"
                            onLoadedMetadata={() => {
                              // Scroll to bottom after audio metadata loads
                              setTimeout(() => {
                                if (endOfMessagesRef.current) {
                                  endOfMessagesRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
                                }
                              }, 50);
                            }}
                          >
                            Your browser does not support the audio element.
                          </audio>
                          {message.image.description && (
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {message.image.description}
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (isVideoUrl) {
                      return (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className={cn(
                                "block w-full cursor-pointer",
                                !isImageOnly && "mt-2"
                              )}
                            >
                              <video
                                src={src}
                                controls
                                className="rounded-lg border-2 border-border w-full"
                                preload="metadata"
                                onLoadedMetadata={() => {
                                  // Scroll to bottom after video metadata loads
                                  setTimeout(() => {
                                    if (endOfMessagesRef.current) {
                                      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
                                    }
                                  }, 50);
                                }}
                              >
                                Your browser does not support the video tag.
                              </video>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogTitle className="sr-only">
                              {message.image.description || "video"}
                            </DialogTitle>
                            <video
                              src={src}
                              controls
                              autoPlay
                              className="mx-auto rounded-lg w-full"
                            >
                              Your browser does not support the video tag.
                            </video>
                          </DialogContent>
                        </Dialog>
                      );
                    }

                    // Default to image rendering
                    return (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className={cn(
                              "block w-full cursor-pointer",
                              !isImageOnly && "mt-2"
                            )}
                          >
                            <Image
                              src={src}
                              alt={message.image.description || "image"}
                              width={400}
                              height={300}
                              className="rounded-lg w-1/2 h-auto mx-auto"
                              style={{ objectFit: "cover" }}
                              data-ai-hint={message.image.hint}
                              onLoad={() => {
                                // Scroll to bottom after image loads
                                setTimeout(() => {
                                  if (endOfMessagesRef.current) {
                                    endOfMessagesRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
                                  }
                                }, 50);
                              }}
                            />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogTitle className="sr-only">
                            {message.image.description || "image"}
                          </DialogTitle>
                          <Image
                            src={src}
                            alt={message.image.description || "image"}
                            width={800}
                            height={600}
                            className="mx-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    );
                  })()}
              </div>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>
    </ScrollArea>
  );
};

export const GameScreen: FC<GameScreenProps> = ({
  messages,
  onCommandSubmit,
  isLoading,
  game,
  playerState,
  commandInputValue,
  setCommandInputValue,
}) => {
  const chapter = game.chapters[game.startChapterId]; // Simplified for now
  const location = game.locations[playerState.currentLocationId];
  return (
    <div className="relative flex h-screen flex-col bg-background">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger>
            <Menu />
          </SidebarTrigger>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">{game.title}</h1>
            <p className="text-sm text-muted-foreground">
              {location?.name || chapter.title}
            </p>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        <MessageLog messages={messages} />
      </main>
      <footer className="border-t bg-card p-4">
        <div className="mx-auto max-w-4xl">
          <CommandInput
            onCommandSubmit={onCommandSubmit}
            isLoading={isLoading}
            commandInputValue={commandInputValue}
            setCommandInputValue={setCommandInputValue}
          />
        </div>
      </footer>
    </div>
  );
};
