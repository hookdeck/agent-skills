import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: destinationId } = await params;

  try {
    const destination = await outpost.destinations.get(tenantId, destinationId);
    return Response.json(destination);
  } catch (err) {
    console.error('[outpost] destination get error', err);
    return Response.json({ error: 'Failed to fetch destination' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: destinationId } = await params;

  try {
    await outpost.destinations.delete(tenantId, destinationId);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[outpost] destination delete error', err);
    return Response.json({ error: 'Failed to delete destination' }, { status: 500 });
  }
}
