'use client';

import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PayphoneActivationGameProps {
  solution: string;
  keypadColors: Record<string, string>;
  onComplete: (success: boolean, code: string) => void;
}

export const PayphoneActivationGame: FC<PayphoneActivationGameProps> = ({
  solution,
  keypadColors,
  onComplete,
}) => {
  const [display, setDisplay] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const MAX_DIGITS = 8;

  const handleKeyPress = (key: string) => {
    if (isSuccess) return; // Prevent input after success

    if (key === '*') {
      // Clear button
      setDisplay('');
      return;
    }

    if (key === '#') {
      // Submit button
      if (display.length !== MAX_DIGITS) {
        // Show error animation
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      // Check if correct
      if (display === solution) {
        setIsSuccess(true);
        setTimeout(() => onComplete(true, display), 1000);
      } else {
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setDisplay(''); // Clear on wrong answer
        }, 500);
      }
      return;
    }

    // Number key
    if (display.length < MAX_DIGITS) {
      setDisplay(display + key);
    }
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  const getKeyColor = (key: string): string => {
    // Every key should have a color (some are red herrings)
    return keypadColors[key] || 'gray';
  };

  const getColorClass = (color: string): string => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      cyan: 'bg-cyan-500',
      pink: 'bg-pink-500',
      lime: 'bg-lime-500',
      amber: 'bg-amber-600',
      indigo: 'bg-indigo-500',
      teal: 'bg-teal-500',
      gray: 'bg-gray-400',
    };
    return colorMap[color] || 'bg-gray-400';
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 shadow-2xl">
      <div className="space-y-6">
        {/* Payphone Header */}
        <div className="text-center">
          <h3 className="text-lg font-mono text-gray-300 mb-2">PAYPHONE ACTIVATION</h3>
          <p className="text-xs text-gray-500 font-mono">Enter 8-digit code</p>
        </div>

        {/* Digital Display */}
        <div
          className={`bg-black border-4 border-gray-700 rounded-md p-4 transition-all ${
            isShaking ? 'animate-shake border-red-500' : ''
          } ${isSuccess ? 'border-green-500' : ''}`}
        >
          <div className="font-mono text-3xl text-center tracking-widest h-10 flex items-center justify-center">
            {isSuccess ? (
              <span className="text-green-400 animate-pulse">ACTIVATED</span>
            ) : display.length === 0 ? (
              <span className="text-gray-600">________</span>
            ) : (
              <span className="text-green-400">
                {display}
                {display.length < MAX_DIGITS && (
                  <span className="text-gray-600">
                    {'_'.repeat(MAX_DIGITS - display.length)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.flat().map((key) => (
            <Button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isSuccess}
              className={`
                relative h-16 text-2xl font-bold
                bg-gradient-to-b from-gray-600 to-gray-700
                hover:from-gray-500 hover:to-gray-600
                active:from-gray-700 active:to-gray-800
                border-2 border-gray-800
                shadow-lg hover:shadow-xl
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSuccess ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-white">{key}</span>
              {/* Colored dot indicator */}
              {keypadColors[key] && (
                <div
                  className={`
                    absolute bottom-1 right-1
                    w-2 h-2 rounded-full
                    ${getColorClass(getKeyColor(key))}
                    shadow-md
                  `}
                />
              )}
            </Button>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-gray-400 font-mono space-y-1">
          <p>* = CLEAR | # = SUBMIT</p>
          <p className="text-gray-500">Colored dots indicate cipher mapping</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </Card>
  );
};
