
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Dashboard } from './Dashboard';

export default function WriterPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const correctPassword = process.env.NEXT_PUBLIC_WRITER_PASSWORD;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!correctPassword) {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Writer password is not set in the environment variables.',
        });
        setIsLoading(false);
        return;
    }

    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'The password you entered is incorrect.',
      });
    }
    setIsLoading(false);
  };

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Writer's Room</CardTitle>
          <CardDescription>
            Please enter the password to access the game editor.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Enter'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
