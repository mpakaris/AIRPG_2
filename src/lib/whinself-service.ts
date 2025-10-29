
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

export type SendWhatsAppOptions = {
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
    // console.log('Sending payload to Whinself:', JSON.stringify(payload, null, 2));

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
        // console.error("Failed to send message via Whinself:", error);
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
    let payload: object;

    // The order of checks is important: video, image, document, then text.
    if (videoUrl) {
        const normalizedVideoUrl = normalizeCloudinaryVideoUrl(videoUrl);
        payload = {
            jid: normalizedJid,
            video: { url: normalizedVideoUrl },
            caption: caption || text || ''
        };
         // Send text separately if it exists
        if(text) {
             await sendMessage({ jid: normalizedJid, text: text });
             payload = { jid: normalizedJid, video: { url: normalizedVideoUrl }, caption: caption || '' };
        } else {
            payload = { jid: normalizedJid, video: { url: normalizedVideoUrl }, caption: caption || '' };
        }

    } else if (imageUrl) {
        if(text) {
            await sendMessage({ jid: normalizedJid, text: text });
            payload = { jid: normalizedJid, image: { url: imageUrl }, caption: caption || '' };
        } else {
             payload = { jid: normalizedJid, image: { url: imageUrl }, caption: caption || '' };
        }
    } else if (documentUrl) {
        if(text){
            await sendMessage({ jid: normalizedJid, text: text });
            payload = { jid: normalizedJid, document: { url: documentUrl, fileName: documentFileName || 'document' }, caption: caption || '' };
        } else {
            payload = { jid: normalizedJid, document: { url: documentUrl, fileName: documentFileName || 'document' }, caption: caption || '' };
        }
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


/**
 * The Central Message Bus.
 * This function acts as a router, deciding which messaging service to use
 * based on user preferences or system defaults. For now, it only routes to Whinself (WhatsApp).
 * It correctly prepares the payload for the sendWhatsApp function.
 */
export async function dispatchMessage(toUserId: string, message: Message) {
    const { type, content, image, sender, senderName } = message;

    try {
        const hasCustomSender = sender !== 'player' && sender !== 'system';
        const senderPrefix = hasCustomSender ? `*${senderName}:*\n` : '';
        const textContent = `${senderPrefix}${content}`;

        let opts: SendWhatsAppOptions = { jid: toUserId };

        if (type === 'video') {
            opts.videoUrl = content;
            opts.text = senderPrefix.trim(); // Send sender name as text, if applicable
        } else if ((type === 'image' || type === 'article') && image?.url) {
            opts.imageUrl = image.url;
            opts.text = textContent;
        } else if (type === 'document' && image?.url) {
            opts.documentUrl = image.url;
            opts.documentFileName = content; // Filename is in content for documents
            opts.text = senderPrefix.trim();
        } else {
            opts.text = textContent;
        }

        await sendWhatsApp(opts);

    } catch (error) {
        // console.error(`Failed to dispatch message ID ${message.id} to ${toUserId}:`, error);
        // Do not re-throw here to avoid crashing the main game loop
    }
}
