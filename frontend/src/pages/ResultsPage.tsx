import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComparison, fetchVisualizations } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { UiState } from '../components/UiState'
import { LABEL_STRATEGY, SPLIT_COUNTS } from '../data/academicFacts'
import type { ComparisonData, PerClassMetric, VisualizationsPayload } from '../types'

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

function fmtNum(v: number | null | undefined, digits = 2, suffix = '') {
  if (v == null) return '—'
  return `${v.toFixed(digits)}${suffix}`
}

function findClass(rows: PerClassMetric[] | undefined, id: string) {
  return rows?.find((r) => r.class_id === id)
}

export function ResultsPage() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [viz, setViz] = useState<VisualizationsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [comp, visualizations] = await Promise.all([
          fetchComparison(),
          fetchVisualizations().catch(() => null),
        ])
        setComparison(comp)
        setViz(visualizations)
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

  const perClassTakeaway = useMemo(() => {
    if (!ready || !viz) return null
    const cnnCrack = findClass(viz.metrics.custom_cnn.per_class, 'crack')
    const mnvCrack = findClass(viz.metrics.mobilenetv2.per_class, 'crack')
    const testN =
      viz.metrics.mobilenetv2.num_samples ??
      viz.metrics.custom_cnn.num_samples ??
      SPLIT_COUNTS.test
    return {
      testN,
      cnnCrack,
      mnvCrack,
    }
  }, [ready, viz])

  return (
    <div className="page-shell section-stack">
      <PageHeader
        title="Results"
        subtitle={
          <>
            Held-out CarDD test-set evaluation. Values are read from the real{' '}
            <code className="rounded bg-[var(--color-surface)] px-1 text-xs">comparison.json</code>{' '}
            artifact.
          </>
        }
      />

      {loading && (
        <UiState kind="loading" title="Loading evaluation results">
          Fetching comparison metrics from the API…
        </UiState>
      )}
      {error && (
        <UiState kind="error" title="Could not load results">
          {error}
        </UiState>
      )}

      {!loading && !error && !ready && (
        <UiState kind="empty" title="Evaluation not ready">
          {comparison?.message || 'Evaluation results will appear after training.'}
        </UiState>
      )}

      {ready && cnn && mnv && (
        <>
          <section className="panel panel-pad">
            <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Experiment card</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-ink-muted)]">
              <li>
                Held-out test set:{' '}
                <strong className="text-[var(--color-ink)]">
                  {perClassTakeaway?.testN ?? SPLIT_COUNTS.test}
                </strong>{' '}
                images (train {SPLIT_COUNTS.train} / val {SPLIT_COUNTS.val}).
              </li>
              <li>
                Both models evaluated on the <strong className="text-[var(--color-ink)]">same</strong>{' '}
                split indexes with label strategy{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{LABEL_STRATEGY}</code>.
              </li>
              <li>
                Aggregate metrics below are served from{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">/api/comparison</code>{' '}
                (backed by{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">comparison.json</code>
                ).
              </li>
              <li>
                In this experiment MobileNetV2 test accuracy is {fmtPct(mnv.accuracy)} vs Custom CNN{' '}
                {fmtPct(cnn.accuracy)}; that does not imply universal superiority for every
                deployment constraint.
              </li>
            </ul>
          </section>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {[
              { title: 'Custom CNN', m: cnn, accent: 'var(--color-cnn)' },
              { title: 'MobileNetV2', m: mnv, accent: 'var(--color-mnv2)' },
            ].map(({ title, m, accent }) => (
              <article key={title} className="panel panel-pad min-w-0">
                <p className="section-label m-0" style={{ color: accent }}>
                  {title}
                </p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {[
                    ['Accuracy', fmtPct(m.accuracy)],
                    ['Precision (macro)', fmtPct(m.precision)],
                    ['Recall (macro)', fmtPct(m.recall)],
                    ['F1 (macro)', fmtPct(m.f1)],
                    ['Inference time', fmtNum(m.inference_time_ms, 2, ' ms')],
                    ['Model size', fmtNum(m.model_size_mb, 2, ' MB')],
                    ['Parameters', m.parameters?.toLocaleString() ?? '—'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)]/70 pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--color-ink)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          {perClassTakeaway && (perClassTakeaway.cnnCrack || perClassTakeaway.mnvCrack) && (
            <section className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
              <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Per-class takeaway</h2>
              <p className="mt-3">
                Overall, MobileNetV2 is stronger on this test set, but rare classes remain difficult.
                Crack has only{' '}
                <strong className="text-[var(--color-ink)]">
                  {perClassTakeaway.mnvCrack?.support ??
                    perClassTakeaway.cnnCrack?.support ??
                    8}
                </strong>{' '}
                test images after image-level labeling.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {perClassTakeaway.cnnCrack && (
                  <li>
                    Custom CNN crack — precision {fmtPct(perClassTakeaway.cnnCrack.precision)},
                    recall {fmtPct(perClassTakeaway.cnnCrack.recall)}, F1{' '}
                    {fmtPct(perClassTakeaway.cnnCrack.f1)} (from evaluation metrics via{' '}
                    <code className="rounded bg-[var(--color-surface)] px-1 text-xs">
                      /api/visualizations
                    </code>
                    ).
                  </li>
                )}
                {perClassTakeaway.mnvCrack && (
                  <li>
                    MobileNetV2 crack — precision {fmtPct(perClassTakeaway.mnvCrack.precision)},
                    recall {fmtPct(perClassTakeaway.mnvCrack.recall)}, F1{' '}
                    {fmtPct(perClassTakeaway.mnvCrack.f1)} (same artifact source).
                  </li>
                )}
                <li>
                  Low support makes crack scores volatile; treat them as a data limitation, not a UI
                  bug. See Visualizations for full per-class charts and confusion matrices.
                </li>
              </ul>
            </section>
          )}

          <section className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
            <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">How to read these metrics</h2>
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
          </section>

          <section className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
            <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Limitations</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Class imbalance and the{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{LABEL_STRATEGY}</code>{' '}
                reduction affect per-class reliability (especially crack).
              </li>
              <li>
                There is no “no damage” class in CarDD; this system only classifies among the six
                damage types.
              </li>
              <li>
                Live Analyzer confidence on one photo is not a substitute for these held-out test
                metrics.
              </li>
              <li>
                Academic local demo only — not a certified insurance decision system.
              </li>
            </ul>
            <p className="mt-4">
              Explore interactive charts on the{' '}
              <Link to="/compare" className="text-[var(--color-accent)] underline">
                Comparison
              </Link>{' '}
              page, deep-dive plots on{' '}
              <Link to="/visualizations" className="text-[var(--color-accent)] underline">
                Visualizations
              </Link>
              , or run live inference in the{' '}
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
