import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RotateCcw, Sparkles } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ApiError, checkHealth, predictImage } from '../api/client'
import { ImageUpload } from '../components/ImageUpload'
import { StatusBanner } from '../components/StatusBanner'
import type { ModelId, ModelPrediction, ModelStatus } from '../types'

const MODEL_OPTIONS: { id: ModelId; label: string; hint: string }[] = [
  { id: 'custom_cnn', label: 'Custom CNN', hint: 'From-scratch architecture' },
  { id: 'mobilenetv2', label: 'MobileNetV2', hint: 'ImageNet transfer learning' },
]

export function AnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [model, setModel] = useState<ModelId>('mobilenetv2')
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const health = await checkHealth()
      setApiOk(true)
      setApiMessage(null)
      setModelStatus(health.models)
    } catch (err) {
      setApiOk(false)
      setApiMessage(err instanceof Error ? err.message : 'API unreachable')
      setModelStatus(null)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const selectedAvailable = modelStatus?.[model]?.available ?? false

  const onFileChange = (f: File | null, preview: string | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(preview)
    setPrediction(null)
    setError(null)
  }

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setPrediction(null)
    setError(null)
  }

  const onAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await predictImage(file, model)
      const pred = res.prediction ?? (model === 'custom_cnn' ? res.custom_cnn : res.mobilenetv2) ?? null
      if (!pred) throw new Error('Empty prediction response')
      setPrediction(pred)
      await refreshStatus()
    } catch (err) {
      setPrediction(null)
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!prediction?.probabilities) return []
    return Object.entries(prediction.probabilities).map(([name, value]) => ({
      name,
      probability: Number((value * 100).toFixed(2)),
    }))
  }, [prediction])

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="max-w-2xl">
        <h1 className="font-display text-4xl">Damage Analyzer</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Upload a vehicle image, choose a trained model, and run real inference. Results come from
          the `.keras` artifacts — not placeholders.
        </p>
      </section>

      <StatusBanner apiOk={apiOk} models={modelStatus} message={apiMessage} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <ImageUpload
            file={file}
            previewUrl={previewUrl}
            onFileChange={onFileChange}
            disabled={loading}
          />

          <fieldset className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--color-ink)]">
              Model selector
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {MODEL_OPTIONS.map((opt) => {
                const available = modelStatus?.[opt.id]?.available
                return (
                  <label
                    key={opt.id}
                    className={[
                      'cursor-pointer rounded-xl border px-4 py-3 transition',
                      model === opt.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                        : 'border-[var(--color-line)] bg-white/60 hover:bg-white',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="model"
                      className="sr-only"
                      checked={model === opt.id}
                      disabled={loading}
                      onChange={() => {
                        setModel(opt.id)
                        setPrediction(null)
                        setError(null)
                      }}
                    />
                    <p className="font-semibold text-[var(--color-ink)]">{opt.label}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{opt.hint}</p>
                    {available === false && (
                      <p className="mt-1 text-xs text-[var(--color-warn)]">Model unavailable</p>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void onAnalyze()}
              disabled={!file || loading || apiOk === false || !selectedAvailable}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Analyzing…' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={loading || (!file && !prediction)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Clear
            </button>
          </div>
          {error && (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Prediction result
            </p>
            {loading && (
              <p className="mt-4 animate-pulse-soft text-sm text-[var(--color-ink-muted)]">
                Running {model === 'custom_cnn' ? 'Custom CNN' : 'MobileNetV2'} inference…
              </p>
            )}
            {!loading && !prediction && (
              <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
                Upload an image and click Analyze to see the predicted damage class, confidence,
                full probability distribution, and inference time.
              </p>
            )}
            {!loading && prediction && !prediction.available && (
              <p className="mt-4 text-sm text-[var(--color-warn)]">
                {prediction.message || 'Model not available.'}
              </p>
            )}
            {!loading && prediction?.available && (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-sm text-[var(--color-ink-muted)]">Selected model</p>
                  <p className="font-semibold">
                    {prediction.model_name === 'custom_cnn' ? 'Custom CNN' : 'MobileNetV2'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-ink-muted)]">Damage class</p>
                  <p className="font-display text-3xl text-[var(--color-ink)]">
                    {prediction.class ?? '—'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-ink-muted)]">Confidence</p>
                    <p className="text-lg font-semibold">
                      {prediction.confidence != null
                        ? `${(prediction.confidence * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-ink-muted)]">Inference</p>
                    <p className="text-lg font-semibold">
                      {prediction.inference_time_ms != null
                        ? `${prediction.inference_time_ms.toFixed(1)} ms`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {chartData.length > 0 && prediction?.available && (
            <div className="rounded-2xl border border-[var(--color-line)] bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Class probability distribution
              </p>
              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Probability']}
                      contentStyle={{ borderRadius: 12, borderColor: '#e2ddd4' }}
                    />
                    <Bar dataKey="probability" fill="#0d7377" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
