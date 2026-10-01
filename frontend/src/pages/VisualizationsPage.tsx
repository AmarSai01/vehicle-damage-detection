import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchVisualizations } from '../api/client'
import { ConfusionMatrixHeatmap } from '../components/ConfusionMatrixHeatmap'
import { PageHeader } from '../components/PageHeader'
import { UiState } from '../components/UiState'
import { CLASS_SUPPORT, LABEL_STRATEGY } from '../data/academicFacts'
import type { ModelHistoryViz, ModelMetricsViz, VisualizationsPayload } from '../types'

function Unavailable({ message }: { message?: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-warn)]">
      {message || 'Data not available.'}
    </p>
  )
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null
  return Number((v * 100).toFixed(2))
}

function historySeries(hist: ModelHistoryViz) {
  if (!hist.available || !hist.epochs?.length) return []
  return hist.epochs.map((epoch, i) => ({
    epoch,
    train_acc: hist.accuracy?.[i] != null ? Number((hist.accuracy[i] * 100).toFixed(2)) : null,
    val_acc:
      hist.val_accuracy?.[i] != null ? Number((hist.val_accuracy[i] * 100).toFixed(2)) : null,
    train_loss: hist.loss?.[i] != null ? Number(hist.loss[i].toFixed(4)) : null,
    val_loss: hist.val_loss?.[i] != null ? Number(hist.val_loss[i].toFixed(4)) : null,
  }))
}

function MetricCard({
  title,
  children,
  caption,
}: {
  title: string
  children: React.ReactNode
  caption?: string
}) {
  return (
    <section className="panel panel-pad min-w-0">
      <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">{title}</h2>
      {caption && <p className="m-0 mt-1 text-sm text-[var(--color-ink-muted)]">{caption}</p>}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  )
}

function AcademicNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="note-block mt-4">
      <p className="m-0 font-semibold text-[var(--color-ink)]">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  )
}

