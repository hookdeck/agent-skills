/**
 * Normalize GET /destination-types JSON into the camelCase shape the dashboard expects.
 * The Outpost API includes `key` on each schema field; the published SDK still strips it
 * when parsing — this path keeps `key` so config/credentials payloads match the API.
 */

export type DestinationTypeFieldWire = {
  key?: string;
  type: string;
  label?: string;
  description?: string;
  required: boolean;
  sensitive?: boolean;
  default?: string;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  options?: Array<{ label: string; value: string }>;
};

export type DestinationTypeWire = {
  type?: string;
  label?: string;
  description?: string;
  icon?: string;
  instructions?: string;
  remoteSetupUrl?: string;
  configFields?: DestinationTypeFieldWire[];
  credentialFields?: DestinationTypeFieldWire[];
};

type RawField = {
  key?: string;
  type: string;
  label?: string;
  description?: string;
  required: boolean;
  sensitive?: boolean;
  default?: string;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  options?: Array<{ label: string; value: string }>;
};

type RawDestinationType = {
  type?: string;
  label?: string;
  description?: string;
  icon?: string;
  instructions?: string;
  remote_setup_url?: string;
  config_fields?: RawField[];
  credential_fields?: RawField[];
};

function mapField(f: RawField): DestinationTypeFieldWire {
  return {
    key: f.key,
    type: f.type,
    label: f.label,
    description: f.description,
    required: f.required,
    sensitive: f.sensitive,
    default: f.default,
    minlength: f.minlength,
    maxlength: f.maxlength,
    pattern: f.pattern,
    options: f.options,
  };
}

export function normalizeDestinationTypesPayload(
  raw: unknown,
): DestinationTypeWire[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item): DestinationTypeWire => {
    const t = item as RawDestinationType;
    return {
      type: t.type,
      label: t.label,
      description: t.description,
      icon: t.icon,
      instructions: t.instructions,
      remoteSetupUrl: t.remote_setup_url,
      configFields: t.config_fields?.map(mapField),
      credentialFields: t.credential_fields?.map(mapField),
    };
  });
}
