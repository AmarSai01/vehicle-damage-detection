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
import { PageHeader } from '../components/PageHeader'
import { PredictionCard } from '../components/PredictionCard'
import { StatusBanner } from '../components/StatusBanner'
import { UiState } from '../components/UiState'
import type { ModelPrediction, ModelStatus, PredictModelSelection } from '../types'

const MODEL_OPTIONS: { id: PredictModelSelection; label: string; hint: string }[] = [
  { id: 'custom_cnn', label: 'Custom CNN', hint: 'From-scratch architecture' },
  { id: 'mobilenetv2', label: 'MobileNetV2', hint: 'ImageNet transfer learning' },
  { id: 'both', label: 'Compare both', hint: 'Side-by-side real inference' },
]

export function AnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [model, setModel] = useState<PredictModelSelection>('mobilenetv2')
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null)
  const [cnnPrediction, setCnnPrediction] = useState<ModelPrediction | null>(null)
  const [mnvPrediction, setMnvPrediction] = useState<ModelPrediction | null>(null)

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

  const selectedAvailable = useMemo(() => {
    if (!modelStatus) return false
    if (model === 'both') {
      return Boolean(modelStatus.custom_cnn?.available && modelStatus.mobilenetv2?.available)
    }
    return Boolean(modelStatus[model]?.available)
  }, [model, modelStatus])

  const onFileChange = (f: File | null, preview: string | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(preview)
    setPrediction(null)
    setCnnPrediction(null)
    setMnvPrediction(null)
    setError(null)
  }

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setPrediction(null)
    setCnnPrediction(null)
    setMnvPrediction(null)
    setError(null)
  }

  const onAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await predictImage(file, model)
      if (model === 'both') {
        setCnnPrediction(res.custom_cnn ?? null)
        setMnvPrediction(res.mobilenetv2 ?? null)
        setPrediction(null)
      } else {
        const pred =
          res.prediction ?? (model === 'custom_cnn' ? res.custom_cnn : res.mobilenetv2) ?? null
        if (!pred) throw new Error('Empty prediction response')
        setPrediction(pred)
        setCnnPrediction(null)
        setMnvPrediction(null)
      }
      await refreshStatus()
    } catch (err) {
      setPrediction(null)
      setCnnPrediction(null)
      setMnvPrediction(null)
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

  const hasBothResults = Boolean(cnnPrediction || mnvPrediction)

  return (
    <div className="page-shell section-stack">
      <PageHeader
        title="Damage Analyzer"
        subtitle="Upload a vehicle image, choose a trained model (or compare both), and run real inference from the `.keras` artifacts — not placeholders."
      />

      <StatusBanner apiOk={apiOk} models={modelStatus} message={apiMessage} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <div className="panel panel-pad min-w-0 space-y-5">
          <div>
            <p className="section-label">1 · Upload</p>
            <h2 className="font-display m-0 mt-1 text-2xl text-[var(--color-ink)]">Vehicle image</h2>
          </div>
          <ImageUpload
            file={file}
            previewUrl={previewUrl}
            onFileChange={onFileChange}
            disabled={loading}
          />

          <fieldset className="min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/60 p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--color-ink)]">
              2 · Model selector
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {MODEL_OPTIONS.map((opt) => {
                const available =
                  opt.id === 'both'
                    ? modelStatus?.custom_cnn?.available && modelStatus?.mobilenetv2?.available
                    : modelStatus?.[opt.id]?.available
                return (
                  <label
                    key={opt.id}
                    className={[
                      'cursor-pointer rounded-xl border px-3.5 py-3 transition',
                      model === opt.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[inset_0_0_0_1px_rgba(13,115,119,0.15)]'
                        : 'border-[var(--color-line)] bg-white/70 hover:bg-white',
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
                        setCnnPrediction(null)
                        setMnvPrediction(null)
                        setError(null)
                      }}
                    />
                    <p className="m-0 font-semibold text-[var(--color-ink)]">{opt.label}</p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--color-ink-muted)]">{opt.hint}</p>
                    {available === false && (
                      <p className="m-0 mt-1 text-xs text-[var(--color-warn)]">Unavailable</p>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onAnalyze()}
              disabled={!file || loading || apiOk === false || !selectedAvailable}
              className="btn btn-primary"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Analyzing…' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={loading || (!file && !prediction && !hasBothResults)}
              className="btn btn-secondary"
            >
              <RotateCcw size={16} />
              Clear
            </button>
          </div>

          {error && (
            <UiState kind="error" title="Prediction failed">
              {error}
            </UiState>
          )}
          <p className="m-0 text-xs text-[var(--color-ink-muted)]">
            Confidence on a single image is not held-out test accuracy. Compare model quality on the
            Results page.
          </p>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          <div>
            <p className="section-label">3 · Prediction</p>
            <h2 className="font-display m-0 mt-1 text-2xl text-[var(--color-ink)]">Result panel</h2>
          </div>

          {model === 'both' ? (
            <div className="space-y-4">
              <PredictionCard
                title="Custom CNN"
                accent="cnn"
                result={cnnPrediction}
                loading={loading}
              />
              <PredictionCard
                title="MobileNetV2"
                accent="mnv2"
                result={mnvPrediction}
                loading={loading}
              />
            </div>
          ) : (
            <>
              <div className="panel panel-pad min-w-0">
                <p className="section-label">Prediction result</p>
                {loading && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                    <Loader2 size={16} className="animate-spin" />
                    Running {model === 'custom_cnn' ? 'Custom CNN' : 'MobileNetV2'} inference…
                  </p>
                )}
                {!loading && !prediction && (
                  <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
                    Upload an image and click Analyze to see the predicted damage class, confidence,
                    probability distribution, and inference time.
                  </p>
                )}
                {!loading && prediction && !prediction.available && (
                  <p className="mt-4 text-sm text-[var(--color-warn)]">
                    {prediction.message || 'Model not available.'}
                  </p>
                )}
                {!loading && prediction?.available && (
                  <div className="mt-3 space-y-4 animate-fade-up">
                    <div>
                      <p className="m-0 text-sm text-[var(--color-ink-muted)]">Selected model</p>
                      <p className="m-0 font-semibold">
                        {prediction.model_name === 'custom_cnn' ? 'Custom CNN' : 'MobileNetV2'}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 text-sm text-[var(--color-ink-muted)]">Damage class</p>
                      <p className="font-display m-0 text-4xl leading-none text-[var(--color-ink)]">
                        {prediction.class ?? '—'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
                        <p className="m-0 text-xs text-[var(--color-ink-muted)]">Confidence</p>
                        <p className="m-0 text-lg font-semibold tabular-nums">
                          {prediction.confidence != null
                            ? `${(prediction.confidence * 100).toFixed(1)}%`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
                        <p className="m-0 text-xs text-[var(--color-ink-muted)]">Inference</p>
                        <p className="m-0 text-lg font-semibold tabular-nums">
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
                <div className="panel panel-pad min-w-0">
                  <p className="m-0 text-sm font-semibold text-[var(--color-ink)]">
                    Class probability distribution
                  </p>
                  <div className="chart-frame mt-3 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd4" />
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
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
            </>
          )}
        </aside>
      </div>

      <details className="panel panel-pad text-sm text-[var(--color-ink-muted)]">
        <summary className="cursor-pointer font-semibold text-[var(--color-ink)]">Demo tips</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            Use your own authorized vehicle photos (this app does not ship CarDD sample images).
          </li>
          <li>
            For a viva, try <strong className="text-[var(--color-ink)]">Compare both</strong> on the
            same image, then open Results / Visualizations for held-out test metrics.
          </li>
          <li>
            Confidence and latency below are for <em>this upload only</em> — they are not the
            project’s test-set accuracy.
          </li>
          <li>High confidence does not guarantee a correct class; treat outputs as assistive.</li>
        </ul>
      </details>
    </div>
  )
}
