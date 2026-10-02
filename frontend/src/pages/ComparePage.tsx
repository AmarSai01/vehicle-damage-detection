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
import { PageHeader, MetricCard, SectionHeader } from '../components/PageHeader'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/tabs'
import { CLASS_SUPPORT, LABEL_STRATEGY, SPLIT_COUNTS } from '../content/academicFacts'
import type { ComparisonData, ComparisonModel } from '../types'

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null
  return Number((v * 100).toFixed(2))
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

function modelMetric(value: number | null | undefined, kind: 'pct' | 'ms' | 'mb' | 'params') {
  if (value == null || Number.isNaN(value)) return '—'
  if (kind === 'pct') return `${(value * 100).toFixed(2)}%`
  if (kind === 'ms') return `${value.toFixed(2)} ms`
  if (kind === 'mb') return `${value.toFixed(1)} MB`
  return value.toLocaleString()
}

function ModelPanel({
  model,
  tone,
  title,
  summary,
}: {
  model: ComparisonModel
  tone: 'cnn' | 'mnv2'
  title: string
  summary: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Accuracy" value={modelMetric(model.accuracy, 'pct')} tone={tone} />
        <MetricCard label="Precision (macro)" value={modelMetric(model.precision, 'pct')} tone={tone} />
        <MetricCard label="Recall (macro)" value={modelMetric(model.recall, 'pct')} tone={tone} />
        <MetricCard label="F1 (macro)" value={modelMetric(model.f1, 'pct')} tone={tone} />
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <MetricCard label="Inference time" value={modelMetric(model.inference_time_ms, 'ms')} tone={tone} />
        <MetricCard label="Model size" value={modelMetric(model.model_size_mb, 'mb')} tone={tone} />
        <MetricCard label="Parameters" value={modelMetric(model.parameters, 'params')} tone={tone} />
      </div>
      <Card className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">{title}</h2>
        <p className="m-0 mt-2">{summary}</p>
      </Card>
    </div>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  borderColor: '#243352',
  background: '#0d1526',
  color: '#eef3ff',
}

export function ComparePage() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setComparison(await fetchComparison())
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
      { metric: 'Accuracy', 'Custom CNN': pct(cnn.accuracy), MobileNetV2: pct(mnv.accuracy) },
      { metric: 'Precision', 'Custom CNN': pct(cnn.precision), MobileNetV2: pct(mnv.precision) },
      { metric: 'Recall', 'Custom CNN': pct(cnn.recall), MobileNetV2: pct(mnv.recall) },
      { metric: 'F1', 'Custom CNN': pct(cnn.f1), MobileNetV2: pct(mnv.f1) },
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
        kicker="Model arena"
        title="Model Comparison"
        subtitle={
          <>
            Custom CNN vs MobileNetV2 on the same held-out CarDD test split ({SPLIT_COUNTS.test}{' '}
            images). Metrics from{' '}
            <code className="rounded bg-white/5 px-1 text-xs">comparison.json</code> — no fabricated
            numbers.
          </>
        }
      />

      {evaluated && cnn && mnv ? (
        <Tabs
          containerClassName="w-full max-w-full gap-1 rounded-full border border-[rgba(148,163,184,0.14)] bg-[rgba(7,11,20,0.45)] p-1 sm:w-fit"
          activeTabClassName="bg-[rgba(34,211,238,0.18)] dark:bg-[rgba(34,211,238,0.18)]"
          tabClassName="px-2.5 py-2 text-xs font-medium sm:px-4 sm:text-sm"
          contentClassName="mt-5"
          tabs={[
            {
              title: 'Custom CNN',
              value: 'custom-cnn',
              content: (
                <ModelPanel
                  model={cnn}
                  tone="cnn"
                  title="Custom CNN"
                  summary="From-scratch baseline trained without ImageNet weights. Same six classes, same split indexes, and the same metrics pipeline as MobileNetV2."
                />
              ),
            },
            {
              title: 'MobileNetV2',
              value: 'mobilenetv2',
              content: (
                <ModelPanel
                  model={mnv}
                  tone="mnv2"
                  title="MobileNetV2"
                  summary="ImageNet transfer learning with a custom 6-class head. In this experiment it reaches higher test accuracy than the Custom CNN, with a much smaller file size. That result is specific to these evaluation artifacts."
                />
              ),
            },
            {
              title: 'Comparison',
              value: 'comparison',
              content: (
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="CNN accuracy" value={fmtPct(cnn.accuracy)} tone="cnn" />
                    <MetricCard label="MobileNet accuracy" value={fmtPct(mnv.accuracy)} tone="mnv2" />
                    <MetricCard
                      label="CNN size"
                      value={`${Number(cnn.model_size_mb ?? 0).toFixed(1)} MB`}
                      tone="cnn"
                    />
                    <MetricCard
                      label="MobileNet size"
                      value={`${Number(mnv.model_size_mb ?? 0).toFixed(1)} MB`}
                      tone="mnv2"
                    />
                  </div>

                  <Card>
                    <SectionHeader
                      title="How to read this comparison"
                      description={
                        <>
                          In this experiment MobileNetV2 reaches higher test accuracy ({fmtPct(mnv.accuracy)})
                          than the Custom CNN ({fmtPct(cnn.accuracy)}), with a much smaller file size. That
                          result is specific to these evaluation artifacts and should not be claimed as
                          universal superiority.
                        </>
                      }
                    />
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ['Accuracy', 'Share of all test images predicted correctly.'],
                        ['Precision (macro)', 'Correctness of positive predictions, averaged across classes.'],
                        ['Recall (macro)', 'Coverage of true class examples, averaged across classes.'],
                        ['F1 (macro)', 'Harmonic mean of precision and recall, then averaged.'],
                        ['Inference time', 'Mean latency per image during evaluation.'],
                        ['Size / parameters', 'Artifact footprint and learnable parameter count.'],
                      ].map(([title, body]) => (
                        <div key={title} className="note-block">
                          <dt className="font-semibold text-[var(--color-ink)]">{title}</dt>
                          <dd className="mt-1">{body}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>

                  <ComparisonTable comparison={comparison} loading={loading} error={error} />

                  {chartRows.length > 0 && (
                    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                      <Card>
                        <h2 className="m-0 font-semibold text-[var(--color-ink)]">Classification metrics (%)</h2>
                        <p className="m-0 mt-1 text-xs text-[var(--color-ink-muted)]">
                          Same verified values as the table — Custom CNN vs MobileNetV2.
                        </p>
                        <div className="chart-frame mt-4 h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartRows}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                              <Tooltip contentStyle={tooltipStyle} />
                              <Legend />
                              <Bar dataKey="Custom CNN" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="MobileNetV2" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                      <Card>
                        <h2 className="m-0 font-semibold text-[var(--color-ink)]">Mean inference time (ms)</h2>
                        <p className="m-0 mt-1 text-xs text-[var(--color-ink-muted)]">
                          From the evaluation artifact — not a single Analyzer upload.
                        </p>
                        <div className="chart-frame mt-4 h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={latencyRows}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip contentStyle={tooltipStyle} />
                              <Legend />
                              <Bar dataKey="Custom CNN" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="MobileNetV2" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </section>
                  )}

                  <Card className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">
                      Accuracy vs per-class limitations
                    </h2>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                      <li>
                        Overall accuracy summarizes the whole test set and can look strong even when a rare
                        class is weak.
                      </li>
                      <li>
                        Macro metrics treat each class equally, so rare classes (especially{' '}
                        <strong className="text-[var(--color-ink)]">crack</strong>, only{' '}
                        {CLASS_SUPPORT.crack.test} test images after{' '}
                        <code className="rounded bg-white/5 px-1 text-xs">{LABEL_STRATEGY}</code>) pull those
                        scores down more visibly.
                      </li>
                      <li>Use Visualizations for class-by-class detail and confusion patterns.</li>
                      <li>
                        Fairness: same six classes, same split indexes, same metrics pipeline. Custom CNN is
                        the from-scratch baseline; MobileNetV2 uses ImageNet transfer learning.
                      </li>
                    </ul>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <ComparisonTable comparison={comparison} loading={loading} error={error} />
      )}
    </div>
  )
}
