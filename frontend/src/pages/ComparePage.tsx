import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchComparison } from '../api/client'
import { ComparisonTable } from '../components/ComparisonTable'
import { PageHeader } from '../components/PageHeader'
import { CLASS_SUPPORT, LABEL_STRATEGY, SPLIT_COUNTS } from '../data/academicFacts'
import type { ComparisonData } from '../types'

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null
  return Number((v * 100).toFixed(2))
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

export function ComparePage() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchComparison()
        setComparison(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comparison')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const chartRows = useMemo(() => {
    const cnn = comparison?.models?.custom_cnn
    const mnv = comparison?.models?.mobilenetv2
    if (!cnn || !mnv || cnn.status !== 'evaluated' || mnv.status !== 'evaluated') return []
    return [
      {
        metric: 'Accuracy',
        'Custom CNN': pct(cnn.accuracy),
        MobileNetV2: pct(mnv.accuracy),
      },
      {
        metric: 'Precision',
        'Custom CNN': pct(cnn.precision),
        MobileNetV2: pct(mnv.precision),
      },
      {
        metric: 'Recall',
        'Custom CNN': pct(cnn.recall),
        MobileNetV2: pct(mnv.recall),
      },
      {
        metric: 'F1',
        'Custom CNN': pct(cnn.f1),
        MobileNetV2: pct(mnv.f1),
      },
    ]
  }, [comparison])

  const latencyRows = useMemo(() => {
    const cnn = comparison?.models?.custom_cnn
    const mnv = comparison?.models?.mobilenetv2
    if (!cnn || !mnv || cnn.status !== 'evaluated' || mnv.status !== 'evaluated') return []
    return [
      {
        metric: 'Inference (ms)',
        'Custom CNN': Number(cnn.inference_time_ms?.toFixed(2) ?? 0),
        MobileNetV2: Number(mnv.inference_time_ms?.toFixed(2) ?? 0),
      },
    ]
  }, [comparison])

  const cnn = comparison?.models?.custom_cnn
  const mnv = comparison?.models?.mobilenetv2
  const evaluated =
    comparison?.status === 'evaluated' &&
    cnn?.status === 'evaluated' &&
    mnv?.status === 'evaluated'

  return (
    <div className="page-shell section-stack">
      <PageHeader
        title="Model Comparison"
        subtitle={
          <>
            Custom CNN vs MobileNetV2 on the same held-out CarDD test split ({SPLIT_COUNTS.test}{' '}
            images). Metrics are loaded from the evaluation artifact (
            <code className="rounded bg-[var(--color-surface)] px-1 text-xs">comparison.json</code>
            ). No fabricated numbers are shown.
          </>
        }
      />

      {evaluated && cnn && mnv && (
        <section className="panel panel-pad">
          <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">How to read this comparison</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            In this experiment MobileNetV2 reaches higher test accuracy ({fmtPct(mnv.accuracy)}) than
            the Custom CNN ({fmtPct(cnn.accuracy)}), with a much smaller file size. That result is
            specific to <strong className="text-[var(--color-ink)]">these evaluation artifacts</strong>{' '}
            and should <strong className="text-[var(--color-ink)]">not</strong> be claimed as universal
            superiority for every dataset, hardware target, or deployment constraint.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">Accuracy</dt>
              <dd className="mt-1">
                Share of all test images predicted correctly. Sensitive to class imbalance when some
                classes dominate the set.
              </dd>
            </div>
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">Precision (macro)</dt>
              <dd className="mt-1">
                Of images predicted as a class, how often that class was correct — averaged equally
                across the six classes.
              </dd>
            </div>
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">Recall (macro)</dt>
              <dd className="mt-1">
                Of true images of a class, how often the model found them — averaged equally across
                classes.
              </dd>
            </div>
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">F1 (macro)</dt>
              <dd className="mt-1">
                Harmonic mean of precision and recall per class, then averaged. Useful when both
                false positives and false negatives matter.
              </dd>
            </div>
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">Inference time</dt>
              <dd className="mt-1">
                Mean latency per image during evaluation. Lower is faster, but hardware and batching
                affect absolute values.
              </dd>
            </div>
            <div className="note-block">
              <dt className="font-semibold text-[var(--color-ink)]">Size / parameters</dt>
              <dd className="mt-1">
                Artifact footprint and learnable parameter count — useful for discussing compute and
                memory trade-offs vs accuracy.
              </dd>
            </div>
          </dl>
        </section>
      )}

      <ComparisonTable comparison={comparison} loading={loading} error={error} />

      {chartRows.length > 0 && (
        <section className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="panel panel-pad min-w-0">
            <h2 className="m-0 font-semibold text-[var(--color-ink)]">Classification metrics (%)</h2>
            <p className="m-0 mt-1 text-xs text-[var(--color-ink-muted)]">
              Same verified values as the table — Custom CNN (blue) vs MobileNetV2 (teal).
            </p>
            <div className="chart-frame mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
                  <Legend />
                  <Bar dataKey="Custom CNN" fill="#1d4e89" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="MobileNetV2" fill="#0d7377" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel panel-pad min-w-0">
            <h2 className="m-0 font-semibold text-[var(--color-ink)]">Mean inference time (ms)</h2>
            <p className="m-0 mt-1 text-xs text-[var(--color-ink-muted)]">
              Measured mean inference time from the evaluation artifact — not a single Analyzer
              upload.
            </p>
            <div className="chart-frame mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
                  <Legend />
                  <Bar dataKey="Custom CNN" fill="#1d4e89" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="MobileNetV2" fill="#0d7377" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {evaluated && (
        <section className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
          <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">
            Accuracy vs per-class limitations
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Overall accuracy summarizes the whole test set. It can look strong even when a rare
              class is weak.
            </li>
            <li>
              Macro precision / recall / F1 treat each class equally, so rare classes (especially{' '}
              <strong className="text-[var(--color-ink)]">crack</strong>, only{' '}
              {CLASS_SUPPORT.crack.test} test images after{' '}
              <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{LABEL_STRATEGY}</code>{' '}
              labeling) pull those scores down more visibly.
            </li>
            <li>
              For class-by-class detail and confusion patterns, use the Visualizations page — do not
              over-interpret overall accuracy alone in a viva.
            </li>
            <li>
              Fairness of this comparison: same six classes, same split indexes, same metrics
              pipeline. The Custom CNN is the from-scratch baseline; MobileNetV2 uses ImageNet
              transfer learning.
            </li>
          </ul>
        </section>
      )}
    </div>
  )
}
