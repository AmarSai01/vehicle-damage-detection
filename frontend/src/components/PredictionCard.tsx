import type { ModelPrediction } from '../types'
import { AlertCircle, Clock3, Gauge, Loader2 } from 'lucide-react'

interface Props {
  title: string
  accent: 'cnn' | 'mnv2'
  result: ModelPrediction | null
  loading?: boolean
}

export function PredictionCard({ title, accent, result, loading }: Props) {
  const accentColor = accent === 'cnn' ? 'var(--color-cnn)' : 'var(--color-mnv2)'

  if (loading) {
    return (
      <article className="panel panel-pad min-w-0">
        <p className="section-label" style={{ color: accentColor }}>
          {title}
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Running inference…
        </p>
      </article>
    )
  }

  if (!result) {
    return (
      <article className="panel panel-pad min-w-0 border-dashed">
        <p className="section-label" style={{ color: accentColor }}>
          {title}
        </p>
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          Upload an image and click Analyze to see real model output.
        </p>
      </article>
    )
  }

  if (!result.available) {
    return (
      <article className="panel panel-pad min-w-0">
        <p className="section-label" style={{ color: accentColor }}>
          {title}
        </p>
        <div className="mt-4 flex items-start gap-2 text-[var(--color-warn)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="m-0 text-sm">
            {result.message || 'Model not available. Train this model before inference.'}
          </p>
        </div>
      </article>
    )
  }

  const confidencePct =
    result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : '—'

  return (
    <article className="panel panel-pad animate-fade-up min-w-0">
      <p className="section-label" style={{ color: accentColor }}>
        {title}
      </p>
      <h3 className="font-display mt-3 text-3xl leading-none text-[var(--color-ink)]">
        {result.class ?? '—'}
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
          <p className="m-0 flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
            <Gauge size={12} /> Confidence
          </p>
          <p className="m-0 mt-1 text-lg font-semibold">{confidencePct}</p>
          {result.confidence != null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(2, result.confidence * 100)}%`,
                  background: accentColor,
                }}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
          <p className="m-0 flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
            <Clock3 size={12} /> Inference
          </p>
          <p className="m-0 mt-1 text-lg font-semibold">
            {result.inference_time_ms != null
              ? `${result.inference_time_ms.toFixed(1)} ms`
              : '—'}
          </p>
        </div>
      </div>
      {result.probabilities && (
        <ul className="mt-4 space-y-2">
          {Object.entries(result.probabilities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([label, p]) => (
              <li key={label} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-[var(--color-ink-muted)]">{label}</span>
                  <span className="shrink-0 font-medium">{(p * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(1, p * 100)}%`,
                      background: accentColor,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </li>
            ))}
        </ul>
      )}
    </article>
  )
}
