
import type { Message, ImageDetails } from './game/types';

const WHINSELF_API_URL = process.env.WHINSELF_API_URL || 'https://carroll-orangy-maladroitly.ngrok-free.dev';

if (!WHINSELF_API_URL) {
    console.warn("WHINSELF_API_URL is not set. The Whinself messaging service will not be available.");
}

type WhinselfPayload = {
    jid: string;
    text?: string;
    image?: { url: string };
    video?: { url: string };
    document?: { url: string; fileName: string };
    caption?: string;
};


async function sendMessage(payload: WhinselfPayload) {
    if (!WHINSELF_API_URL) {
        console.error("Cannot send message: WHINSELF_API_URL is not configured.");
        throw new Error("WHINSELF_API_URL is not configured.");
    }
    
    const endpoint = `${WHINSELF_API_URL}/wspout`;

    try {
        const response = await fetch(endpoint, {
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
        
        const responseBody = await response.text();
        console.log('Successfully sent message to Whinself:', responseBody);
        return responseBody;

    } catch (error) {
        console.error("Failed to send message via Whinself:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during the send message request.');
    }
}


export async function sendTextMessage(toJid: string, text: string) {
    const payload: WhinselfPayload = {
        jid: toJid,
        text: text,
    };
    return sendMessage(payload);
}

export async function sendImageMessage(toJid: string, url: string, caption: string = '') {
    const payload: WhinselfPayload = {
        jid: toJid,
        image: { url: url },
        caption: caption,
    };
    return sendMessage(payload);
}

export async function sendVideoMessage(toJid: string, url: string, caption: string = '') {
    const payload: WhinselfPayload = {
        jid: toJid,
        video: { url: url },
        caption: caption,
    };
    return sendMessage(payload);
}

export async function sendDocumentMessage(toJid: string, url: string, filename: string, caption: string = '') {
     const payload: WhinselfPayload = {
        jid: toJid,
        document: { url: url, fileName: filename },
        caption: caption,
    };
    return sendMessage(payload);
}

/**
 * Dispatches a game message to the user via the Whinself service.
 * This function routes the internal Message type to the correct Whinself API format.
 * @param toUserId The recipient's user ID (e.g. '36308548589').
 * @param message The game message object to send.
 */
export async function dispatchMessage(toUserId: string, message: Message) {
    const toJid = `${toUserId}@s.whatsapp.net`;
    const { type, content, image, senderName, sender } = message;

    try {
        const senderPrefix = (sender === 'narrator' || sender === 'agent' || (sender !== 'player' && sender !== 'system')) ? `*${senderName}:*\n` : '';

        switch (type) {
            case 'text':
            case 'system':
            case 'agent':
            case 'player':
                 // For simple text messages, the content is the text.
                await sendTextMessage(toJid, `${senderPrefix}${content}`);
                break;
            
            case 'image':
                // For image messages, the URL is in `image.url` and the text is in `content`.
                if (image?.url) {
                    await sendImageMessage(toJid, image.url, `${senderPrefix}${content}`);
                } else {
                    await sendTextMessage(toJid, `${senderPrefix}[Image]: ${content}`);
                }
                break;
            
            case 'article':
                // Articles are sent as images with a caption.
                 if (image?.url) {
                    await sendImageMessage(toJid, image.url, `${senderPrefix}*${content}*`);
                } else {
                    await sendTextMessage(toJid, `${senderPrefix}[Article]: ${content}`);
                }
                break;
            
            case 'video':
                // For video messages, the URL is in `content` and there's no separate text.
                // The sender prefix serves as the caption.
                await sendVideoMessage(toJid, content, senderPrefix.trim());
                break;

            case 'audio':
                // Audio is sent as a text message with a link.
                await sendTextMessage(toJid, `${senderPrefix}[Audio]: ${content}`);
                break;

            case 'document':
                // For documents, we assume the URL is in `image.url` and filename in `content`.
                 if (image?.url) {
                    await sendDocumentMessage(toJid, image.url, content, senderPrefix.trim());
                 } else {
                     await sendTextMessage(toJid, `${senderPrefix}[Document]: ${content}`);
                 }
                break;

            default:
                // This handles custom NPC messages or other unhandled types.
                // It checks for an image and sends it, otherwise sends as text.
                if(image?.url) {
                    await sendImageMessage(toJid, image.url, `${senderPrefix}${content}`);
                } else {
                    await sendTextMessage(toJid, `${senderPrefix}${content}`);
                }
                break;
        }
    } catch (error) {
        console.error(`Failed to dispatch message ID ${message.id} to ${toUserId}:`, error);
    }
}
