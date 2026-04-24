'use client';

import { use, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Destination {
  id?: string;
  type?: string;
  topics?: string[];
  target?: string;
  disabled?: boolean;
}

interface EventSummary {
  id?: string;
  topic?: string;
  time?: string;
}

interface Attempt {
  id?: string;
  status?: string;
  code?: string;
  time?: string;
  attemptNumber?: number;
  manual?: boolean;
  destinationId?: string;
  eventId?: string;
  event?: EventSummary | null;
}

interface AttemptsResponse {
  models: Attempt[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Status icon helper
// ──────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" /> pending
      </span>
    );
  }
  const s = status.toLowerCase();
  if (s === 'successful' || s === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" /> {status}
      </span>
    );
  }
  if (s === 'failed' || s === 'failure') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
      <Clock className="h-3 w-3" /> {status}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Attempt row with inline retry
// ──────────────────────────────────────────────────────────────────────────────
function AttemptRow({
  attempt,
  destinationId,
  onRetried,
}: {
  attempt: Attempt;
  destinationId: string;
  onRetried: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const isFailed =
    attempt.status?.toLowerCase() === 'failed' ||
    attempt.status?.toLowerCase() === 'failure';

  async function handleRetry() {
    if (!attempt.eventId) return;
    setRetrying(true);
    try {
      await fetch('/api/outpost/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: attempt.eventId,
          destinationId: attempt.destinationId ?? destinationId,
        }),
      });
      onRetried();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
        {attempt.eventId?.slice(0, 8)}…
      </td>
      <td className="py-3 px-4 text-sm">
        {attempt.event?.topic ?? '—'}
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {attempt.time ? new Date(attempt.time).toLocaleString() : '—'}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={attempt.status} />
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        #{attempt.attemptNumber}
        {attempt.manual && ' (manual)'}
        {attempt.code && ` · ${attempt.code}`}
      </td>
      <td className="py-3 px-4 text-right">
        {isFailed && (
          <Button
            size="sm"
            variant="outline"
            disabled={retrying}
            onClick={handleRetry}
          >
            {retrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        )}
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const attemptsKey = `/api/outpost/destinations/${id}/attempts`;

  const { data: destination, isLoading: destLoading } = useSWR<Destination>(
    `/api/outpost/destinations/${id}`,
    fetcher
  );

  const {
    data: attemptsData,
    isLoading: attemptsLoading,
    mutate: mutateAttempts,
  } = useSWR<AttemptsResponse>(attemptsKey, fetcher);

  const attempts = attemptsData?.models ?? [];

  return (
    <section className="flex-1 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/destinations"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Destinations
        </Link>

        {destLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div>
            <h1 className="text-lg lg:text-2xl font-medium text-gray-900 capitalize">
              {destination?.type ?? 'Destination'}
              {destination?.disabled && (
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  (disabled)
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {destination?.target && (
                <>Target: {destination.target} &middot; </>
              )}
              Topics:{' '}
              {destination?.topics && destination.topics.length > 0
                ? destination.topics.join(', ')
                : '*'}
            </p>
          </div>
        )}
      </div>

      {/* Delivery attempts table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Delivery Attempts</CardTitle>
          <Button size="sm" variant="outline" onClick={() => mutateAttempts()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {attemptsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading attempts…
            </div>
          ) : attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">
              No delivery attempts yet. Send a test event from the Destinations
              page to verify this destination.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-xs font-medium text-muted-foreground">
                      Event ID
                    </th>
                    <th className="py-2 px-4 text-xs font-medium text-muted-foreground">
                      Topic
                    </th>
                    <th className="py-2 px-4 text-xs font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="py-2 px-4 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-2 px-4 text-xs font-medium text-muted-foreground">
                      Attempt
                    </th>
                    <th className="py-2 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <AttemptRow
                      key={attempt.id}
                      attempt={attempt}
                      destinationId={id}
                      onRetried={() => mutateAttempts()}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
