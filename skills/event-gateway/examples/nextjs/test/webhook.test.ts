import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

// Set test environment variables
beforeAll(() => {
  process.env.HOOKDECK_WEBHOOK_SECRET = 'test_webhook_signing_secret_123';
});

const webhookSecret = 'test_webhook_signing_secret_123';

/**
 * Generate a valid Hookdeck signature for testing.
 * Hookdeck uses HMAC SHA-256 with base64 encoding.
 */
function generateHookdeckSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
}

/**
 * Verify Hookdeck signature (same logic as in route.ts)
 */
function verifyHookdeckSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
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

describe('Hookdeck Signature Verification', () => {
  it('should validate correct signature', () => {
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });
    const signature = generateHookdeckSignature(payload, webhookSecret);

    expect(verifyHookdeckSignature(payload, signature, webhookSecret)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const payload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });

    expect(verifyHookdeckSignature(payload, 'invalid_signature', webhookSecret)).toBe(false);
  });

  it('should reject missing signature', () => {
    const payload = JSON.stringify({ type: 'test.event' });

    expect(verifyHookdeckSignature(payload, null, webhookSecret)).toBe(false);
    expect(verifyHookdeckSignature(payload, '', webhookSecret)).toBe(false);
  });

  it('should reject missing secret', () => {
    const payload = JSON.stringify({ type: 'test.event' });
    const signature = generateHookdeckSignature(payload, webhookSecret);

    expect(verifyHookdeckSignature(payload, signature, '')).toBe(false);
  });

  it('should reject tampered payload', () => {
    const originalPayload = JSON.stringify({ type: 'test.event', amount: 100 });
    const signature = generateHookdeckSignature(originalPayload, webhookSecret);
    const tamperedPayload = JSON.stringify({ type: 'test.event', amount: 999 });

    expect(verifyHookdeckSignature(tamperedPayload, signature, webhookSecret)).toBe(false);
  });

  it('should reject wrong secret', () => {
    const payload = JSON.stringify({ type: 'test.event' });
    const signature = generateHookdeckSignature(payload, 'wrong_secret');

    expect(verifyHookdeckSignature(payload, signature, webhookSecret)).toBe(false);
  });

  it('should reject hex-encoded signatures (must be base64)', () => {
    const payload = JSON.stringify({ type: 'test.event' });
    const hexSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    expect(verifyHookdeckSignature(payload, hexSignature, webhookSecret)).toBe(false);
  });
});

describe('Hookdeck Signature Generation', () => {
  it('should generate base64-encoded string', () => {
    const payload = '{"test":true}';
    const signature = generateHookdeckSignature(payload, webhookSecret);

    // Base64 string should only contain valid base64 characters
    expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should be deterministic for same input', () => {
    const payload = '{"test":true}';
    const sig1 = generateHookdeckSignature(payload, webhookSecret);
    const sig2 = generateHookdeckSignature(payload, webhookSecret);

    expect(sig1).toBe(sig2);
  });

  it('should produce different signatures for different payloads', () => {
    const sig1 = generateHookdeckSignature('{"a":1}', webhookSecret);
    const sig2 = generateHookdeckSignature('{"b":2}', webhookSecret);

    expect(sig1).not.toBe(sig2);
  });
});
