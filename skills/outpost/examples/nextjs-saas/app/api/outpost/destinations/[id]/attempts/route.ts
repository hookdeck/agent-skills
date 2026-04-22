import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

/**
 * GET /api/outpost/destinations/[id]/attempts
 * Lists delivery attempts for a specific destination, including event info.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: destinationId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

  try {
    const pageIterator = await outpost.destinations.listAttempts({
      tenantId,
      destinationId,
      include: ['event'],
      limit,
    });

    let models: unknown[] = [];
    let pagination: unknown = undefined;
    for await (const page of pageIterator) {
      models = page.result?.models ?? [];
      pagination = page.result?.pagination;
      break;
    }

    return Response.json({ models, pagination });
  } catch (err) {
    console.error('[outpost] destination attempts list error', err);
    return Response.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }
}
