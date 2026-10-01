import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from 'lucide-react'
import type { ModelStatus } from '../types'

interface Props {
  apiOk: boolean | null
  models: Record<string, ModelStatus> | null
  message?: string | null
}

export function StatusBanner({ apiOk, models, message }: Props) {
  if (apiOk === null) {
    return (
      <div className="panel flex items-start gap-3 px-4 py-3 text-sm text-[var(--color-ink-muted)]">
        <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-[var(--color-accent)]" />
        <div>
          <p className="m-0 font-semibold text-[var(--color-ink)]">Checking API status</p>
          <p className="m-0 mt-0.5">Connecting to the FastAPI backend…</p>
        </div>
      </div>
    )
  }

  if (!apiOk) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-danger)]">
        <WifiOff size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="m-0 font-semibold">API unavailable</p>
          <p className="m-0 mt-0.5 opacity-90 break-words">
            {message ||
              'Cannot reach the FastAPI backend. Start it with uvicorn backend.app.main:app --reload'}
          </p>
        </div>
      </div>
    )
  }

  const entries = models ? Object.entries(models) : []
  const missing = entries.filter(([, m]) => !m.available)

  if (missing.length > 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[var(--color-warn)]">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="m-0 font-semibold">Model unavailable</p>
          <p className="m-0 mt-0.5 break-words">
            {missing.map(([name]) => name).join(', ')} not trained yet. The API will not invent
            predictions — train models after obtaining the authorized CarDD dataset.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="m-0 font-semibold">API ready</p>
        <p className="m-0 mt-0.5">Both model artifacts are available for inference.</p>
      </div>
    </div>
  )
}
