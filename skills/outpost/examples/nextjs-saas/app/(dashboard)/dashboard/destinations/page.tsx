'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  PlusCircle,
  Trash2,
  ExternalLink,
  Send,
  ChevronRight,
  Webhook,
} from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ──────────────────────────────────────────────────────────────────────────────
// Types (mirroring Outpost SDK shapes)
// ──────────────────────────────────────────────────────────────────────────────
interface DestinationTypeField {
  /** Wire key for `config` / `credentials` (from API; SDK may omit until regen). */
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
}

interface DestinationType {
  type?: string;
  label?: string;
  description?: string;
  icon?: string;
  remoteSetupUrl?: string;
  instructions?: string;
  configFields?: DestinationTypeField[];
  credentialFields?: DestinationTypeField[];
}

interface Destination {
  id?: string;
  type?: string;
  topics?: string[];
  target?: string;
  disabled?: boolean;
}

function wireKeyFromLabel(label?: string): string {
  return (label ?? '').toLowerCase().replace(/\s+/g, '_');
}

/** Property name inside destination `config` / `credentials` (prefer API `key`). */
function schemaFieldWireKey(field: DestinationTypeField): string {
  if (field.key && field.key.length > 0) {
    return field.key;
  }
  return wireKeyFromLabel(field.label);
}

