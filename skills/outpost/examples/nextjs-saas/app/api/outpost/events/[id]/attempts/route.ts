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

  const { id: eventId } = await params;

  try {
    const pageIterator = await outpost.attempts.list({
      tenantId,
      eventId,
      include: ['response_data'],
      limit: 50,
    });

    // Collect first page
    let models: unknown[] = [];
    let pagination: unknown = undefined;
    for await (const page of pageIterator) {
      models = page.result?.models ?? [];
      pagination = page.result?.pagination;
      break;
    }

    return Response.json({ models, pagination });
  } catch (err) {
    console.error('[outpost] attempts list error', err);
    return Response.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }
}
