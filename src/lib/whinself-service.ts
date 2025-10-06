
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
            throw new Error(`Whinself API responded with status ${response.status}`);
        }
    } catch (error) {
        console.error("Failed to send message via Whinself:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during the send message request.');
    }
}

function createPayload(to: string, type: 'text' | 'image' | 'video' | 'audio' | 'document', data: object) {
    return {
        event: "message",
        data: {
            from: "whatsapp:+14155238886", // Dummy sender
            to: `whatsapp:${to}`, // Using the recipient ID
            messageId: `whin_${crypto.randomUUID()}`,
            timestamp: new Date().toISOString(),
            type: type,
            ...data,
        }
    };
}


export async function sendTextMessage(to: string, text: string) {
    const payload = createPayload(to, 'text', { text: { body: text } });
    return sendMessage(to, payload);
}

export async function sendImageMessage(to: string, url: string, caption: string = '') {
    const payload = createPayload(to, 'image', { image: { link: url, caption: caption } });
    return sendMessage(to, payload);
}

export async function sendVideoMessage(to: string, url: string, caption: string = '') {
    const payload = createPayload(to, 'video', { video: { link: url, caption: caption } });
    return sendMessage(to, payload);
}

export async function sendAudioMessage(to: string, url: string) {
    const payload = createPayload(to, 'audio', { audio: { link: url } });
    return sendMessage(to, payload);
}

export async function sendDocumentMessage(to: string, url: string, filename: string) {
    const payload = createPayload(to, 'document', { document: { link: url, filename: filename } });
    return sendMessage(to, payload);
}

/**
 * Dispatches a game message to the user via the Whinself service.
 * @param to The recipient's phone number.
 * @param message The game message object to send.
 */
export async function dispatchMessage(to: string, message: Message) {
    const { type, content, image } = message;

    // The 'to' parameter is the DEV_USER_ID. The actual phone number needs to be mapped.
    // For now, we assume the Whinself endpoint or interceptor handles this mapping.
    // The payload we build will use a placeholder for the 'to' phonenumber.

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
