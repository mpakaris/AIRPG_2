
'use client';

import { useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UserRegistrationProps {
  onRegister: (phone: string) => Promise<{ success: boolean; message: string }>;
}

export function UserRegistration({ onRegister }: UserRegistrationProps) {
  const [phone, setPhone] = useState<string | undefined>('');
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
    if (!phone || !isValidPhoneNumber(phone)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number including the country code.',
      });
      return;
    }

    setIsLoading(true);
    // Normalize the number: remove the leading '+'
    const normalizedPhone = phone.replace('+', '');
    const result = await onRegister(normalizedPhone);
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
            <PhoneInput
              placeholder="Enter phone number"
              value={phone}
              onChange={setPhone}
              international
              defaultCountry="DE"
              className="rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-within:ring-2 focus-within:ring-ring"
              disabled={isLoading}
            />
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={hasAgreed} onCheckedChange={(checked) => setHasAgreed(checked as boolean)} disabled={isLoading} />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                I agree that my phone number may be stored in the database for testing purposes only and used solely within this website.
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
