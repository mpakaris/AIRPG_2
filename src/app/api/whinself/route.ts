
import { NextResponse } from 'next/server';

/**
 * A simple test endpoint to verify if POST requests from an external service
 * like Postman can reach the application.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received POST request with body:', body);
    
    // For this test, we just return a simple success response.
    return NextResponse.json({ status: 'ok', message: 'Request received successfully.' });

  } catch (error) {
    console.error('Error in test POST route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
