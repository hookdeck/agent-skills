/**
 * Destination Activity page — shows delivery attempts for a destination.
 *
 * Each attempt row surfaces:
 *   - event topic + event id
 *   - HTTP status code and attempt status
 *   - Timestamp
 *   - Manual retry button for failed deliveries
 *
 * The primary list is delivery attempts because that directly shows whether
 * each event reached the customer's endpoint.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { outpostApi } from "@/lib/outpost-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute(
  "/_layout/destinations/$destinationId/activity",
)({
  component: ActivityPage,
  head: () => ({
    meta: [{ title: "Destination Activity - FastAPI Template" }],
  }),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

function isSuccess(status: string, code?: string | number) {
  if (status === "success") return true
  const n = typeof code === "string" ? Number.parseInt(code, 10) : code
  return n !== undefined && n >= 200 && n < 300
}

// ---------------------------------------------------------------------------
// Attempt row
// ---------------------------------------------------------------------------

interface AttemptRowProps {
  attempt: {
    id: string
    event_id: string
    destination_id: string
    status: string
    code?: string | number
    time: string
    attempt_number?: number
    manual?: boolean
  }
  onRetry: (eventId: string, destId: string) => void
  retrying: boolean
}

function AttemptRow({ attempt, onRetry, retrying }: AttemptRowProps) {
  const ok = isSuccess(attempt.status, attempt.code)

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      {/* Status icon */}
      <div className="flex-shrink-0">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {attempt.code && (
            <Badge
              variant={ok ? "default" : "destructive"}
              className={`text-xs font-mono ${ok ? "bg-green-600" : ""}`}
            >
              HTTP {attempt.code}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            {attempt.status}
          </Badge>
          {attempt.attempt_number && attempt.attempt_number > 1 && (
            <Badge variant="secondary" className="text-xs">
              Attempt #{attempt.attempt_number}
            </Badge>
          )}
          {attempt.manual && (
            <Badge variant="secondary" className="text-xs">
              Manual retry
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{fmt(attempt.time)}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          event: {attempt.event_id}
        </p>
      </div>

      {/* Retry button — only for failed attempts */}
      {!ok && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRetry(attempt.event_id, attempt.destination_id)}
          disabled={retrying}
          title="Manually retry this delivery"
        >
          {retrying ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-3 w-3" />
          )}
          Retry
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function ActivityPage() {
  const { destinationId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: attemptsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["outpost-destination-attempts", destinationId],
    queryFn: () => outpostApi.listDestinationAttempts(destinationId, { limit: 50 }),
  })

  const { data: dest } = useQuery({
    queryKey: ["outpost-destination", destinationId],
    queryFn: () => outpostApi.getDestination(destinationId),
  })

  const retryMutation = useMutation({
    mutationFn: ({ eventId, destId }: { eventId: string; destId: string }) =>
      outpostApi.retry(eventId, destId),
    onSuccess: () => {
      toast.success("Retry queued — the event will be re-delivered shortly")
      queryClient.invalidateQueries({
        queryKey: ["outpost-destination-attempts", destinationId],
      })
    },
    onError: (err: Error) => toast.error(`Retry failed: ${err.message}`),
  })

  const attempts = attemptsData?.models ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          title="Back to destinations"
          onClick={() => navigate({ to: "/destinations" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Delivery Activity</h1>
          {dest && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{dest.type}</span>
              {" · "}
              <span className="font-mono">
                {String(
                  (dest.config as Record<string, unknown>).url ??
                    (dest.config as Record<string, unknown>).queue_url ??
                    dest.id,
                )}
              </span>
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Summary bar */}
      {attempts.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-green-600">
              {attempts.filter((a) => isSuccess(a.status, a.code)).length}
            </span>{" "}
            delivered
          </span>
          <span>
            <span className="font-medium text-destructive">
              {attempts.filter((a) => !isSuccess(a.status, a.code)).length}
            </span>{" "}
            failed
          </span>
          <span>{attempts.length} total</span>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium">Could not load activity</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : attempts.length > 0 ? (
        <div className="flex flex-col gap-3">
          {attempts.map((attempt) => (
            <AttemptRow
              key={attempt.id}
              attempt={attempt}
              onRetry={(eventId, destId) => retryMutation.mutate({ eventId, destId })}
              retrying={retryMutation.isPending}
            />
          ))}

          {attemptsData?.pagination?.next && (
            <Button variant="outline" className="w-full">
              Load more
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No deliveries yet</CardTitle>
            <CardDescription>
              Delivery attempts will appear here once events are published to this
              destination. Use the{" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => navigate({ to: "/destinations" })}
              >
                "Send test event"
              </button>{" "}
              button to trigger a delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button variant="outline" onClick={() => navigate({ to: "/destinations" })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to destinations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
