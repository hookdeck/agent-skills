import 'server-only';
import { Outpost } from '@hookdeck/outpost-sdk';

// Singleton Outpost admin client.
// The OUTPOST_API_KEY must be kept server-side only — never expose it to the browser.
// Default serverURL for the Hookdeck-hosted API is https://api.outpost.hookdeck.com/2025-07-01
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
