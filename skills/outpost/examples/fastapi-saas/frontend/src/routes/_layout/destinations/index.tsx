import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  PauseCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { type Destination, type DestinationType, outpostApi } from "@/lib/outpost-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import CreateDestination from "@/components/Destinations/CreateDestination"

export const Route = createFileRoute("/_layout/destinations/")({
  component: DestinationsPage,
  head: () => ({
    meta: [{ title: "Event Destinations - FastAPI Template" }],
  }),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function destinationTarget(dest: Destination): string {
  const cfg = dest.config as Record<string, string>
  return (
    cfg.url ??
    cfg.queue_url ??
    cfg.bucket ??
    cfg.stream_name ??
    dest.type
  )
}

function topicsList(topics: string[] | string): string {
  if (topics === "*" || (Array.isArray(topics) && topics[0] === "*")) return "All topics"
  if (Array.isArray(topics)) return topics.join(", ") || "—"
  return topics
}

// ---------------------------------------------------------------------------
// Type icon (best-effort, falls back to Webhook icon)
// ---------------------------------------------------------------------------

function TypeIcon({
  destType,
  types,
}: {
  destType: string
  types: DestinationType[] | undefined
}) {
  const schema = types?.find((t) => t.type === destType)
  if (schema?.icon) {
    return (
      <span
        className="h-8 w-8 flex items-center justify-center"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: icon SVG from Outpost API
        dangerouslySetInnerHTML={{ __html: schema.icon }}
      />
    )
  }
  return <Webhook className="h-5 w-5 text-muted-foreground" />
}

// ---------------------------------------------------------------------------
// Single destination row
// ---------------------------------------------------------------------------

function DestinationRow({
  dest,
  types,
  onDelete,
  onToggle,
}: {
  dest: Destination
  types: DestinationType[] | undefined
  onDelete: (id: string) => void
  onToggle: (dest: Destination) => void
}) {
  const label =
    types?.find((t) => t.type === dest.type)?.label ?? dest.type
  const isDisabled = dest.disabled_at !== null

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex-shrink-0">
        <TypeIcon destType={dest.type} types={types} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{label}</span>
          {isDisabled ? (
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          ) : (
            <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {destinationTarget(dest)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Topics: {topicsList(dest.topics)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          title={isDisabled ? "Enable" : "Disable"}
          onClick={() => onToggle(dest)}
        >
          {isDisabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          title="Delete destination"
          onClick={() => onDelete(dest.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>

        <Link to="/destinations/$destinationId/activity" params={{ destinationId: dest.id }}>
          <Button variant="ghost" size="icon" title="View activity">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete destination?</DialogTitle>
          <DialogDescription>
            This will permanently remove the destination and stop event delivery. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function DestinationsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const {
    data: destinations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["outpost-destinations"],
    queryFn: outpostApi.listDestinations,
  })

  const { data: types } = useQuery({
    queryKey: ["outpost-destination-types"],
    queryFn: outpostApi.listDestinationTypes,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => outpostApi.deleteDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outpost-destinations"] })
      toast.success("Destination deleted")
      setDeleteId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleMutation = useMutation({
    mutationFn: (dest: Destination) =>
      dest.disabled_at
        ? outpostApi.enableDestination(dest.id)
        : outpostApi.disableDestination(dest.id),
    onSuccess: (_data, dest) => {
      queryClient.invalidateQueries({ queryKey: ["outpost-destinations"] })
      toast.success(dest.disabled_at ? "Destination enabled" : "Destination disabled")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const testPublishMutation = useMutation({
    mutationFn: outpostApi.testPublish,
    onSuccess: (data) => {
      toast.success(`Test event published (id: ${data.id})`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Destinations</h1>
          <p className="text-muted-foreground">
            Manage where your platform events are delivered
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => testPublishMutation.mutate()}
            disabled={testPublishMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {testPublishMutation.isPending ? "Sending…" : "Send test event"}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add destination
          </Button>
        </div>
      </div>

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
              <p className="font-medium">Could not load destinations</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : destinations && destinations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {destinations.map((dest) => (
            <DestinationRow
              key={dest.id}
              dest={dest}
              types={types}
              onDelete={(id) => setDeleteId(id)}
              onToggle={(d) => toggleMutation.mutate(d)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-muted p-4 mb-2 w-fit">
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>No destinations yet</CardTitle>
            <CardDescription>
              Add a destination to start receiving platform events in your webhook,
              queue, or other integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first destination
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateDestination
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["outpost-destinations"] })
          setShowCreate(false)
        }}
      />

      <DeleteDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
