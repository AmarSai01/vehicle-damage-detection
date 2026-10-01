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
import type { ComparisonData } from '../types'

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null
  return Number((v * 100).toFixed(2))
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="max-w-2xl">
        <h1 className="font-display text-4xl">Model Comparison</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Metrics are loaded from the evaluation artifact (`comparison.json`). No fabricated
          numbers are shown.
        </p>
      </section>

      <ComparisonTable comparison={comparison} loading={loading} error={error} />

      {chartRows.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--color-ink)]">Classification metrics (%)</h2>
            <div className="mt-4 h-72">
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
          <div className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--color-ink)]">Mean inference time (ms)</h2>
            <div className="mt-4 h-72">
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
    </div>
  )
}
