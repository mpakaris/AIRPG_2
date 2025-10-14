
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

interface UserRegistrationProps {
  onRegister: (phone: string) => Promise<{ success: boolean; message: string }>;
}

export function UserRegistration({ onRegister }: UserRegistrationProps) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Phone number cannot be empty.',
      });
      return;
    }
    setIsLoading(true);
    const result = await onRegister(phone);
    setIsLoading(false);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: result.message,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Tester</CardTitle>
          <CardDescription>
            Please enter your phone number to begin or continue your test session.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Input
              type="tel"
              placeholder="e.g., 491234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Start Playing'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    