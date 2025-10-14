
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUsers, getGames } from './actions';
import type { User, Game } from '@/lib/game/types';
import { UsersTab } from './UsersTab';
import { GamesTab } from './GamesTab';

export function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const [usersData, gamesData] = await Promise.all([
      getUsers(),
      getGames(),
    ]);
    setUsers(usersData);
    setGames(gamesData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UsersTab users={users} games={games} isLoading={isLoading} onRefresh={fetchAllData} />
          </TabsContent>
          <TabsContent value="games">
            <GamesTab games={games} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
