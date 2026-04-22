import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

export async function GET() {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const topics = await outpost.topics.list();
    return Response.json(topics);
  } catch (err) {
    console.error('[outpost] topics error', err);
    return Response.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
