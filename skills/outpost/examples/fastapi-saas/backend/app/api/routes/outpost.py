"""
Outpost proxy routes — BFF pattern.

Each signed-in user is a tenant in Outpost (tenant_id = user.id).
The browser calls these endpoints; the backend forwards to Outpost using the
server-side OUTPOST_API_KEY so the admin key never reaches the client.
"""

import logging
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.api.deps import CurrentUser, get_current_active_superuser
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/outpost", tags=["outpost"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _outpost_headers() -> dict[str, str]:
    if not settings.OUTPOST_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Outpost integration is not configured (OUTPOST_API_KEY missing).",
        )
    return {
        "Authorization": f"Bearer {settings.OUTPOST_API_KEY}",
        "Content-Type": "application/json",
    }


def _base() -> str:
    return settings.OUTPOST_API_BASE_URL.rstrip("/")


def _raise_for_outpost(response: httpx.Response) -> None:
    """Re-raise Outpost errors as FastAPI HTTPExceptions."""
    if response.is_success:
        return
    try:
        detail = response.json()
    except Exception:
        detail = response.text or "Outpost API error"
    raise HTTPException(status_code=response.status_code, detail=detail)


def _upsert_tenant(tenant_id: str) -> None:
    """Best-effort tenant upsert — does not fail the request if Outpost is unavailable."""
    if not settings.OUTPOST_API_KEY:
        return
    try:
        with httpx.Client(timeout=10) as client:
            client.put(
                f"{_base()}/tenants/{tenant_id}",
                json={},
                headers=_outpost_headers(),
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Outpost tenant upsert failed for %s: %s", tenant_id, exc)


# ---------------------------------------------------------------------------
# Metadata endpoints (no tenant context needed)
# ---------------------------------------------------------------------------


@router.get("/destination-types")
def list_destination_types() -> Any:
    """Return available destination types with their config schemas."""
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{_base()}/destination-types", headers=_outpost_headers())
    _raise_for_outpost(resp)
    return resp.json()


@router.get("/topics")
def list_topics() -> Any:
    """Return topics configured in the Outpost project."""
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{_base()}/topics", headers=_outpost_headers())
    _raise_for_outpost(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Destination management (tenant-scoped)
# ---------------------------------------------------------------------------


@router.get("/destinations")
def list_destinations(current_user: CurrentUser) -> Any:
    """List all destinations for the signed-in user's tenant."""
    tenant_id = str(current_user.id)
    # No upsert here — the tenant is provisioned at signup (see _publish_user_created).
    # create_destination carries a safety-net upsert for accounts created before this
    # integration was deployed.
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{_base()}/tenants/{tenant_id}/destinations",
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.post("/destinations", status_code=201)
def create_destination(request_body: dict[str, Any], current_user: CurrentUser) -> Any:
    """Create a new destination for the signed-in user's tenant."""
    tenant_id = str(current_user.id)
    _upsert_tenant(tenant_id)
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{_base()}/tenants/{tenant_id}/destinations",
            json=request_body,
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.get("/destinations/{destination_id}")
def get_destination(destination_id: str, current_user: CurrentUser) -> Any:
    """Get a specific destination."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}",
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.put("/destinations/{destination_id}")
def update_destination(
    destination_id: str, request_body: dict[str, Any], current_user: CurrentUser
) -> Any:
    """Update a destination."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.put(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}",
            json=request_body,
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.delete("/destinations/{destination_id}", status_code=200)
def delete_destination(destination_id: str, current_user: CurrentUser) -> Any:
    """Delete a destination."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.delete(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}",
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.put("/destinations/{destination_id}/enable")
def enable_destination(destination_id: str, current_user: CurrentUser) -> Any:
    """Enable a disabled destination (Outpost uses PUT for enable/disable)."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.put(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}/enable",
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.put("/destinations/{destination_id}/disable")
def disable_destination(destination_id: str, current_user: CurrentUser) -> Any:
    """Disable a destination (Outpost uses PUT for enable/disable)."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.put(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}/disable",
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Activity: events and attempts (tenant + destination scoped)
# ---------------------------------------------------------------------------


@router.get("/destinations/{destination_id}/events")
def list_destination_events(
    destination_id: str,
    current_user: CurrentUser,
    limit: int = 50,
    next: str | None = None,
) -> Any:
    """
    List events for a specific destination.

    Uses the tenant-scoped destination attempts endpoint to derive events,
    because the global /events?destination_id filter has a known Outpost API
    issue. We call /attempts for the destination (which always works) and
    return that data; the frontend activity page uses attempts as its primary
    list anyway.
    """
    tenant_id = str(current_user.id)
    params: dict[str, Any] = {"limit": limit}
    if next:
        params["next"] = next
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}/attempts",
            params=params,
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.get("/destinations/{destination_id}/attempts")
def list_destination_attempts(
    destination_id: str,
    current_user: CurrentUser,
    limit: int = 50,
    next: str | None = None,
) -> Any:
    """List delivery attempts for a specific destination."""
    tenant_id = str(current_user.id)
    params: dict[str, Any] = {"limit": limit}
    if next:
        params["next"] = next
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{_base()}/tenants/{tenant_id}/destinations/{destination_id}/attempts",
            params=params,
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


@router.get("/events/{event_id}/attempts")
def list_event_attempts(
    event_id: str,
    current_user: CurrentUser,
) -> Any:
    """List attempts for a specific event."""
    tenant_id = str(current_user.id)
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{_base()}/attempts",
            params={"tenant_id": tenant_id, "event_id": event_id},
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Retry
# ---------------------------------------------------------------------------


@router.post("/retry")
def retry_event(request_body: dict[str, Any], current_user: CurrentUser) -> Any:
    """Manually retry a failed event delivery attempt."""
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{_base()}/retry",
            json=request_body,
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Test publish (separate from domain publishes — lets users verify destinations)
# ---------------------------------------------------------------------------


@router.post("/test-publish")
def test_publish(current_user: CurrentUser) -> Any:
    """
    Publish a test event to the current user's tenant.
    This is a separate control from domain events — only for verifying
    destination delivery from the UI.
    """
    tenant_id = str(current_user.id)
    # Tenant was provisioned at signup; no upsert needed here.
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{_base()}/publish",
            json={
                "tenant_id": tenant_id,
                "topic": "user.created",
                "eligible_for_retry": True,
                "metadata": {"source": "test-publish"},
                "data": {
                    "user_id": tenant_id,
                    "email": current_user.email,
                    "test": True,
                },
            },
            headers=_outpost_headers(),
        )
    _raise_for_outpost(resp)
    return resp.json()
