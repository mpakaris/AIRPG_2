
import { NextResponse } from 'next/server';
import { processCommand, logAndSave } from '@/app/actions';
import { dispatchMessage } from '@/lib/whinself-service';
import { game as gameCartridge } from '@/lib/game/cartridge';

/**
 * Receives webhook POST requests from Whinself, processes the player's command,
 * and sends back the game's response via the Whinself service.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received POST request from Whinself webhook:', JSON.stringify(body, null, 2));

    const userId = body.phone;
    const playerInput = body.event?.Message?.conversation;

    if (!userId || !playerInput) {
      console.error('Invalid payload: Missing phone number or message content.');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process the player's command using the core game logic
    const result = await processCommand(userId, playerInput);

    // Send the response messages back to the player via Whinself
    for (const message of result.messages) {
      await dispatchMessage(userId, message);
    }
    
    // Log the player's original message along with the game's responses
    const playerMessage = {
        id: body.event?.Info?.ID || crypto.randomUUID(),
        sender: 'player' as const,
        senderName: body.event?.Info?.PushName || 'Player',
        type: 'text' as const,
        content: playerInput,
        timestamp: new Date(body.event?.Info?.Timestamp).getTime() || Date.now(),
    };

    if (result.newState) {
      // In a real scenario, you'd merge messages. Here we are just logging the latest turn.
      // The web client will get its updates via its own state management.
      const messagesToLog = [...result.messages, playerMessage];
      await logAndSave(userId, gameCartridge.id, result.newState, messagesToLog);
    }

    return NextResponse.json({ status: 'ok', message: 'Message processed and response sent.' });

  } catch (error) {
    console.error('Error in Whinself POST route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
