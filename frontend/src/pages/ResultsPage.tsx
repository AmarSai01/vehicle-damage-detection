import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComparison, fetchVisualizations } from '../api/client'
import { PageHeader, MetricCard, SectionHeader } from '../components/PageHeader'
import { UiState } from '../components/UiState'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LABEL_STRATEGY, SPLIT_COUNTS } from '../content/academicFacts'
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
    return { testN, cnnCrack, mnvCrack }
  }, [ready, viz])

  return (
    <div className="page-shell section-stack">
      <PageHeader
        kicker="Evaluation dashboard"
        title="Results"
        subtitle={
          <>
            Held-out CarDD test-set evaluation. Values are read from the real{' '}
            <code className="rounded bg-white/5 px-1 text-xs">comparison.json</code> artifact.
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
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="CNN accuracy" value={fmtPct(cnn.accuracy)} tone="cnn" badge="Custom CNN" />
            <MetricCard label="MobileNet accuracy" value={fmtPct(mnv.accuracy)} tone="mnv2" badge="MobileNetV2" />
            <MetricCard label="Test images" value={perClassTakeaway?.testN ?? SPLIT_COUNTS.test} tone="accent" />
            <MetricCard
              label="Size advantage"
              value={`${fmtNum(mnv.model_size_mb, 1)} MB`}
              hint={`vs CNN ${fmtNum(cnn.model_size_mb, 1)} MB`}
              tone="default"
            />
          </div>

          <Card>
            <SectionHeader
              eyebrow="Experiment"
              title="Fair comparison setup"
              description="Both models use the same official split indexes and metrics pipeline."
            />
            <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--color-ink-muted)]">
              <li>
                Held-out test set:{' '}
                <strong className="text-[var(--color-ink)]">
                  {perClassTakeaway?.testN ?? SPLIT_COUNTS.test}
                </strong>{' '}
                images (train {SPLIT_COUNTS.train} / val {SPLIT_COUNTS.val}).
              </li>
              <li>
                Label strategy{' '}
                <code className="rounded bg-white/5 px-1 text-xs">{LABEL_STRATEGY}</code>.
              </li>
              <li>
                Aggregate metrics from{' '}
                <code className="rounded bg-white/5 px-1 text-xs">/api/comparison</code>.
              </li>
              <li>
                In this experiment MobileNetV2 test accuracy is {fmtPct(mnv.accuracy)} vs Custom CNN{' '}
                {fmtPct(cnn.accuracy)}; that does not imply universal superiority.
              </li>
            </ul>
          </Card>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {[
              { title: 'Custom CNN', m: cnn, tone: 'cnn' as const },
              { title: 'MobileNetV2', m: mnv, tone: 'mnv2' as const },
            ].map(({ title, m, tone }) => (
              <Card key={title}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">{title}</h2>
                  <Badge tone={tone}>Evaluated</Badge>
                </div>
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
                      className="flex items-baseline justify-between gap-4 border-b border-[rgba(148,163,184,0.1)] pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
                      <dd className="m-0 font-semibold tabular-nums text-[var(--color-ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>

          {perClassTakeaway && (perClassTakeaway.cnnCrack || perClassTakeaway.mnvCrack) && (
            <Card className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
              <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Per-class takeaway</h2>
              <p className="mt-3">
                Overall, MobileNetV2 is stronger on this test set, but rare classes remain difficult.
                Crack has only{' '}
                <strong className="text-[var(--color-ink)]">
                  {perClassTakeaway.mnvCrack?.support ?? perClassTakeaway.cnnCrack?.support ?? 8}
                </strong>{' '}
                test images after image-level labeling.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {perClassTakeaway.cnnCrack && (
                  <li>
                    Custom CNN crack — precision {fmtPct(perClassTakeaway.cnnCrack.precision)},
                    recall {fmtPct(perClassTakeaway.cnnCrack.recall)}, F1{' '}
                    {fmtPct(perClassTakeaway.cnnCrack.f1)}.
                  </li>
                )}
                {perClassTakeaway.mnvCrack && (
                  <li>
                    MobileNetV2 crack — precision {fmtPct(perClassTakeaway.mnvCrack.precision)},
                    recall {fmtPct(perClassTakeaway.mnvCrack.recall)}, F1{' '}
                    {fmtPct(perClassTakeaway.mnvCrack.f1)}.
                  </li>
                )}
                <li>
                  Low support makes crack scores volatile; treat them as a data limitation, not a UI
                  bug.
                </li>
              </ul>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
              <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">How to read these metrics</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[var(--color-ink)]">Accuracy</strong> is overall correct
                  predictions on the held-out test split.
                </li>
                <li>
                  <strong className="text-[var(--color-ink)]">Precision / Recall / F1 (macro)</strong>{' '}
                  average per-class scores equally — important under class imbalance.
                </li>
                <li>
                  MobileNetV2 achieved higher test accuracy ({fmtPct(mnv.accuracy)}) than Custom CNN (
                  {fmtPct(cnn.accuracy)}) with a smaller file size in this experiment.
                </li>
                <li>
                  The Custom CNN remains a useful academic baseline without ImageNet weights.
                </li>
              </ul>
            </Card>
            <Card className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
              <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Limitations</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Class imbalance and{' '}
                  <code className="rounded bg-white/5 px-1 text-xs">{LABEL_STRATEGY}</code> labeling
                  affect per-class reliability (especially crack).
                </li>
                <li>No “no damage” class in CarDD.</li>
                <li>Live Analyzer confidence is not a substitute for these held-out metrics.</li>
                <li>Academic local demo only — not a certified insurance system.</li>
              </ul>
              <p className="mt-4">
                Continue to{' '}
                <Link to="/compare" className="text-cyan-300 underline">
                  Comparison
                </Link>{' '}
                or{' '}
                <Link to="/visualizations" className="text-cyan-300 underline">
                  Visualizations
                </Link>
                .
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
