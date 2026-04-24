import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';
import { upsertTenant } from '@/lib/outpost';

export async function GET() {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const destinations = await outpost.destinations.list(tenantId);
    return Response.json(destinations);
  } catch (err) {
    console.error('[outpost] destinations list error', err);
    return Response.json({ error: 'Failed to fetch destinations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Ensure the tenant exists before creating a destination
    await outpost.tenants.upsert(tenantId);

    const destination = await outpost.destinations.create(tenantId, body);
    return Response.json(destination, { status: 201 });
  } catch (err) {
    console.error('[outpost] destination create error', err);
    return Response.json({ error: 'Failed to create destination' }, { status: 500 });
  }
}
