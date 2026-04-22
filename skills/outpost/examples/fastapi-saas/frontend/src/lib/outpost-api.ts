/**
 * Thin client for the Outpost proxy endpoints on our own FastAPI backend.
 * The backend holds the OUTPOST_API_KEY; the browser only needs its own
 * session token (stored in localStorage).
 */

const API_BASE = import.meta.env.VITE_API_URL as string

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token") ?? ""
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const resp = await fetch(`${API_BASE}/api/v1/outpost${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  if (!resp.ok) {
    let detail: unknown
    try {
      detail = await resp.json()
    } catch {
      detail = await resp.text()
    }
    const message =
      typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : String(detail)
    throw new Error(message || `HTTP ${resp.status}`)
  }
  // 204 No Content
  if (resp.status === 204) return undefined as unknown as T
  return resp.json() as Promise<T>
}

// ---- Types ------------------------------------------------------------------

export interface DestinationSchemaField {
  key: string
  label: string
  type: "text" | "checkbox" | "select" | "keyvalue" | string
  required?: boolean
  description?: string
  sensitive?: boolean
  default?: string
  options?: { value: string; label: string }[]
}

export interface DestinationType {
  type: string
  label: string
  description?: string
  icon?: string
  config_fields: DestinationSchemaField[]
  credential_fields: DestinationSchemaField[]
  instructions?: string
  remote_setup_url?: string
}

export interface Destination {
  id: string
  type: string
  topics: string[] | string
  config: Record<string, unknown>
  credentials?: Record<string, unknown>
  disabled_at: string | null
  created_at: string
  updated_at: string
}

export interface OutpostEvent {
  id: string
  tenant_id: string
  topic: string
  data: Record<string, unknown>
  created_at: string
}

export interface Attempt {
  id: string
  event_id: string
  destination_id: string
  tenant_id: string
  status: string
  /** HTTP response code returned by the destination (string in Outpost API) */
  code?: string | number
  time: string
  attempt_number?: number
  manual?: boolean
}

export interface PaginatedAttempts {
  models: Attempt[]
  pagination: {
    next: string | null
    prev: string | null
    limit: number
  }
}

export interface PaginatedEvents {
  models: OutpostEvent[]
  pagination: {
    next: string | null
    prev: string | null
    limit: number
  }
}

// ---- API calls ---------------------------------------------------------------

export const outpostApi = {
  // Metadata
  listDestinationTypes: () =>
    apiFetch<DestinationType[]>("/destination-types"),

  listTopics: () => apiFetch<string[]>("/topics"),

  // Destinations
  listDestinations: () => apiFetch<Destination[]>("/destinations"),

  createDestination: (body: {
    type: string
    topics: string[] | string
    config: Record<string, unknown>
    credentials?: Record<string, unknown>
  }) =>
    apiFetch<Destination>("/destinations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getDestination: (id: string) =>
    apiFetch<Destination>(`/destinations/${id}`),

  updateDestination: (
    id: string,
    body: {
      topics?: string[] | string
      config?: Record<string, unknown>
      credentials?: Record<string, unknown>
    },
  ) =>
    apiFetch<Destination>(`/destinations/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteDestination: (id: string) =>
    apiFetch<{ success: boolean }>(`/destinations/${id}`, {
      method: "DELETE",
    }),

  enableDestination: (id: string) =>
    apiFetch<Destination>(`/destinations/${id}/enable`, { method: "PUT" }),

  disableDestination: (id: string) =>
    apiFetch<Destination>(`/destinations/${id}/disable`, { method: "PUT" }),

  // Activity
  listDestinationEvents: (
    destinationId: string,
    opts?: { limit?: number; next?: string },
  ) => {
    const params = new URLSearchParams()
    if (opts?.limit) params.set("limit", String(opts.limit))
    if (opts?.next) params.set("next", opts.next)
    const qs = params.toString() ? `?${params}` : ""
    return apiFetch<PaginatedEvents>(`/destinations/${destinationId}/events${qs}`)
  },

  listDestinationAttempts: (
    destinationId: string,
    opts?: { limit?: number; next?: string },
  ) => {
    const params = new URLSearchParams()
    if (opts?.limit) params.set("limit", String(opts.limit))
    if (opts?.next) params.set("next", opts.next)
    const qs = params.toString() ? `?${params}` : ""
    return apiFetch<PaginatedAttempts>(`/destinations/${destinationId}/attempts${qs}`)
  },

  listEventAttempts: (eventId: string) =>
    apiFetch<PaginatedAttempts>(`/events/${eventId}/attempts`),

  // Retry
  retry: (eventId: string, destinationId: string) =>
    apiFetch<{ success: boolean }>("/retry", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, destination_id: destinationId }),
    }),

  // Test publish
  testPublish: () =>
    apiFetch<{ id: string }>("/test-publish", { method: "POST" }),
}
