
import { NextResponse } from 'next/server';
import { processCommand, logAndSave } from '@/app/actions';
import { dispatchMessage } from '@/lib/whinself-service';
import { game } from '@/lib/game/cartridge';

// This is your local Whinself service, exposed via ngrok
const WHINSELF_FETCH_URL = process.env.WHINSELF_API_URL;

// GET route to be called by a button in the UI
export async function GET(request: Request) {
  if (!WHINSELF_FETCH_URL) {
    return NextResponse.json({ error: 'WHINSELF_API_URL is not configured.' }, { status: 500 });
  }

  try {
    // 1. Fetch the next message from your local Whinself queue
    const whinselfResponse = await fetch(`${WHINSELF_FETCH_URL}/fetch`);

    if (!whinselfResponse.ok) {
        if (whinselfResponse.status === 404) {
            // 404 means no new messages, which is a normal-flow case.
            return NextResponse.json({ status: 'No new messages.' });
        }
        const errorText = await whinselfResponse.text();
        console.error('Error fetching from Whinself:', errorText);
        return NextResponse.json({ error: 'Failed to fetch from Whinself', details: errorText }, { status: whinselfResponse.status });
    }

    const body = await whinselfResponse.json();

    // --- Extract required data from Whinself payload ---
    const phone = body.phone;
    const messageText = body.event?.Message?.conversation;
    const senderName = body.event?.Info?.PushName || 'Player';

    // --- Validate payload ---
    if (!phone || !messageText) {
      // This might happen if the fetched event is not a text message.
      // We can just ignore it for now.
      return NextResponse.json({ status: 'Ignored non-text message event.' });
    }

    // --- Process the game command ---
    const result = await processCommand(phone, messageText);

    // --- Save the player's message and the game state BEFORE sending responses ---
    // This ensures our log is in the correct order.
    let fullLog = [];
    if (result.newState) {
      const playerMessage = {
          id: crypto.randomUUID(),
          sender: 'player' as const,
          senderName: senderName,
          type: 'text' as const,
          content: messageText,
          timestamp: Date.now(),
      };
      // We start with the player message, then add the game's responses.
      fullLog = [playerMessage, ...result.messages]; 
      await logAndSave(phone, game.id, result.newState, fullLog);
    }
    
    // --- Send responses back to the user via Whinself ---
    if (result.messages && result.messages.length > 0) {
      for (const message of result.messages) {
        // We don't want to re-send the player's own message back to them.
        if (message.sender !== 'player') {
          await dispatchMessage(phone, message);
        }
      }
    }

    // --- Return a success response ---
    return NextResponse.json({ status: 'ok', processedMessage: messageText });

  } catch (error) {
    console.error('Error in Whinself GET route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
