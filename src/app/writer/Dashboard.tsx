
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGameData } from './actions';
import type { Game, GameId } from '@/lib/game/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function EntityTable({ title, description, data, columns }: { title: string, description: string, data: any[], columns: { key: string, label: string }[] }) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent><p className="text-muted-foreground">No data found for {title}.</p></CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title} ({data.length})</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh]">
                    <Accordion type="single" collapsible className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item) => (
                                    <AccordionItem value={item.id || item.locationId || item.portalId} key={item.id || item.locationId || item.portalId} className="border-b-0">
                                        <AccordionTrigger asChild>
                                            <TableRow className="cursor-pointer hover:bg-muted/50">
                                                {columns.map(col => <TableCell key={col.key}>{String(item[col.key])}</TableCell>)}
                                            </TableRow>
                                        </AccordionTrigger>
                                        <AccordionContent asChild>
                                            <tr>
                                                <td colSpan={columns.length + 1}>
                                                    <div className="bg-muted/50 p-4 rounded-lg">
                                                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </TableBody>
                        </Table>
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


export function Dashboard({ gameId }: { gameId: GameId }) {
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const gameData = await getGameData(gameId);
    setGame(gameData);
    setIsLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (isLoading) {
      return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
              <LoaderCircle className="animate-spin h-12 w-12 text-primary" />
              <p className="mt-4 text-muted-foreground">Loading Game Data for {gameId} from Firestore...</p>
          </div>
      );
  }

  if (!game) {
       return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
              <p className="mt-4 text-destructive">Failed to load game data. Have you seeded the database? Run `npm run db:seed game`.</p>
          </div>
      );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Button asChild variant="outline" size="icon">
          <Link href="/writer">
            <ArrowLeft />
            <span className="sr-only">Back to Games</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Editing: {game.title}</h1>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Tabs defaultValue="chapters">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="objects">Objects</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="npcs">NPCs</TabsTrigger>
            <TabsTrigger value="portals">Portals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chapters">
            <EntityTable 
                title="Chapters"
                description="The chapters that make up the game."
                data={Object.values(game.chapters || {})}
                columns={[ { key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }, { key: 'goal', label: 'Goal' } ]}
            />
          </TabsContent>
          <TabsContent value="locations">
             <EntityTable 
                title="Locations"
                description="The different scenes or places in the game world."
                data={Object.values(game.locations || {})}
                columns={[ { key: 'locationId', label: 'ID' }, { key: 'name', label: 'Name' } ]}
            />
          </TabsContent>
          <TabsContent value="objects">
             <EntityTable 
                title="Game Objects"
                description="The interactive objects within locations."
                data={Object.values(game.gameObjects || {})}
                columns={[ { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' } ]}
            />
          </TabsContent>
          <TabsContent value="items">
             <EntityTable 
                title="Items"
                description="Items that can be found, taken, and used by the player."
                data={Object.values(game.items || {})}
                columns={[ { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' } ]}
            />
          </TabsContent>
          <TabsContent value="npcs">
             <EntityTable 
                title="NPCs"
                description="The non-player characters in the game."
                data={Object.values(game.npcs || {})}
                columns={[ { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'importance', label: 'Importance' }, { key: 'dialogueType', label: 'Dialogue Type' } ]}
            />
          </TabsContent>
          <TabsContent value="portals">
             <EntityTable 
                title="Portals"
                description="Connections between locations."
                data={Object.values(game.portals || {})}
                columns={[ { key: 'portalId', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Type' } ]}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
