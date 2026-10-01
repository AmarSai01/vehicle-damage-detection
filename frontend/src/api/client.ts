import type {
  ComparisonData,
  HealthResponse,
  ModelId,
  ModelsResponse,
  PredictResponse,
  VisualizationsPayload,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') return data.detail
    if (data.detail?.message) return data.detail.message
    return JSON.stringify(data.detail ?? data)
  } catch {
    return res.statusText || 'Request failed'
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path}`
  try {
    return await fetch(url, init)
  } catch {
    throw new ApiError(
      'Failed to reach the API. Start the backend with: uvicorn backend.app.main:app --reload --port 8000',
      0,
    )
  }
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await apiFetch('/api/health')
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  return res.json()
}

export async function fetchModels(): Promise<ModelsResponse> {
  const res = await apiFetch('/api/models')
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  return res.json()
}

export async function fetchComparison(): Promise<ComparisonData> {
  const res = await apiFetch('/api/comparison')
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  return res.json()
}

export async function fetchVisualizations(): Promise<VisualizationsPayload> {
  const res = await apiFetch('/api/visualizations')
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  return res.json()
}

export async function predictImage(
  file: File,
  model: ModelId | 'both' = 'both',
): Promise<PredictResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('model', model)
  const res = await apiFetch('/api/predict', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  return res.json()
}