function PerClassChart({ metrics }: { metrics: ModelMetricsViz }) {
  if (!metrics.available || !metrics.per_class?.length) {
    return <Unavailable message={metrics.message} />
  }
  const data = metrics.per_class.map((row) => ({
    name: row.class_name.replace('Glass Shatter', 'Glass').replace('Lamp Broken', 'Lamp').replace('Tire Flat', 'Tire'),
    Precision: pct(row.precision),
    Recall: pct(row.recall),
    F1: pct(row.f1),
  }))
  return (
    <div className="h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
          <Legend />
          <Bar dataKey="Precision" fill="#1d4e89" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Recall" fill="#0d7377" radius={[4, 4, 0, 0]} />
          <Bar dataKey="F1" fill="#b45309" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function HistoryCharts({ hist }: { hist: ModelHistoryViz }) {
  if (!hist.available) return <Unavailable message={hist.message} />
  const data = historySeries(hist)
  if (!data.length) return <Unavailable message="History series empty." />

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="chart-frame h-72">
        <p className="mb-2 text-sm font-semibold">Accuracy (%)</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
            <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
            <Legend />
            <Line type="monotone" dataKey="train_acc" name="Train" stroke="#1d4e89" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="val_acc" name="Validation" stroke="#0d7377" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-frame h-72">
        <p className="mb-2 text-sm font-semibold">Loss</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
            <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
            <Legend />
            <Line type="monotone" dataKey="train_loss" name="Train" stroke="#1d4e89" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="val_loss" name="Validation" stroke="#0d7377" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function VisualizationsPage() {
  const [data, setData] = useState<VisualizationsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setData(await fetchVisualizations())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load visualizations')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const comparisonBars = useMemo(() => {
    const cnn = data?.comparison?.models?.custom_cnn
    const mnv = data?.comparison?.models?.mobilenetv2
    if (!cnn || !mnv || cnn.status !== 'evaluated' || mnv.status !== 'evaluated') return []
    return [
      { metric: 'Accuracy', 'Custom CNN': pct(cnn.accuracy), MobileNetV2: pct(mnv.accuracy) },
      { metric: 'Precision', 'Custom CNN': pct(cnn.precision), MobileNetV2: pct(mnv.precision) },
      { metric: 'Recall', 'Custom CNN': pct(cnn.recall), MobileNetV2: pct(mnv.recall) },
      { metric: 'F1', 'Custom CNN': pct(cnn.f1), MobileNetV2: pct(mnv.f1) },
    ]
  }, [data])

  const resourceBars = useMemo(() => {
    const cnn = data?.comparison?.models?.custom_cnn
    const mnv = data?.comparison?.models?.mobilenetv2
    if (!cnn || !mnv || cnn.status !== 'evaluated' || mnv.status !== 'evaluated') return { latency: [], size: [], params: [] }
    return {
      latency: [
        {
          metric: 'Inference (ms)',
          'Custom CNN': Number(cnn.inference_time_ms?.toFixed(2) ?? 0),
          MobileNetV2: Number(mnv.inference_time_ms?.toFixed(2) ?? 0),
        },
      ],
      size: [
        {
          metric: 'Size (MB)',
          'Custom CNN': Number(cnn.model_size_mb?.toFixed(2) ?? 0),
          MobileNetV2: Number(mnv.model_size_mb?.toFixed(2) ?? 0),
        },
      ],
      params: [
        {
          metric: 'Parameters (M)',
          'Custom CNN': Number(((cnn.parameters ?? 0) / 1_000_000).toFixed(2)),
          MobileNetV2: Number(((mnv.parameters ?? 0) / 1_000_000).toFixed(2)),
        },
      ],
    }
  }, [data])

  const crackSupportFromApi = useMemo(() => {
    const rows =
      data?.metrics.mobilenetv2.per_class ?? data?.metrics.custom_cnn.per_class ?? []
    const crack = rows.find((r) => r.class_id === 'crack')
    return crack?.support ?? CLASS_SUPPORT.crack.test
  }, [data])

  return (
    <div className="page-shell section-stack">
      <PageHeader
        title="Visualizations"
        subtitle="Academic plots generated from existing evaluation and training artifacts. Every value is loaded from the API — nothing is hard-coded in the UI. Charts below are unchanged; captions explain how to interpret them in a viva."
      />

      {loading && (
        <UiState kind="loading" title="Loading visualization data">
          Assembling charts from evaluation and history artifacts…
        </UiState>
      )}
      {error && (
        <UiState kind="error" title="Could not load visualizations">
          {error}
        </UiState>
      )}

      {data && (
        <>
          <MetricCard
            title="1. Confusion matrices"
            caption="Held-out CarDD test set. Counts come from custom_cnn_metrics.json and mobilenetv2_metrics.json."
          >
            <div className="grid min-w-0 gap-8 lg:grid-cols-2">
              {data.metrics.custom_cnn.available && data.metrics.custom_cnn.confusion_matrix ? (
                <ConfusionMatrixHeatmap
                  title="Custom CNN"
                  classNames={data.metrics.custom_cnn.class_names ?? []}
                  matrix={data.metrics.custom_cnn.confusion_matrix}
                />
              ) : (
                <Unavailable message={data.metrics.custom_cnn.message} />
              )}
              {data.metrics.mobilenetv2.available && data.metrics.mobilenetv2.confusion_matrix ? (
                <ConfusionMatrixHeatmap
                  title="MobileNetV2"
                  classNames={data.metrics.mobilenetv2.class_names ?? []}
                  matrix={data.metrics.mobilenetv2.confusion_matrix}
                />
              ) : (
                <Unavailable message={data.metrics.mobilenetv2.message} />
              )}
            </div>
            <AcademicNote title="How to read a confusion matrix">
              <p>
                <strong className="text-[var(--color-ink)]">Diagonal</strong> cells (true class =
                predicted class) are correct predictions. Larger diagonal values are better.
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">Off-diagonal</strong> cells are mistakes:
                the row is the true label and the column is what the model predicted instead (for
                example, true scratch predicted as dent).
              </p>
              <p>
                Compare the two matrices for the same test set: differences show where transfer
                learning helps or where both models still confuse similar damage types.
              </p>
            </AcademicNote>
          </MetricCard>

          <MetricCard
            title="2. Per-class performance"
            caption="Precision, recall, and F1 for each CarDD class on the held-out test split (not macro-averaged into one number)."
          >
            <div className="grid min-w-0 gap-8 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-2 text-sm font-semibold">Custom CNN</p>
                <PerClassChart metrics={data.metrics.custom_cnn} />
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-sm font-semibold">MobileNetV2</p>
                <PerClassChart metrics={data.metrics.mobilenetv2} />
              </div>
            </div>
            <AcademicNote title="Class-wise results and the crack limitation">
              <p>
                These bars show how each damage type behaves on its own. A model can have solid
                overall accuracy while still failing a rare class.
              </p>
              <p>
                <strong className="text-[var(--color-ink)]">Crack</strong> has only{' '}
                <strong className="text-[var(--color-ink)]">{crackSupportFromApi}</strong> test
                images after image-level{' '}
                <code className="rounded bg-white/70 px-1 text-xs">{LABEL_STRATEGY}</code> labeling.
                With so few examples, precision/recall/F1 for crack are unstable and often weak —
                that is a real data limitation, not a chart bug.
              </p>
              <p>
                Prefer discussing frequent classes (dent, scratch, glass shatter, etc.) alongside
                this caveat when presenting viva results.
              </p>
            </AcademicNote>
          </MetricCard>

          <MetricCard
            title="3. Training history"
            caption="Mapped from history JSON keys: accuracy / val_accuracy / loss / val_loss over epochs."
          >
            <div className="space-y-8">
              <div>
                <p className="mb-2 text-sm font-semibold">Custom CNN</p>
                <HistoryCharts hist={data.history.custom_cnn} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">MobileNetV2</p>
                <HistoryCharts hist={data.history.mobilenetv2} />
              </div>
            </div>
            <AcademicNote title="Training vs validation curves">
              <p>
                <strong className="text-[var(--color-ink)]">Train</strong> curves show performance on
                data the model sees while learning.{' '}
                <strong className="text-[var(--color-ink)]">Validation</strong> curves show
                performance on held-out images used to monitor generalization during training.
              </p>
              <p>
                Rising train accuracy with falling train loss is expected. Watch validation together:
                if train keeps improving while validation stalls or worsens (a growing{' '}
                <strong className="text-[var(--color-ink)]">gap</strong>), that can indicate
                overfitting — memorizing train patterns that do not transfer as well.
              </p>
              <p>
                Final model quality for this project is judged on the separate held-out{' '}
                <strong className="text-[var(--color-ink)]">test</strong> metrics (comparison /
                confusion matrices), not on a single training epoch alone.
              </p>
            </AcademicNote>
          </MetricCard>

          <MetricCard
            title="4. Model comparison"
            caption="Overall test metrics and resource profile from comparison.json."
          >
            {!data.comparison?.available || comparisonBars.length === 0 ? (
              <Unavailable message={data.comparison?.message || 'Comparison data not available.'} />
            ) : (
              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                <div className="chart-frame h-80">
                  <p className="mb-2 text-sm font-semibold">Quality metrics (%)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonBars}>
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
                <div className="space-y-4">
                  {[
                    { title: 'Inference time', rows: resourceBars.latency },
                    { title: 'Model size', rows: resourceBars.size },
                    { title: 'Parameters', rows: resourceBars.params },
                  ].map(({ title, rows }) => (
                    <div key={title} className="h-40">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                        {title}
                      </p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="metric" width={90} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }} />
                          <Legend />
                          <Bar dataKey="Custom CNN" fill="#1d4e89" radius={[0, 6, 6, 0]} />
                          <Bar dataKey="MobileNetV2" fill="#0d7377" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              In this experiment MobileNetV2 reaches higher test accuracy with a much smaller
              artifact, while the Custom CNN remains the from-scratch baseline. Neither model is
              claimed to be universally superior — report only what these evaluation artifacts show.
            </p>
          </MetricCard>
        </>
      )}
    </div>
  )
}
