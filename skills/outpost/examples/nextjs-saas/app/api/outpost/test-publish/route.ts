import { outpost } from '@/lib/outpost/client';
import { getOutpostTenantId } from '@/lib/outpost/auth';

/**
 * POST /api/outpost/test-publish
 * Publishes a test user.created event for the signed-in tenant.
 * This is a separate control from the domain signUp publish — it lets
 * customers verify their destination is wired up correctly.
 */
export async function POST() {
  const tenantId = await getOutpostTenantId();
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure tenant exists before publishing
    await outpost.tenants.upsert(tenantId);

    const result = await outpost.publish.event({
      tenantId,
      topic: 'user.created',
      eligibleForRetry: true,
      data: {
        test: true,
        message: 'This is a test event from your dashboard.',
        tenantId,
      },
    });

    return Response.json({ success: true, result });
  } catch (err) {
    console.error('[outpost] test-publish error', err);
    return Response.json({ error: 'Failed to publish test event' }, { status: 500 });
  }
}
