import 'server-only';
import { Outpost } from '@hookdeck/outpost-sdk';

// Singleton Outpost admin client.
// The OUTPOST_API_KEY must be kept server-side only — never expose it to the browser.
// SDK default serverURL for Hookdeck-hosted Outpost matches official quickstarts; confirm at https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-typescript
export const outpost = new Outpost({
  apiKey: process.env.OUTPOST_API_KEY!,
});

/**
 * Map an internal team ID to an Outpost tenant ID.
 * Using a stable string prefix ensures IDs don't collide with other resources.
 */
export function toTenantId(teamId: number): string {
  return String(teamId);
}
