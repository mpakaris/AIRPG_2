'use client';

import { BookOpen, Box, Compass, ScrollText, Target, User } from 'lucide-react';
import type { FC } from 'react';
import type { Game, PlayerState } from '@/lib/game/types';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

interface GameSidebarProps {
  game: Game;
  playerState: PlayerState;
}

export const GameSidebar: FC<GameSidebarProps> = ({ game, playerState }) => {
  const chapter = game.chapters[playerState.currentChapterId];
  const location = chapter.locations[playerState.currentLocationId];
  const inventoryItems = playerState.inventory.map(id => chapter.items[id]);

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="font-headline text-2xl font-bold text-primary">
          {game.title}
        </h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Compass />
            Location
          </SidebarGroupLabel>
          <p className="px-2 text-sm text-muted-foreground">{location.name}</p>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Target />
            Objective
          </SidebarGroupLabel>
          <p className="px-2 text-sm text-muted-foreground">{chapter.goal}</p>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Box />
            Inventory
          </SidebarGroupLabel>
          <SidebarMenu>
            {inventoryItems.length > 0 ? (
              inventoryItems.map((item) => {
                const itemImage = PlaceHolderImages.find(p => p.id === item.image);
                return (
                    <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton tooltip={item.description} size="lg" className="h-auto">
                            {itemImage && (
                                <Image 
                                    src={itemImage.imageUrl} 
                                    alt={itemImage.description} 
                                    width={24} 
                                    height={24}
                                    className="rounded-sm"
                                    data-ai-hint={itemImage.imageHint}
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
         <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <User />
            NPCs Present
          </SidebarGroupLabel>
           {location.npcs.length > 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
                {location.npcs.map(id => chapter.npcs[id].name).join(", ")}
            </p>
           ) : (
            <p className="px-2 text-sm text-muted-foreground italic">
                You are alone here.
            </p>
           )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

    