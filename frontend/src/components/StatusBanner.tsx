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
      <div className="card flex items-start gap-3 px-4 py-3 text-sm text-[var(--color-ink-muted)]">
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
      <div className="flex items-start gap-3 rounded-xl border border-[rgba(251,113,133,0.35)] bg-[rgba(127,29,29,0.25)] px-4 py-3 text-sm text-[#fecdd3]">
        <WifiOff size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="m-0 font-semibold">API unavailable</p>
          <p className="m-0 mt-0.5 break-words opacity-90">
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
      <div className="flex items-start gap-3 rounded-xl border border-[rgba(251,191,36,0.35)] bg-[rgba(120,53,15,0.25)] px-4 py-3 text-sm text-[#fde68a]">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="m-0 font-semibold">Model unavailable</p>
          <p className="m-0 mt-0.5 break-words">
            {missing.map(([name]) => name).join(', ')} not trained yet. The API will not invent
            predictions — train the models on the CarDD dataset first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[rgba(52,211,153,0.3)] bg-[rgba(6,78,59,0.28)] px-4 py-3 text-sm text-[#a7f3d0]">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="m-0 font-semibold">API ready</p>
        <p className="m-0 mt-0.5">Both models are loaded and ready to analyze photos.</p>
      </div>
    </div>
  )
}
