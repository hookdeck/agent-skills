import 'server-only';
import { getUser } from '@/lib/db/queries';
import { getUserWithTeam } from '@/lib/db/queries';
import { toTenantId } from './client';

/**
 * Resolves the signed-in user's Outpost tenant ID from their team membership.
 * Returns null if the user is not authenticated or not in a team.
 */
export async function getOutpostTenantId(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) return null;

  return toTenantId(userWithTeam.teamId);
}
