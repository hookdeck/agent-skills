/**
 * 3-step Create Destination wizard.
 *
 * Step 1 — Choose destination type (from GET /destination-types)
 * Step 2 — Select topics (from GET /topics)
 * Step 3 — Fill type-specific config / credentials
 */

import { useMutation, useQuery } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, Webhook } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  type DestinationSchemaField,
  type DestinationType,
  outpostApi,
} from "@/lib/outpost-api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Step 1: Pick destination type
// ---------------------------------------------------------------------------

function TypeCard({
  schema,
  selected,
  onSelect,
}: {
  schema: DestinationType
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/40 w-full ${
        selected ? "border-primary bg-accent/40" : "border-border"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5 h-8 w-8 flex items-center justify-center">
        {schema.icon ? (
          <span
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from Outpost API
            dangerouslySetInnerHTML={{ __html: schema.icon }}
          />
        ) : (
          <Webhook className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{schema.label}</p>
        {schema.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {schema.description}
          </p>
        )}
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-1" />}
    </button>
  )
}

function StepPickType({
  types,
  selected,
  onSelect,
}: {
  types: DestinationType[]
  selected: string | null
  onSelect: (t: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
      {types.map((t) => (
        <TypeCard
          key={t.type}
          schema={t}
          selected={selected === t.type}
          onSelect={() => onSelect(t.type)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Select topics
// ---------------------------------------------------------------------------

function StepPickTopics({
  topics,
  selected,
  onChange,
}: {
  topics: string[]
  selected: string[]
  onChange: (topics: string[]) => void
}) {
  const allSelected = selected.includes("*")

  const toggle = (topic: string) => {
    if (topic === "*") {
      onChange(allSelected ? [] : ["*"])
      return
    }
    if (allSelected) {
      // switch from "all" to explicit list minus this one
      onChange(topics.filter((t) => t !== topic))
      return
    }
    if (selected.includes(topic)) {
      onChange(selected.filter((t) => t !== topic))
    } else {
      onChange([...selected, topic])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Choose which topics this destination should receive. Select "All topics" to
        subscribe to everything.
      </p>

      {/* All topics shortcut */}
      <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/30 transition-colors">
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => toggle("*")}
          id="topic-all"
        />
        <span className="text-sm font-medium">All topics</span>
      </label>

      {/* Individual topics */}
      <div className="flex flex-col gap-2 ml-2">
        {topics.map((topic) => (
          <label
            key={topic}
            className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <Checkbox
              checked={allSelected || selected.includes(topic)}
              onCheckedChange={() => toggle(topic)}
              id={`topic-${topic}`}
              disabled={allSelected}
            />
            <span className="text-sm font-mono">{topic}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Config / credentials form (dynamic)
// ---------------------------------------------------------------------------

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: DestinationSchemaField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`field-${field.key}`}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={`field-${field.key}`}
        type={field.sensitive ? "password" : "text"}
        placeholder={field.default ?? ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  )
}

function StepConfigure({
  schema,
  configValues,
  credValues,
  onConfigChange,
  onCredChange,
}: {
  schema: DestinationType
  configValues: Record<string, string>
  credValues: Record<string, string>
  onConfigChange: (k: string, v: string) => void
  onCredChange: (k: string, v: string) => void
}) {
  return (
    <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
      {schema.instructions && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {schema.instructions}
        </div>
      )}
      {schema.remote_setup_url && (
        <a
          href={schema.remote_setup_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Complete external setup →
        </a>
      )}
      {schema.config_fields.map((f) => (
        <ConfigField
          key={f.key}
          field={f}
          value={configValues[f.key] ?? ""}
          onChange={(v) => onConfigChange(f.key, v)}
        />
      ))}
      {schema.credential_fields.map((f) => (
        <ConfigField
          key={f.key}
          field={f}
          value={credValues[f.key] ?? ""}
          onChange={(v) => onCredChange(f.key, v)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------

const STEP_LABELS = ["Choose type", "Select topics", "Configure"]

interface CreateDestinationProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateDestination({
  open,
  onClose,
  onCreated,
}: CreateDestinationProps) {
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [credValues, setCredValues] = useState<Record<string, string>>({})

  const { data: types, isLoading: typesLoading } = useQuery({
    queryKey: ["outpost-destination-types"],
    queryFn: outpostApi.listDestinationTypes,
    enabled: open,
  })

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["outpost-topics"],
    queryFn: outpostApi.listTopics,
    enabled: open,
  })

  const schema = types?.find((t) => t.type === selectedType)

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedType || selectedTopics.length === 0) throw new Error("Invalid state")
      const config: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(configValues)) {
        if (v) config[k] = v
      }
      const credentials: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(credValues)) {
        if (v) credentials[k] = v
      }
      return outpostApi.createDestination({
        type: selectedType,
        topics: selectedTopics.length === 1 && selectedTopics[0] === "*" ? "*" : selectedTopics,
        config,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
      })
    },
    onSuccess: () => {
      toast.success("Destination created successfully")
      handleReset()
      onCreated()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleReset = () => {
    setStep(0)
    setSelectedType(null)
    setSelectedTopics([])
    setConfigValues({})
    setCredValues({})
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const canAdvance = () => {
    if (step === 0) return selectedType !== null
    if (step === 1) return selectedTopics.length > 0
    if (step === 2) {
      if (!schema) return false
      return schema.config_fields
        .filter((f) => f.required)
        .every((f) => configValues[f.key]?.trim())
    }
    return false
  }

  const handleNext = () => {
    if (step < 2) setStep(step + 1)
    else createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Event Destination</DialogTitle>
          <DialogDescription>
            Step {step + 1} of 3 — {STEP_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-2 mb-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="py-2">
          {step === 0 &&
            (typesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : types && types.length > 0 ? (
              <StepPickType
                types={types}
                selected={selectedType}
                onSelect={setSelectedType}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertCircle className="h-4 w-4" />
                No destination types available. Check your Outpost configuration.
              </div>
            ))}

          {step === 1 &&
            (topicsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topics ? (
              <StepPickTopics
                topics={topics}
                selected={selectedTopics}
                onChange={setSelectedTopics}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertCircle className="h-4 w-4" />
                Could not load topics. Check your Outpost configuration.
              </div>
            ))}

          {step === 2 &&
            (schema ? (
              <StepConfigure
                schema={schema}
                configValues={configValues}
                credValues={credValues}
                onConfigChange={(k, v) => setConfigValues((p) => ({ ...p, [k]: v }))}
                onCredChange={(k, v) => setCredValues((p) => ({ ...p, [k]: v }))}
              />
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ))}
        </div>

        <DialogFooter className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canAdvance() || createMutation.isPending}
            className="flex-1 sm:flex-none"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : step < 2 ? (
              "Next"
            ) : (
              "Create destination"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
