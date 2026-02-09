// Hookdeck Event Gateway webhook handler — Express
// Adapted from: https://github.com/hookdeck/webhook-skills

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();

/**
 * Verify Hookdeck webhook signature
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - x-hookdeck-signature header value
 * @param {string} secret - Hookdeck webhook signing secret
 * @returns {boolean} - Whether signature is valid
 */
function verifyHookdeckSignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
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

// Webhook endpoint — must use raw body for signature verification
app.post('/webhooks',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-hookdeck-signature'];
    const eventId = req.headers['x-hookdeck-eventid'];
    const sourceName = req.headers['x-hookdeck-source-name'];
    const attemptCount = req.headers['x-hookdeck-attempt-count'];

    // Verify Hookdeck signature
    if (!verifyHookdeckSignature(req.body, signature, process.env.HOOKDECK_WEBHOOK_SECRET)) {
      console.error('Hookdeck signature verification failed');
      return res.status(401).send('Invalid signature');
    }

    // Parse the payload after verification
    const payload = JSON.parse(req.body.toString());

    console.log(`Received event ${eventId} from source ${sourceName} (attempt ${attemptCount})`);

    // Handle based on the original event type
    const eventType = payload.type || payload.topic || 'unknown';
    console.log(`Event type: ${eventType}`);

    // Return 200 to acknowledge receipt — Hookdeck retries on non-2xx
    res.json({ received: true, eventId });
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export for testing
module.exports = { app, verifyHookdeckSignature };

// Start server when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Webhook endpoint: POST http://localhost:${PORT}/webhooks`);
  });
}
