/**
 * WhatsApp Business Platform (Cloud API) integration point.
 *
 * STATUS: MOCK. No network calls are made. Every function below logs what
 * it *would* send and resolves with a fake-but-realistic response so the
 * rest of the app (routes, UI, message history) can be built and tested
 * end-to-end before real credentials exist.
 *
 * IMPORTANT DESIGN NOTE
 * The Cloud API has no concept of "adding/removing a member from a group" —
 * that's a personal-WhatsApp-app feature, not something the Business
 * Platform exposes. Instead, you send individual messages to opted-in
 * phone numbers. This app treats a "class" as a distribution list and
 * "sending to the class" as looping sendTextMessage/sendMediaMessage over
 * each parent in that list (see routes/messages.js).
 *
 * WHEN YOU'RE READY TO CONNECT THE REAL API:
 * 1. Set WHATSAPP_MODE=live, plus WHATSAPP_TOKEN and
 *    WHATSAPP_PHONE_NUMBER_ID in server/.env.
 * 2. Replace the mock body of each function below with the real fetch
 *    call sketched in its comment. Function signatures are already what
 *    the rest of the app calls, so nothing else needs to change.
 * 3. Outbound-initiated messages (i.e. not a reply within 24h of the
 *    parent messaging you first) must use a pre-approved message
 *    "template". Build that approval + template-picking flow before
 *    relying on this for real parent communication.
 */

const MODE = process.env.WHATSAPP_MODE || 'mock';

function mockDelay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a plain text message to one phone number.
 * @param {{ to: string, body: string }} params
 */
export async function sendTextMessage({ to, body }) {
  if (MODE !== 'mock') {
    throw new Error('Live WhatsApp mode is not implemented in this build yet.');
  }

  console.log(`[whatsappService:MOCK] would send TEXT to ${to}: "${body}"`);
  await mockDelay();

  // REAL API SKETCH (Cloud API), once WHATSAPP_MODE=live:
  //
  // const res = await fetch(
  //   `${process.env.WHATSAPP_API_BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       messaging_product: 'whatsapp',
  //       to,
  //       type: 'text',
  //       text: { body },
  //     }),
  //   }
  // );
  // if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`);
  // return res.json();

  return { mock: true, to, status: 'queued', wa_message_id: `mock-${Date.now()}` };
}

/**
 * Send a media message (image, video, or document) to one phone number.
 * @param {{ to: string, mediaType: 'image'|'video'|'document', mediaUrl: string, caption?: string, filename?: string }} params
 */
export async function sendMediaMessage({ to, mediaType, mediaUrl, caption, filename }) {
  if (MODE !== 'mock') {
    throw new Error('Live WhatsApp mode is not implemented in this build yet.');
  }

  console.log(
    `[whatsappService:MOCK] would send ${mediaType.toUpperCase()} to ${to}: ${mediaUrl}${
      caption ? ` (caption: "${caption}")` : ''
    }`
  );
  await mockDelay();

  // REAL API SKETCH: media must first be uploaded to Meta's servers (or
  // referenced by a public URL) to get a media id, then referenced in a
  // message payload shaped like:
  // {
  //   messaging_product: 'whatsapp',
  //   to,
  //   type: mediaType, // 'image' | 'video' | 'document'
  //   [mediaType]: { link: mediaUrl, caption, filename },
  // }

  return { mock: true, to, status: 'queued', wa_message_id: `mock-${Date.now()}` };
}

/**
 * Broadcast one message to every parent phone number in a list.
 * This is the "send to class" operation used by routes/messages.js.
 * @param {{ recipients: string[], type: 'text'|'image'|'video'|'document', body?: string, mediaUrl?: string, filename?: string }} params
 */
export async function broadcastToRecipients({ recipients, type, body, mediaUrl, filename }) {
  const results = [];
  for (const to of recipients) {
    try {
      const result =
        type === 'text'
          ? await sendTextMessage({ to, body })
          : await sendMediaMessage({ to, mediaType: type, mediaUrl, caption: body, filename });
      results.push({ to, ok: true, ...result });
    } catch (err) {
      results.push({ to, ok: false, error: err.message });
    }
  }
  return results;
}

export const whatsappMode = MODE;
