
import { NextResponse } from 'next/server';
import { processCommand, logAndSave } from '@/app/actions';
import { dispatchMessage } from '@/lib/whinself-service';
import { game } from '@/lib/game/cartridge';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- Extract required data from Whinself payload ---
    const phone = body.phone;
    const messageText = body.event?.Message?.conversation;
    const senderName = body.event?.Info?.PushName || 'Player';

    // --- Validate payload ---
    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Invalid payload: Missing phone or message content' }, { status: 400 });
    }

    // --- Process the game command ---
    // The userId is the player's phone number
    const result = await processCommand(phone, messageText);

    // --- Send responses back to the user via Whinself ---
    if (result.messages && result.messages.length > 0) {
      for (const message of result.messages) {
        // We filter out player messages, as we don't need to echo them back
        if (message.sender !== 'player') {
          await dispatchMessage(phone, message);
        }
      }
    }
    
    // --- Save the new state and full log ---
    if (result.newState) {
      const playerMessage = {
          id: crypto.randomUUID(),
          sender: 'player' as const,
          senderName: senderName,
          type: 'text' as const,
          content: messageText,
          timestamp: Date.now(),
      };
      const fullLog = [...result.messages, playerMessage]; // Create a complete log for saving
      await logAndSave(phone, game.id, result.newState, fullLog);
    }


    // --- Return a success response to Whinself ---
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error in Whinself webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
