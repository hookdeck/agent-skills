import { describe, it, expect } from 'vitest';
import { normalizeDestinationTypesPayload } from './destination-types-wire';

describe('normalizeDestinationTypesPayload', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeDestinationTypesPayload(null)).toEqual([]);
    expect(normalizeDestinationTypesPayload({})).toEqual([]);
  });

  it('maps snake_case API fields to camelCase', () => {
    const raw = [
      {
        type: 'webhook',
        label: 'Webhook',
        remote_setup_url: 'https://example.com/setup',
        config_fields: [
          {
            key: 'url',
            type: 'string',
            label: 'URL',
            required: true,
            sensitive: false,
          },
        ],
        credential_fields: [],
      },
    ];
    const out = normalizeDestinationTypesPayload(raw);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('webhook');
    expect(out[0].remoteSetupUrl).toBe('https://example.com/setup');
    expect(out[0].configFields?.[0].key).toBe('url');
  });
});
