'use client';

import { useState, useEffect, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PayphoneDialerProps {
  expectedNumber: string;
  onDial: (success: boolean, dialedNumber: string) => void;
}

export const PayphoneDialer: FC<PayphoneDialerProps> = ({
  expectedNumber,
  onDial,
}) => {
  const [display, setDisplay] = useState('');
  const [showCoinAnimation, setShowCoinAnimation] = useState(true);
  const [showDialTone, setShowDialTone] = useState(false);
  const [isDialing, setIsDialing] = useState(false);

  // Coin insertion animation sequence
  useEffect(() => {
    const coinTimer = setTimeout(() => {
      setShowCoinAnimation(false);
      setShowDialTone(true);
    }, 1500);

    return () => clearTimeout(coinTimer);
  }, []);

  const handleKeyPress = (key: string) => {
    if (isDialing) return; // Prevent input while dialing

    if (key === '*') {
      // Clear/backspace
      setDisplay(display.slice(0, -1));
      return;
    }

    if (key === '#') {
      // Dial button
      if (display.length === 0) return; // Can't dial empty number

      setIsDialing(true);

      // Simulate dialing delay
      setTimeout(() => {
        const success = display === expectedNumber;
        onDial(success, display);
      }, 1000);
      return;
    }

    // Number key (limit to 15 digits for any phone number format)
    if (display.length < 15) {
      setDisplay(display + key);
    }
  };

  const formatDisplay = (number: string): string => {
    if (number.length === 0) return '___-____';
    if (number.length <= 3) return number + '_'.repeat(7 - number.length).substring(0, 4);
    if (number.length <= 7) {
      return number.substring(0, 3) + '-' + number.substring(3) + '_'.repeat(7 - number.length);
    }
    // Full number: 555-0147
    return number.substring(0, 3) + '-' + number.substring(3, 7);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  // Show coin animation
  if (showCoinAnimation) {
    return (
      <Card className="w-full max-w-md mx-auto p-8 bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 shadow-2xl">
        <div className="space-y-6 text-center">
          <div className="text-2xl font-mono text-green-400 animate-pulse">
            *CLINK*
          </div>
          <div className="text-lg text-gray-300">
            Quarter accepted...
          </div>
          <div className="flex justify-center">
            <div className="w-6 h-6 bg-yellow-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Show dial tone message
  if (showDialTone) {
    return (
      <Card className="w-full max-w-md mx-auto p-8 bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 shadow-2xl">
        <div className="space-y-6 text-center">
          <div className="text-2xl font-mono text-green-400">
            DIAL TONE
          </div>
          <div className="text-sm text-gray-400 animate-pulse">
            ~~~~~~~~
          </div>
          <Button
            onClick={() => setShowDialTone(false)}
            className="bg-green-600 hover:bg-green-700"
          >
            Enter Number
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 shadow-2xl">
      <div className="space-y-6">
        {/* Payphone Header */}
        <div className="text-center">
          <h3 className="text-lg font-mono text-gray-300 mb-2">PAYPHONE</h3>
          <p className="text-xs text-gray-500 font-mono">Enter phone number</p>
        </div>

        {/* Digital Display */}
        <div
          className={`bg-black border-4 border-gray-700 rounded-md p-4 transition-all ${
            isDialing ? 'border-green-500 animate-pulse' : ''
          }`}
        >
          <div className="font-mono text-3xl text-center tracking-widest h-10 flex items-center justify-center">
            {isDialing ? (
              <span className="text-yellow-400 animate-pulse">DIALING...</span>
            ) : (
              <span className="text-green-400">{formatDisplay(display)}</span>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.flat().map((key) => (
            <Button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isDialing}
              className={`
                relative h-16 text-2xl font-bold
                bg-gradient-to-b from-gray-600 to-gray-700
                hover:from-gray-500 hover:to-gray-600
                active:from-gray-700 active:to-gray-800
                border-2 border-gray-800
                shadow-lg hover:shadow-xl
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isDialing ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-white">{key}</span>
            </Button>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-gray-400 font-mono space-y-1">
          <p>* = BACKSPACE | # = DIAL</p>
          <p className="text-gray-500">Standard 7-digit format: 555-0147</p>
        </div>
      </div>
    </Card>
  );
};
