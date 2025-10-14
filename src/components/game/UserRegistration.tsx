
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UserRegistrationProps {
  onRegister: (phone: string) => Promise<{ success: boolean; message: string }>;
}

export function UserRegistration({ onRegister }: UserRegistrationProps) {
  const [phone, setPhone] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) {
      toast({
        variant: 'destructive',
        title: 'Consent Required',
        description: 'You must agree to the terms to proceed.',
      });
      return;
    }
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
          <CardContent className="space-y-4">
            <Input
              type="tel"
              placeholder="e.g., 491234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              required
            />
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={hasAgreed} onCheckedChange={(checked) => setHasAgreed(checked as boolean)} />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                I hereby agree that my phone number is being saved in the DB for Test-Reasons. My phone number will only be used for this website and not in any further way.
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || !hasAgreed}>
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Start Playing'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
