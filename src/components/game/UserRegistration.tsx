
'use client';

import { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css'
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
  const [phone, setPhone] = useState<string>('');
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
    
    // The library returns the number with country code, which is usually > 10 digits
    if (!phone || phone.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number.',
      });
      return;
    }

    setIsLoading(true);
    // The library returns the number without '+', which is what we want.
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
            <PhoneInput
              country={'de'} // Default to Germany
              value={phone}
              onChange={setPhone}
              inputProps={{
                name: 'phone',
                required: true,
                autoFocus: true,
                disabled: isLoading,
              }}
              // These class names are used to apply Tailwind styles from globals.css
              containerClass="react-tel-input"
              inputClass="form-control"
              dropdownClass="country-list"
              searchClass="search-field"
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
