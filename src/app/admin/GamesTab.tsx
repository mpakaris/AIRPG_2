
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import type { Game } from '@/lib/game/types';

export function GamesTab({ games, isLoading }: { games: Game[], isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Games</CardTitle>
        <CardDescription>A list of all available game cartridges.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <LoaderCircle className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Game Type</TableHead>
                <TableHead>Chapters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>{game.id}</TableCell>
                  <TableCell>{game.title}</TableCell>
                  <TableCell>{game.gameType}</TableCell>
                  <TableCell>{Object.keys(game.chapters).length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
