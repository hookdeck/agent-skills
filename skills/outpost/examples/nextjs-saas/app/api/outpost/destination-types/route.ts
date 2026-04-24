import { getOutpostTenantId } from '@/lib/outpost/auth';
import { normalizeDestinationTypesPayload } from '@/lib/outpost/destination-types-wire';

/** Managed Hookdeck Outpost REST base — verify in docs if this drifts: https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-typescript */
const DEFAULT_OUTPOST_BASE = 'https://api.outpost.hookdeck.com/2025-07-01';

function outpostApiBaseUrl(): string {
  const raw = process.env.OUTPOST_API_BASE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return DEFAULT_OUTPOST_BASE.replace(/\/$/, '');
}

function bearerHeader(apiKey: string): string {
  return apiKey.slice(0, 7).toLowerCase() === 'bearer '
    ? apiKey
    : `Bearer ${apiKey}`;
}

export async function GET() {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OUTPOST_API_KEY;
  if (!apiKey) {
    console.error('[outpost] OUTPOST_API_KEY is not set');
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    // Raw fetch preserves `key` on schema fields; the SDK model still omits it until regen.
    const res = await fetch(`${outpostApiBaseUrl()}/destination-types`, {
      method: 'GET',
      headers: {
        Authorization: bearerHeader(apiKey),
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[outpost] destination-types HTTP', res.status, body);
      return Response.json({ error: 'Failed to fetch destination types' }, { status: 500 });
    }

    const raw = await res.json();
    const types = normalizeDestinationTypesPayload(raw);
    return Response.json(types);
  } catch (err) {
    console.error('[outpost] destination-types error', err);
    return Response.json({ error: 'Failed to fetch destination types' }, { status: 500 });
  }
}
