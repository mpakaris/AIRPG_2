

'use client';

import { Box, Code, RotateCcw } from 'lucide-react';
import { FC, useState, useTransition, useEffect } from 'react';
import type { SerializableGame, PlayerState, Flag, ChapterId, User as UserType } from '@/lib/game/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sendWhinselfTestMessage, findOrCreateUser, generateStoryForChapter, applyDevCheckpoint, switchChapter } from '@/app/actions';
import { chapterMetadata } from '@/lib/game/cartridges';
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
} from "@/components/ui/alert-dialog"

interface GameSidebarProps {
  game: SerializableGame;
  playerState: PlayerState;
  onCommandSubmit: (command: string) => void;
  onResetGame: () => void;
  onResetPlayer?: () => void;
  setCommandInputValue: (value: string) => void;
  userId: string | null;
  onStateUpdate: (newState: PlayerState) => void;
  onChapterSwitch?: (gameId: string) => void;
}

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;


export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState, onCommandSubmit, onResetGame, onResetPlayer, setCommandInputValue, userId, onStateUpdate, onChapterSwitch }) => {
  const { toast } = useToast();
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserType | null>(null);

  const currentEnv = process.env.NEXT_PUBLIC_NODE_ENV || 'test';
  const isDevEnvironment = currentEnv === 'development';

  const handleChapterSwitch = (gameId: string) => {
    if (onChapterSwitch) {
      onChapterSwitch(gameId);
    }
  };

  // Get checkpoints for current chapter
  const currentChapterKey = Object.keys(chapterMetadata).find(
    key => chapterMetadata[key as keyof typeof chapterMetadata].gameId === game.id
  );
  const currentCheckpoints = currentChapterKey
    ? chapterMetadata[currentChapterKey as keyof typeof chapterMetadata].devCheckpoints
    : [];

  const [objectivesVisible, setObjectivesVisible] = useState(isDevEnvironment);

  // Safety checks for incomplete state
  const chapter = game.chapters[game.startChapterId];
  const location = playerState?.currentLocationId ? game.locations[playerState.currentLocationId] : null;

  // Filter out worn/equipped items from inventory display
  // Worn items are tracked via flags (e.g., 'wearing_hard_hat')
  const inventoryItems = (playerState?.inventory || [])
    .map(id => game.items[id])
    .filter(Boolean)
    .filter(item => {
      // Check if this item has a corresponding "wearing_X" flag that's true
      // For item_hard_hat, check wearing_hard_hat flag
      const wearingFlag = `wearing_${item.id.replace('item_', '')}` as Flag;
      const isWorn = !!playerState?.flags?.[wearingFlag];
      return !isWorn; // Hide item if it's currently worn
    });

  // NEW: flags is now Record<string, boolean> instead of array
  const isChapterComplete = !!playerState?.flags?.[chapterCompletionFlag(game.startChapterId)];
  const hasStory = !!playerState?.stories?.[game.startChapterId];


  useEffect(() => {
    if (userId) {
      findOrCreateUser(userId).then(({ user }) => {
        if (user) {
          setUser(user);
        }
      });
    }
  }, [userId]);

  const isObjectiveComplete = (flag: Flag): boolean => {
    // NEW: flags is now Record<string, boolean> instead of array
    return !!playerState.flags?.[flag];
  }

  const handleDevCommand = (chapterId: ChapterId) => {
      onCommandSubmit(`dev:complete_${chapterId}`);
  }

  const handleGenerateStory = () => {
    if (!userId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot generate story without a user."});
      return;
    }
    startTransition(async () => {
      try {
        toast({ title: "Crafting Your Story...", description: "The AI is weaving your adventure into a narrative. This may take a moment." });
        const { newState } = await generateStoryForChapter(userId, game.id, game.startChapterId);
        onStateUpdate(newState);
        toast({ title: "Story Complete!", description: "Your personalized story for this chapter has been created." });
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


  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="font-headline text-2xl font-bold text-primary">
          {game.title}
        </h2>
        {user && <p className="text-sm text-muted-foreground">Playing as: {userId}</p>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Box />
            Inventory
          </SidebarGroupLabel>
          <SidebarMenu>
            {inventoryItems.length > 0 ? (
              inventoryItems.map((item) => {
                return (
                    <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton tooltip={item.description} size="lg" className="h-auto">
                            {item.media?.image && (
                                <Image
                                    src={item.media.image.url}
                                    alt={item.media.image.description}
                                    width={24}
                                    height={24}
                                    className="rounded-sm"
                                    data-ai-hint={item.media.image.hint}
                                />
                            )}
                            <div className="flex flex-col items-start">
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
              })
            ) : (
              <p className="px-2 text-sm text-muted-foreground italic">
                Your inventory is empty.
              </p>
            )}
          </SidebarMenu>
        </SidebarGroup>
        
        {isDevEnvironment && (
            <SidebarGroup>
                <SidebarGroupLabel className='flex items-center gap-2'>
                    <Code />
                    Dev Controls
                </SidebarGroupLabel>
                <div className='flex flex-col gap-2 px-2'>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <RotateCcw className='mr-2 h-4 w-4'/>
                          Reset Chapter
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Current Chapter?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset {game.title} to the beginning. Your progress in other chapters will NOT be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={onResetGame}>Reset Chapter</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {onResetPlayer && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            <RotateCcw className='mr-2 h-4 w-4'/>
                            Reset Player
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset Entire Player?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will DELETE ALL player data including progress in ALL chapters. This action cannot be undone and will reload the page.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onResetPlayer} className="bg-red-600 hover:bg-red-700">
                              Delete Everything
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowCheckpoints(!showCheckpoints)}
                    >
                      <span className='mr-2'>🧪</span>
                      Dev Checkpoints
                    </Button>
                    {showCheckpoints && (
                      <div className='flex flex-col gap-1 mt-2 p-2 border border-gray-300 rounded-md bg-gray-50'>
                        <p className='text-xs text-gray-600 mb-2'>Skip to specific parts of {game.title}:</p>
                        {currentCheckpoints.length > 0 ? (
                          currentCheckpoints.map((checkpoint) => (
                            <Button
                              key={checkpoint.id}
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!userId) {
                                  toast({ title: 'Error', description: 'No user ID', variant: 'destructive' });
                                  return;
                                }
                                try {
                                  const result = await applyDevCheckpoint(userId, checkpoint.id);
                                  onStateUpdate(result.newState, result.messages);
                                  toast({ title: 'Checkpoint Applied', description: checkpoint.label });
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: error instanceof Error ? error.message : 'Failed to apply checkpoint',
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              disabled={isPending}
                              className='text-xs justify-start'
                              title={checkpoint.description}
                            >
                              {checkpoint.label}
                            </Button>
                          ))
                        ) : (
                          <p className='text-xs text-gray-500 italic'>No checkpoints defined for this chapter</p>
                        )}
                      </div>
                    )}

                    {/* Chapter Switcher */}
                    <div className='mt-4 pt-4 border-t border-gray-200'>
                      <p className='text-xs text-gray-600 mb-2 font-semibold'>📚 Chapter Switcher</p>
                      <div className='flex flex-col gap-1'>
                        {Object.entries(chapterMetadata).map(([key, metadata]) => {
                          const isCurrentChapter = metadata.gameId === game.id;
                          return (
                            <Button
                              key={key}
                              variant={isCurrentChapter ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleChapterSwitch(metadata.gameId)}
                              disabled={isPending || isCurrentChapter}
                              className='text-xs justify-start'
                            >
                              {isCurrentChapter && <span className='mr-1'>▶</span>}
                              {metadata.title}
                            </Button>
                          );
                        })}
                      </div>
                      <p className='text-xs text-gray-500 mt-2'>
                        Switches chapter and loads messages from DB
                      </p>
                    </div>
                </div>
            </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
