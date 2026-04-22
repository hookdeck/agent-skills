import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

export async function GET(request: Request) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') ?? undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

  try {
    const pageIterator = await outpost.events.list({
      tenantId,
      topic,
      limit,
    });

    // Collect first page of results
    let models: unknown[] = [];
    let pagination: unknown = undefined;
    for await (const page of pageIterator) {
      models = page.result?.models ?? [];
      pagination = page.result?.pagination;
      break;
    }

    return Response.json({ models, pagination });
  } catch (err) {
    console.error('[outpost] events list error', err);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
