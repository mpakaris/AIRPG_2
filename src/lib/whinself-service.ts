
import type { Message } from './game/types';

const WHINSELF_API_URL = process.env.WHINSELF_API_URL;

if (!WHINSELF_API_URL) {
    console.warn("WHINSELF_API_URL is not set. The Whinself messaging service will not be available.");
}

async function sendMessage(to: string, messageData: object) {
    if (!WHINSELF_API_URL) {
        console.error("Cannot send message: WHINSELF_API_URL is not configured.");
        return;
    }

    try {
        const response = await fetch(`${WHINSELF_API_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, ...messageData }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Whinself API error: ${response.status} ${response.statusText}`, errorBody);
        }
    } catch (error) {
        console.error("Failed to send message via Whinself:", error);
    }
}

export async function sendTextMessage(to: string, text: string) {
    return sendMessage(to, { text });
}

export async function sendImageMessage(to: string, url: string, caption: string = '') {
    return sendMessage(to, { image: url, caption });
}

export async function sendVideoMessage(to: string, url: string, caption: string = '') {
    return sendMessage(to, { video: url, caption });
}

export async function sendAudioMessage(to: string, url: string) {
    return sendMessage(to, { audio: url });
}

export async function sendDocumentMessage(to: string, url: string, filename: string) {
    return sendMessage(to, { document: url, filename });
}

/**
 * Dispatches a game message to the user via the Whinself service.
 * @param to The recipient's phone number.
 * @param message The game message object to send.
 */
export async function dispatchMessage(to: string, message: Message) {
    const { type, content, image } = message;

    switch (type) {
        case 'text':
        case 'agent': // Agent messages are just styled text
        case 'system':
            return sendTextMessage(to, content);
        case 'image':
            if (image) {
                // If there's an image, send it with the content as a caption.
                return sendImageMessage(to, image.url, content);
            } else {
                // If for some reason there's no image object, just send the text.
                return sendTextMessage(to, content);
            }
        case 'article':
            if (image) {
                 return sendImageMessage(to, image.url, content);
            }
            return sendTextMessage(to, content);
        case 'video':
            return sendVideoMessage(to, content);
        case 'audio':
            return sendAudioMessage(to, content);
        case 'document':
            // Assuming the content is the URL and we can derive a filename.
            const filename = content.split('/').pop() || 'document.pdf';
            return sendDocumentMessage(to, content, filename);
        default:
            console.warn(`Unsupported message type for Whinself: ${type}`);
            // Fallback to sending text content if available
            if (content) {
                return sendTextMessage(to, `[Unsupported Content: ${type}]\n${content}`);
            }
            break;
    }
}
