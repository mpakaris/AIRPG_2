
'use server';

import type { Message } from './game/types';

const WHINSELF_API_URL = process.env.WHINSELF_API_URL || 'https://carroll-orangy-maladroitly.ngrok-free.dev';

if (!WHINSELF_API_URL) {
    console.warn("WHINSELF_API_URL is not set. The Whinself messaging service will not be available.");
}

// --- Internal Core Functions ---

/**
 * Normalizes a phone number to the required JID format.
 * e.g., "+49123..." or "0049123..." becomes "49123..._at_s.whatsapp.net"
 */
function normalizeJid(jid: string): string {
    const digits = jid.replace(/^\++|^00+/, '');
    return `${digits}@s.whatsapp.net`;
}

/**
 * Transforms a Cloudinary .mov video URL to a WhatsApp-compatible .mp4 URL.
 */
function normalizeCloudinaryVideoUrl(videoUrl: string): string {
    if (videoUrl.includes('/video/upload/') && videoUrl.toLowerCase().endsWith('.mov')) {
        const newUrl = videoUrl.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,ac_aac/');
        // Ensure the extension is .mp4
        return newUrl.replace(/\.mov$/i, '.mp4');
    }
    return videoUrl;
}

type SendWhatsAppOptions = {
    jid: string;
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    documentUrl?: string;
    documentFileName?: string;
    caption?: string;
};

/**
 * Sends a raw JSON payload to the Whinself interceptor endpoint.
 */
async function sendMessage(payload: object) {
    if (!WHINSELF_API_URL) {
        console.error("Cannot send message: WHINSELF_API_URL is not configured.");
        throw new Error("WHINSELF_API_URL is not configured.");
    }
    
    const endpoint = `${WHINSELF_API_URL}/wspout`;
    console.log('Sending payload to Whinself:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Whinself API responded with status ${response.status}: ${errorBody}`);
        }
        
        const responseBody = await response.text();
        return responseBody;

    } catch (error) {
        console.error("Failed to send message via Whinself:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during the send message request.');
    }
}


/**
 * The core function to prepare and send a message via WhatsApp.
 * It handles JID and URL normalization, and shapes the payload correctly.
 */
async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<any> {
    const { jid, text, imageUrl, videoUrl, documentUrl, documentFileName, caption } = opts;

    if (!jid) {
        throw new Error("JID is required to send a WhatsApp message.");
    }
    if (!text && !imageUrl && !videoUrl && !documentUrl) {
        throw new Error("Cannot send an empty message. At least one of text, imageUrl, videoUrl, or documentUrl must be provided.");
    }

    const normalizedJid = normalizeJid(jid);
    const finalCaption = caption || text || '';

    let payload: object;

    if (videoUrl) {
        const normalizedVideoUrl = normalizeCloudinaryVideoUrl(videoUrl);
        payload = {
            jid: normalizedJid,
            video: { url: normalizedVideoUrl },
            caption: finalCaption
        };
    } else if (imageUrl) {
        payload = {
            jid: normalizedJid,
            image: { url: imageUrl },
            caption: finalCaption
        };
    } else if (documentUrl) {
        payload = {
            jid: normalizedJid,
            document: { url: documentUrl, fileName: documentFileName || 'document' },
            caption: finalCaption
        };
    } else if (text) {
        payload = {
            jid: normalizedJid,
            text: text
        };
    } else {
         throw new Error("Invalid message options provided.");
    }

    return sendMessage(payload);
}


// --- Public API ---

export async function sendTextMessage(toJid: string, text: string) {
    return sendWhatsApp({ jid: toJid, text });
}

export async function sendImageMessage(toJid: string, url: string, caption: string = '') {
    return sendWhatsApp({ jid: toJid, imageUrl: url, caption });
}

export async function sendVideoMessage(toJid: string, url: string, caption: string = '') {
    return sendWhatsApp({ jid: toJid, videoUrl: url, caption });
}

export async function sendDocumentMessage(toJid: string, url: string, filename: string, caption: string = '') {
     return sendWhatsApp({ jid: toJid, documentUrl: url, documentFileName: filename, caption });
}


/**
 * Dispatches a game message to the user via the Whinself service.
 * This function routes the internal Message type to the correct Whinself API format.
 */
export async function dispatchMessage(toUserId: string, message: Message) {
    const { type, content, image, sender, senderName } = message;

    try {
        const isMediaMessage = ['image', 'video', 'article', 'document'].includes(type);
        const hasCustomSender = sender !== 'player' && sender !== 'system';
        const senderPrefix = hasCustomSender ? `*${senderName}:*\n` : '';

        const options: SendWhatsAppOptions = {
            jid: toUserId,
        };

        switch (type) {
            case 'video':
                options.videoUrl = content; // The URL is in the content
                options.caption = senderPrefix.trim(); // No other text, just the sender
                break;
            
            case 'image':
            case 'article':
                if (image?.url) {
                    options.imageUrl = image.url;
                    options.caption = `${senderPrefix}${content}`;
                } else {
                    options.text = `${senderPrefix}[Image]: ${content}`;
                }
                break;
                
            case 'document':
                 if (image?.url) {
                    options.documentUrl = image.url;
                    options.documentFileName = content;
                    options.caption = senderPrefix.trim();
                 } else {
                     options.text = `${senderPrefix}[Document]: ${content}`;
                 }
                break;

            case 'audio':
                // Audio is not a media type in Whinself, send as a text link
                options.text = `${senderPrefix}[Audio]: ${content}`;
                break;

            case 'text':
            case 'system':
            case 'player':
            case 'agent':
            default: // Includes custom NPC messages
                 if(image?.url) {
                    options.imageUrl = image.url;
                    options.caption = `${senderPrefix}${content}`;
                } else {
                    options.text = `${senderPrefix}${content}`;
                }
                break;
        }

        await sendWhatsApp(options);

    } catch (error) {
        console.error(`Failed to dispatch message ID ${message.id} to ${toUserId}:`, error);
    }
}
