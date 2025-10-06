
import type { Message } from './game/types';

const WHINSELF_API_URL = process.env.WHINSELF_API_URL;

if (!WHINSELF_API_URL) {
    console.warn("WHINSELF_API_URL is not set. The Whinself messaging service will not be available.");
}

async function sendMessage(jid: string, text: string) {
    if (!WHINSELF_API_URL) {
        console.error("Cannot send message: WHINSELF_API_URL is not configured.");
        throw new Error("WHINSELF_API_URL is not configured.");
    }

    const payload = {
        text: text,
        jid: jid
    };

    try {
        const response = await fetch(`${WHINSELF_API_URL}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Whinself API error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Whinself API responded with status ${response.status}: ${errorBody}`);
        }
        
        // The interceptor returns a simple "OK" text response, not JSON.
        return await response.text();

    } catch (error) {
        console.error("Failed to send message via Whinself:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during the send message request.');
    }
}


export async function sendTextMessage(to: string, text: string) {
    const jid = `${to}@s.whatsapp.net`;
    return sendMessage(jid, text);
}

export async function sendImageMessage(to: string, url: string, caption: string = '') {
    const messageText = caption ? `${caption}\n${url}` : url;
    return sendTextMessage(to, messageText);
}

export async function sendVideoMessage(to: string, url: string, caption: string = '') {
    const messageText = caption ? `${caption}\n${url}` : url;
    return sendTextMessage(to, messageText);
}

export async function sendAudioMessage(to: string, url: string) {
    return sendTextMessage(to, url);
}

export async function sendDocumentMessage(to: string, url: string, filename: string) {
    const messageText = `${filename}\n${url}`;
    return sendTextMessage(to, messageText);
}

/**
 * Dispatches a game message to the user via the Whinself service.
 * @param to The recipient's user ID (e.g. '0036308548589').
 * @param message The game message object to send.
 */
export async function dispatchMessage(to: string, message: Message) {
    const { type, content, image } = message;

    let textToSend = content;

    // For non-text types, we'll format a descriptive string.
    switch (type) {
        case 'image':
            textToSend = image ? `[Image: ${image.description}] ${image.url}` : content;
            break;
        case 'article':
             textToSend = image ? `[Article: ${content}] ${image.url}` : content;
            break;
        case 'video':
            textToSend = `[Video] ${content}`;
            break;
        case 'audio':
             textToSend = `[Audio] ${content}`;
            break;
        case 'document':
             textToSend = `[Document] ${content}`;
            break;
    }
    
    return sendTextMessage(to, textToSend);
}
