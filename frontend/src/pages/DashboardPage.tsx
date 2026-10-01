import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { ApiError, checkHealth, fetchModels, predictImage } from '../api/client'
import { ComparisonTable } from '../components/ComparisonTable'
import { ImageUpload } from '../components/ImageUpload'
import { PredictionCard } from '../components/PredictionCard'
import { StatusBanner } from '../components/StatusBanner'
import type { ComparisonData, ModelPrediction, ModelStatus, PredictResponse } from '../types'

export function DashboardPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus> | null>(null)
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictResponse | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const health = await checkHealth()
      setApiOk(true)
      setApiMessage(null)
      setModelStatus(health.models)
      const models = await fetchModels()
      setModelStatus(models.models)
      setComparison(models.comparison)
    } catch (err) {
      setApiOk(false)
      setApiMessage(err instanceof Error ? err.message : 'API unreachable')
      setModelStatus(null)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const onFileChange = (f: File | null, preview: string | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(preview)
    setResult(null)
    setError(null)
  }

  const onAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await predictImage(file)
      setResult(res)
      await refreshStatus()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.status === 0 || err.status >= 500) {
          // keep previous apiOk unless health fails later
        }
      } else {
        setError(err instanceof Error ? err.message : 'Prediction failed')
      }
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const cnn: ModelPrediction | null = result?.custom_cnn ?? null
  const mnv: ModelPrediction | null = result?.mobilenetv2 ?? null

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="animate-fade-up max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Academic ML System
        </p>
        <h1 className="font-display mt-2 text-4xl leading-tight text-[var(--color-ink)] sm:text-5xl">
          Vehicle Damage Detection
        </h1>
        <p className="mt-3 text-base text-[var(--color-ink-muted)] sm:text-lg">
          Upload a vehicle image and compare real inferences from a Custom CNN (from scratch) and
          MobileNetV2 (ImageNet transfer learning) on CarDD damage categories.
        </p>
      </section>

      <StatusBanner apiOk={apiOk} models={modelStatus} message={apiMessage} />

      <ImageUpload
        file={file}
        previewUrl={previewUrl}
        onFileChange={onFileChange}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onAnalyze()}
          disabled={!file || loading || apiOk === false}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analyzing…' : 'Analyze Damage'}
        </button>
        {error && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <PredictionCard title="Custom CNN" accent="cnn" result={cnn} loading={loading} />
        <PredictionCard title="MobileNetV2" accent="mnv2" result={mnv} loading={loading} />
      </section>

      <ComparisonTable comparison={comparison} />
    </div>
  )
}
