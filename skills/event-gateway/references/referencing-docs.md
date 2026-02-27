# Referencing Hookdeck Documentation

Hookdeck documentation is the source of truth. Always verify claims against official docs before making Hookdeck-related assertions.

## Fetching Documentation as Markdown

Most Hookdeck doc pages are available as markdown by appending `.md`:

```
curl https://hookdeck.com/docs/connections.md
curl https://hookdeck.com/docs/filters.md
curl https://hookdeck.com/docs/authentication.md
```

## Use Case Guides

Each use case has an overview and a quickstart:

| Use case | Overview | Quickstart |
|----------|----------|------------|
| Receive webhooks | `/docs/use-cases/receive-webhooks.md` | `/docs/use-cases/receive-webhooks/quickstart.md` |
| Third-party routing | `/docs/use-cases/third-party-routing.md` | `/docs/use-cases/third-party-routing/quickstart.md` |
| Asynchronous APIs | `/docs/use-cases/asynchronous-apis.md` | `/docs/use-cases/asynchronous-apis/quickstart.md` |
| Test & debug localhost | `/docs/use-cases/test-debug-localhost.md` | `/docs/use-cases/test-debug-localhost/quickstart.md` |

## Core Reference

| Topic | Path |
|-------|------|
| Getting started | `/docs/hookdeck-basics.md` |
| Sources | `/docs/sources.md` |
| Destinations | `/docs/destinations.md` |
| Connections | `/docs/connections.md` |
| Filters | `/docs/filters.md` |
| Transformations | `/docs/transformations.md` |
| Retries | `/docs/retries.md` |
| Deduplication | `/docs/deduplication.md` |
| Authentication | `/docs/authentication.md` |
| Events & Attempts | `/docs/events.md` |
| Requests | `/docs/requests.md` |
| Issues | `/docs/issues.md` |
| Metrics | `/docs/metrics.md` |
| Bookmarks | `/docs/bookmarks.md` |

## Production (going live)

| Topic | Path | Notes |
|-------|------|--------|
| **Receive webhooks → production** | `/docs/use-cases/receive-webhooks/quickstart#deliver-to-your-production-webhook-endpoint` | Deliver to production endpoint; use with Destinations, Retries, Issue triggers for full checklist |
| **Destinations** | `/docs/destinations` | Set max delivery rate (rate limiting) on destinations |
| **Retries** | `/docs/retries` | Configure automatic retries |
| **Issue triggers** | `/docs/issue-triggers` | Define which issues trigger alerts and notifications |
| **Issues & Notifications** | `/docs/issues` | Notifications, notification channels |
| **Projects** | `/docs/projects` | Create a new project (e.g. for separate production environment) |

Hookdeck docs are the source of truth; point users and agents to these paths for production details.

## CLI Reference

| Page | Path |
|------|------|
| CLI overview (about + install + commands) | `/docs/cli.md` |
| Listen command | `/docs/cli/listen.md` |
| Connection commands | `/docs/cli/connection.md` |
| Project commands | `/docs/cli/project.md` |
| Source commands | `/docs/cli/source.md` |
| Destination commands | `/docs/cli/destination.md` |
| Transformation commands | `/docs/cli/transformation.md` |
| Request commands | `/docs/cli/request.md` |
| Event commands | `/docs/cli/event.md` |
| Attempt commands | `/docs/cli/attempt.md` |
| Metrics commands | `/docs/cli/metrics.md` |

## API Reference

The API docs are split into focused pages:

| Page | Path |
|------|------|
| API overview (auth, pagination, errors, rate limits) | `/docs/api.md` |
| Connections | `/docs/api/connections.md` |
| Sources | `/docs/api/sources.md` |
| Destinations | `/docs/api/destinations.md` |
| Rules | `/docs/api/rules.md` |
| Transformations | `/docs/api/transformations.md` |
| Issue triggers | `/docs/api/issue-triggers.md` |
| Notifications | `/docs/api/notifications.md` |
| Publish | `/docs/api/publish.md` |
| Inspect (requests, events, attempts, bookmarks, issues, metrics) | `/docs/api/inspect.md` |
| Bulk operations (retry, cancel, ignored events, requests) | `/docs/api/bulk.md` |

## OpenAPI Specification

The latest Event Gateway API spec:

```
https://api.hookdeck.com/latest/openapi
```

The `servers` section contains the current API version.

## Best Practices

1. Don't guess doc URLs -- use the paths listed above
2. All paths are relative to `https://hookdeck.com`
3. Docs are the source of truth for syntax, flags, and schemas
4. This skill provides decision guidance and patterns that docs don't cover
