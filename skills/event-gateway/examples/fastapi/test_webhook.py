import hmac
import hashlib
import base64
import json
import os

import pytest
from fastapi.testclient import TestClient

os.environ["HOOKDECK_WEBHOOK_SECRET"] = "test_webhook_signing_secret_123"

from main import app, verify_hookdeck_signature

client = TestClient(app)

TEST_SECRET = "test_webhook_signing_secret_123"
TEST_PAYLOAD = json.dumps(
    {"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_123", "amount": 2000}}}
)


def compute_signature(body: str, secret: str) -> str:
    return base64.b64encode(
        hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8")


class TestVerifyHookdeckSignature:
    def test_valid_signature(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        assert verify_hookdeck_signature(raw_body, signature, TEST_SECRET) is True

    def test_invalid_signature(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        assert verify_hookdeck_signature(raw_body, "bad_signature", TEST_SECRET) is False

    def test_missing_signature(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        assert verify_hookdeck_signature(raw_body, None, TEST_SECRET) is False
        assert verify_hookdeck_signature(raw_body, "", TEST_SECRET) is False

    def test_missing_secret(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        assert verify_hookdeck_signature(raw_body, signature, None) is False
        assert verify_hookdeck_signature(raw_body, signature, "") is False

    def test_wrong_secret(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        assert verify_hookdeck_signature(raw_body, signature, "wrong_secret") is False

    def test_tampered_body(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        tampered = b'{"tampered": true}'
        assert verify_hookdeck_signature(tampered, signature, TEST_SECRET) is False

    def test_base64_not_hex(self):
        raw_body = TEST_PAYLOAD.encode("utf-8")
        hex_signature = hmac.new(
            TEST_SECRET.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        # Hex signature should NOT verify -- Hookdeck uses base64
        assert verify_hookdeck_signature(raw_body, hex_signature, TEST_SECRET) is False


class TestWebhookEndpoint:
    def test_valid_signature_returns_200(self):
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        response = client.post(
            "/webhooks",
            content=TEST_PAYLOAD,
            headers={
                "Content-Type": "application/json",
                "x-hookdeck-signature": signature,
                "x-hookdeck-eventid": "evt_test_123",
                "x-hookdeck-source-name": "test-source",
                "x-hookdeck-attempt-count": "1",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["received"] is True
        assert body["eventId"] == "evt_test_123"

    def test_invalid_signature_returns_401(self):
        response = client.post(
            "/webhooks",
            content=TEST_PAYLOAD,
            headers={
                "Content-Type": "application/json",
                "x-hookdeck-signature": "invalid_signature",
            },
        )
        assert response.status_code == 401

    def test_missing_signature_returns_401(self):
        response = client.post(
            "/webhooks",
            content=TEST_PAYLOAD,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 401

    def test_raw_body_verification(self):
        # Signature is computed over exact bytes, not re-serialized JSON
        signature = compute_signature(TEST_PAYLOAD, TEST_SECRET)
        response = client.post(
            "/webhooks",
            content=TEST_PAYLOAD,
            headers={
                "Content-Type": "application/json",
                "x-hookdeck-signature": signature,
                "x-hookdeck-eventid": "evt_raw_test",
            },
        )
        assert response.status_code == 200


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
