// Hookdeck Event Gateway webhook handler — Next.js App Router
// Adapted from: https://github.com/hookdeck/webhook-skills

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Verify Hookdeck webhook signature
 */
function verifyHookdeckSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Get the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('x-hookdeck-signature');
  const eventId = request.headers.get('x-hookdeck-eventid');
  const sourceName = request.headers.get('x-hookdeck-source-name');
  const attemptCount = request.headers.get('x-hookdeck-attempt-count');

  // Verify Hookdeck signature
  if (!verifyHookdeckSignature(body, signature, process.env.HOOKDECK_WEBHOOK_SECRET!)) {
    console.error('Hookdeck signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Parse the payload after verification
  const payload = JSON.parse(body);

  console.log(`Received event ${eventId} from source ${sourceName} (attempt ${attemptCount})`);

  // Handle based on the original event type
  const eventType = payload.type || payload.topic || 'unknown';
  console.log(`Event type: ${eventType}`);

  // Return 200 to acknowledge receipt — Hookdeck retries on non-2xx
  return NextResponse.json({ received: true, eventId });
}
