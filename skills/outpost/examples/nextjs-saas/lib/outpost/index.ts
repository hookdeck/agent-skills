import 'server-only';
import { outpost, toTenantId } from './client';

export { toTenantId };

/**
 * Idempotently ensures an Outpost tenant exists for the given team.
 * Call this whenever a team is created or on first contact.
 */
export async function upsertTenant(teamId: number): Promise<void> {
  try {
    await outpost.tenants.upsert(toTenantId(teamId));
  } catch (err) {
    console.error('[outpost] Failed to upsert tenant', teamId, err);
    // Non-fatal: don't block the main flow
  }
}

/**
 * Publish a typed event for a team's tenant.
 * Topic must exist in the Outpost project.
 */
export async function publishEvent(
  teamId: number,
  topic: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await outpost.publish.event({
      tenantId: toTenantId(teamId),
      topic,
      eligibleForRetry: true,
      data,
    });
  } catch (err) {
    console.error('[outpost] Failed to publish event', topic, teamId, err);
    // Non-fatal: don't block the main flow
  }
}
