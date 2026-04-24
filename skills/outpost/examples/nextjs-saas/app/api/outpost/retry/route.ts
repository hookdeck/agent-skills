import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

export async function POST(request: Request) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId, destinationId } = await request.json();
    if (!eventId || !destinationId) {
      return Response.json(
        { error: 'eventId and destinationId are required' },
        { status: 400 }
      );
    }

    const result = await outpost.attempts.retry({ eventId, destinationId });
    return Response.json(result);
  } catch (err) {
    console.error('[outpost] retry error', err);
    return Response.json({ error: 'Failed to retry event' }, { status: 500 });
  }
}