// ──────────────────────────────────────────────────────────────────────────────
// Destination list
// ──────────────────────────────────────────────────────────────────────────────
function DestinationList({
  onAdd,
  onTestPublish,
}: {
  onAdd: () => void;
  onTestPublish: () => void;
}) {
  const { data: destinations, isLoading } = useSWR<Destination[]>(
    '/api/outpost/destinations',
    fetcher
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/outpost/destinations/${id}`, { method: 'DELETE' });
      mutate('/api/outpost/destinations');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Event Destinations</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onTestPublish}
            title="Send a test user.created event to all destinations"
          >
            <Send className="h-4 w-4 mr-2" />
            Test Event
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onAdd}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading destinations…
          </div>
        ) : !destinations || destinations.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            No destinations yet. Add one to start receiving events.
          </p>
        ) : (
          <ul className="divide-y">
            {destinations.map((dest) => (
              <li
                key={dest.id}
                className="flex items-center justify-between py-3"
              >
                <Link
                  href={`/dashboard/destinations/${dest.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:underline"
                >
                  <Webhook className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm capitalize truncate">
                      {dest.type}
                      {dest.disabled && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (disabled)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {dest.target || dest.id}
                    </p>
                    {dest.topics && dest.topics.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Topics: {dest.topics.join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 ml-3 shrink-0"
                  disabled={deletingId === dest.id}
                  onClick={() => dest.id && handleDelete(dest.id)}
                >
                  {deletingId === dest.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Create destination wizard (3 steps: type → topics → config)
// ──────────────────────────────────────────────────────────────────────────────
type WizardStep = 'type' | 'topics' | 'config';

function CreateDestinationWizard({ onDone }: { onDone: () => void }) {
  const { data: destTypes, isLoading: typesLoading } = useSWR<DestinationType[]>(
    '/api/outpost/destination-types',
    fetcher
  );
  const { data: topics, isLoading: topicsLoading } = useSWR<string[]>(
    '/api/outpost/topics',
    fetcher
  );

  const [step, setStep] = useState<WizardStep>('type');
  const [selectedType, setSelectedType] = useState<DestinationType | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleSubmit() {
    if (!selectedType?.type) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        type: selectedType.type,
        topics: selectedTopics.length > 0 ? selectedTopics : ['*'],
        config: configValues,
      };
      if (Object.keys(credValues).length > 0) {
        body.credentials = credValues;
      }

      const res = await fetch('/api/outpost/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create destination');
      }

      mutate('/api/outpost/destinations');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  // Step 1: Choose destination type
  if (step === 'type') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Destination — Choose Type</CardTitle>
        </CardHeader>
        <CardContent>
          {typesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading types…
            </div>
          ) : (
            <ul className="space-y-2">
              {(destTypes ?? []).map((dt) => (
                <li key={dt.type}>
                  <button
                    type="button"
                    className="w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedType(dt);
                      // Pre-fill defaults
                      const defaults: Record<string, string> = {};
                      for (const f of dt.configFields ?? []) {
                        if (f.default !== undefined) {
                          const k = schemaFieldWireKey(f);
                          if (k) defaults[k] = f.default;
                        }
                      }
                      setConfigValues(defaults);
                      setStep('topics');
                    }}
                  >
                    <p className="font-medium text-sm">{dt.label ?? dt.type}</p>
                    {dt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dt.description}
                      </p>
                    )}
                    {dt.remoteSetupUrl && (
                      <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Managed setup available
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" className="mt-4" onClick={onDone}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Choose topics
  if (step === 'topics') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Add Destination — Topics for {selectedType?.label ?? selectedType?.type}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topicsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading topics…
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Select topics to subscribe to. Leave empty to receive all topics.
              </p>
              {(topics ?? []).map((topic) => (
                <label key={topic} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic)}
                    onChange={() => toggleTopic(topic)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{topic}</span>
                </label>
              ))}
              {(!topics || topics.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No topics configured — destination will receive all events.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setStep('type')}>
              Back
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setStep('config')}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Configure
  const allFields = [
    ...(selectedType?.configFields?.map((f) => ({ ...f, group: 'config' as const })) ?? []),
    ...(selectedType?.credentialFields?.map((f) => ({
      ...f,
      group: 'credentials' as const,
    })) ?? []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Add Destination — Configure {selectedType?.label ?? selectedType?.type}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedType?.remoteSetupUrl ? (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              This destination type supports a managed setup flow.
            </p>
            <a
              href={selectedType.remoteSetupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open managed setup
            </a>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {allFields.map((field, index) => {
            const inputName = schemaFieldWireKey(field);
            const reactKey = `${field.group}-${inputName || index}`;
            const value =
              field.group === 'config'
                ? configValues[inputName] ?? ''
                : credValues[inputName] ?? '';
            const setValue = (v: string) => {
              if (field.group === 'config') {
                setConfigValues((prev) => ({ ...prev, [inputName]: v }));
              } else {
                setCredValues((prev) => ({ ...prev, [inputName]: v }));
              }
            };

            return (
              <div key={reactKey}>
                <Label htmlFor={reactKey} className="mb-1 flex items-center gap-1">
                  {field.label ?? inputName}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.group === 'credentials' && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (secret)
                    </span>
                  )}
                </Label>
                <Input
                  id={reactKey}
                  type={field.sensitive ? 'password' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required={field.required}
                  minLength={field.minlength}
                  maxLength={field.maxlength}
                  pattern={field.pattern}
                  placeholder={field.default ?? field.label}
                />
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {field.description}
                  </p>
                )}
              </div>
            );
          })}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('topics')}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Destination'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function DestinationsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  async function handleTestPublish() {
    setTestStatus('sending');
    try {
      const res = await fetch('/api/outpost/test-publish', { method: 'POST' });
      setTestStatus(res.ok ? 'ok' : 'error');
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-2">
        Event Destinations
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage where your platform events are delivered (webhooks, queues, and more).
      </p>

      {testStatus === 'ok' && (
        <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
          Test event published successfully! Check your destination for delivery.
        </div>
      )}
      {testStatus === 'error' && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          Failed to publish test event. Check the server logs.
        </div>
      )}
      {testStatus === 'sending' && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending test event…
        </div>
      )}

      {showWizard ? (
        <CreateDestinationWizard onDone={() => setShowWizard(false)} />
      ) : (
        <DestinationList
          onAdd={() => setShowWizard(true)}
          onTestPublish={handleTestPublish}
        />
      )}
    </section>
  );
}
