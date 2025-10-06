
import { NextResponse } from 'next/server';
import { processCommand, logAndSave } from '@/app/actions';
import { dispatchMessage } from '@/lib/whinself-service';
import { game as gameCartridge } from '@/lib/game/cartridge';

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}


/**
 * This is the primary webhook for receiving messages from Whinself.
 * It is not currently used in development because of auth issues,
 * but it is the code that would run in production.
 * In development, we simulate calls to this by using the "Fetch WhatsApp Msg"
 * button in the UI, which calls our interceptor service.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received POST request from Whinself webhook:', JSON.stringify(body, null, 2));

    const userId = body.phone;
    const playerInput = body.event?.Message?.conversation;

    if (!userId || !playerInput) {
      console.error('Invalid payload: Missing phone number or message content.');
      return new NextResponse(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: corsHeaders });
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

    return new NextResponse(JSON.stringify({ status: 'ok', message: 'Message processed and response sent.' }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in Whinself POST route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: 'Failed to process request', details: errorMessage }), { status: 500, headers: corsHeaders });
  }
}
