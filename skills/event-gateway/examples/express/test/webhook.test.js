const request = require('supertest');
const crypto = require('crypto');

// Set test environment variable before importing app
process.env.HOOKDECK_WEBHOOK_SECRET = 'test_webhook_signing_secret_123';

const { app } = require('../src/index');

const webhookSecret = process.env.HOOKDECK_WEBHOOK_SECRET;

/**
 * Generate a valid Hookdeck signature for testing.
 * Hookdeck uses HMAC SHA-256 with base64 encoding.
 */
function generateHookdeckSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
}

describe('Hookdeck Webhook Endpoint', () => {
  describe('POST /webhooks', () => {
    it('should return 401 for missing signature', async () => {
      const response = await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .send('{}');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid signature', async () => {
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      });

      const response = await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hookdeck-signature', 'invalid_signature')
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should return 401 for tampered payload', async () => {
      const originalPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      });

      // Sign with original payload but send different payload
      const signature = generateHookdeckSignature(originalPayload, webhookSecret);
      const tamperedPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_tampered' } },
      });

      const response = await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hookdeck-signature', signature)
        .send(tamperedPayload);

      expect(response.status).toBe(401);
    });

    it('should return 200 for valid signature', async () => {
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_valid' } },
      });
      const signature = generateHookdeckSignature(payload, webhookSecret);

      const response = await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hookdeck-signature', signature)
        .set('x-hookdeck-eventid', 'evt_test_123')
        .set('x-hookdeck-source-name', 'test-source')
        .set('x-hookdeck-attempt-count', '1')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true, eventId: 'evt_test_123' });
    });

    it('should reject hex-encoded signatures (must be base64)', async () => {
      const payload = JSON.stringify({ type: 'test.event' });
      const hexSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hookdeck-signature', hexSignature)
        .send(payload);

      expect(response.status).toBe(401);
    });

    it('should handle different event types', async () => {
      const eventTypes = [
        'payment_intent.succeeded',
        'order.created',
        'push',
        'unknown.event.type',
      ];

      for (const eventType of eventTypes) {
        const payload = JSON.stringify({
          type: eventType,
          data: { object: { id: 'obj_123' } },
        });
        const signature = generateHookdeckSignature(payload, webhookSecret);

        const response = await request(app)
          .post('/webhooks')
          .set('Content-Type', 'application/json')
          .set('x-hookdeck-signature', signature)
          .set('x-hookdeck-eventid', `evt_${eventType.replace(/\./g, '_')}`)
          .send(payload);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
