"""
Standalone tests for Outpost BFF error mapping.

Kept at backend/ (not under tests/) so template tests/conftest.py does not run
(session DB fixture would require PostgreSQL).
Mirrors logic in app.api.routes.outpost._raise_for_outpost — keep in sync if that changes.
"""

import httpx
import pytest
from fastapi import HTTPException


def raise_for_outpost_response(response: httpx.Response) -> None:
    if response.is_success:
        return
    try:
        detail = response.json()
    except Exception:
        detail = response.text or "Outpost API error"
    raise HTTPException(status_code=response.status_code, detail=detail)


def test_raise_for_outpost_success() -> None:
    resp = httpx.Response(200, json={"ok": True})
    raise_for_outpost_response(resp)


def test_raise_for_outpost_json_body() -> None:
    resp = httpx.Response(422, json={"error": "invalid"})
    with pytest.raises(HTTPException) as exc:
        raise_for_outpost_response(resp)
    assert exc.value.status_code == 422
    assert exc.value.detail == {"error": "invalid"}


def test_raise_for_outpost_text_body() -> None:
    resp = httpx.Response(502, text="bad gateway")
    with pytest.raises(HTTPException) as exc:
        raise_for_outpost_response(resp)
    assert exc.value.status_code == 502
    assert exc.value.detail == "bad gateway"
