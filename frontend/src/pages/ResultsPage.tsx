import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComparison } from '../api/client'
import type { ComparisonData } from '../types'

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

function fmtNum(v: number | null | undefined, digits = 2, suffix = '') {
  if (v == null) return '—'
  return `${v.toFixed(digits)}${suffix}`
}

export function ResultsPage() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setComparison(await fetchComparison())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const cnn = comparison?.models?.custom_cnn
  const mnv = comparison?.models?.mobilenetv2
  const ready =
    comparison?.status === 'evaluated' &&
    cnn?.status === 'evaluated' &&
    mnv?.status === 'evaluated'

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="max-w-3xl">
        <h1 className="font-display text-4xl">Results</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Held-out CarDD test-set evaluation. Values are read from the real{' '}
          <code className="rounded bg-[var(--color-surface)] px-1 text-xs">comparison.json</code>{' '}
          artifact.
        </p>
      </section>

      {loading && <p className="text-sm text-[var(--color-ink-muted)]">Loading evaluation results…</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {!loading && !error && !ready && (
        <p className="rounded-2xl border border-dashed border-[var(--color-line)] bg-white/70 p-6 text-sm text-[var(--color-warn)]">
          {comparison?.message || 'Evaluation results will appear after training.'}
        </p>
      )}

      {ready && cnn && mnv && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: 'Custom CNN', m: cnn, accent: 'var(--color-cnn)' },
              { title: 'MobileNetV2', m: mnv, accent: 'var(--color-mnv2)' },
            ].map(({ title, m, accent }) => (
              <article
                key={title}
                className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
                  {title}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Accuracy</dt>
                    <dd className="font-semibold">{fmtPct(m.accuracy)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Precision (macro)</dt>
                    <dd className="font-semibold">{fmtPct(m.precision)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Recall (macro)</dt>
                    <dd className="font-semibold">{fmtPct(m.recall)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">F1 (macro)</dt>
                    <dd className="font-semibold">{fmtPct(m.f1)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Inference time</dt>
                    <dd className="font-semibold">{fmtNum(m.inference_time_ms, 2, ' ms')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Model size</dt>
                    <dd className="font-semibold">{fmtNum(m.model_size_mb, 2, ' MB')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-muted)]">Parameters</dt>
                    <dd className="font-semibold">{m.parameters?.toLocaleString() ?? '—'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <section className="rounded-2xl border border-[var(--color-line)] bg-white/85 p-6 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            <h2 className="font-display text-2xl text-[var(--color-ink)]">How to read these metrics</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--color-ink)]">Accuracy</strong> is overall correct
                predictions on the held-out test split.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Precision / Recall / F1 (macro)</strong>{' '}
                average per-class scores equally — important because CarDD classes are imbalanced
                (e.g. crack is rare under the image-level label policy).
              </li>
              <li>
                In this experiment, <strong className="text-[var(--color-ink)]">MobileNetV2</strong>{' '}
                achieved higher test accuracy ({fmtPct(mnv.accuracy)}) than the Custom CNN (
                {fmtPct(cnn.accuracy)}), with a much smaller file size. That does not mean it is
                universally superior for every deployment constraint.
              </li>
              <li>
                The Custom CNN remains a useful academic baseline: it is trained from scratch
                without ImageNet weights, so the comparison isolates transfer learning benefits.
              </li>
            </ul>
            <p className="mt-4">
              Explore interactive charts on the{' '}
              <Link to="/compare" className="text-[var(--color-accent)] underline">
                Comparison
              </Link>{' '}
              page or run live inference in the{' '}
              <Link to="/analyze" className="text-[var(--color-accent)] underline">
                Analyzer
              </Link>
              .
            </p>
          </section>
        </>
      )}
    </div>
  )
}
