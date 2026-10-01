export type ModelId = 'custom_cnn' | 'mobilenetv2'

export interface ModelPrediction {
  model_name: string
  class: string | null
  confidence: number | null
  inference_time_ms: number | null
  available: boolean
  message: string | null
  probabilities?: Record<string, number> | null
}

export interface PredictResponse {
  selected_model: string
  classes: string[]
  prediction: ModelPrediction | null
  custom_cnn?: ModelPrediction | null
  mobilenetv2?: ModelPrediction | null
  detail?: string
}

export interface ModelStatus {
  id?: string
  display_name?: string
  file_exists: boolean
  loaded: boolean
  available: boolean
  error?: string | null
  message?: string | null
}

export interface ComparisonModel {
  status: string
  message?: string
  accuracy?: number | null
  precision?: number | null
  recall?: number | null
  f1?: number | null
  inference_time_ms?: number | null
  model_size_mb?: number | null
  parameters?: number | null
}

export interface ComparisonData {
  status: string
  message?: string
  models: {
    custom_cnn: ComparisonModel
    mobilenetv2: ComparisonModel
  }
  table?: Record<string, Record<string, number | null>>
  note?: string
}

export interface ModelsResponse {
  models: Record<string, ModelStatus>
  classes: string[]
  comparison: ComparisonData | null
}

export interface HealthResponse {
  status: string
  version: string
  models: Record<string, ModelStatus>
}

export interface PerClassMetric {
  class_id: string
  class_name: string
  precision: number | null
  recall: number | null
  f1: number | null
  support: number | null
}

export interface ModelMetricsViz {
  available: boolean
  model_id: string
  display_name?: string
  message?: string
  accuracy?: number | null
  precision_macro?: number | null
  recall_macro?: number | null
  f1_macro?: number | null
  num_samples?: number | null
  class_ids?: string[]
  class_names?: string[]
  confusion_matrix?: number[][] | null
  per_class?: PerClassMetric[]
}

export interface ModelHistoryViz {
  available: boolean
  model_id: string
  display_name?: string
  message?: string
  epochs?: number[]
  accuracy?: number[] | null
  val_accuracy?: number[] | null
  loss?: number[] | null
  val_loss?: number[] | null
}

export interface VisualizationsPayload {
  status: string
  sources: Record<string, boolean>
  classes: { id: string; name: string }[]
  metrics: {
    custom_cnn: ModelMetricsViz
    mobilenetv2: ModelMetricsViz
  }
  history: {
    custom_cnn: ModelHistoryViz
    mobilenetv2: ModelHistoryViz
  }
  comparison: ComparisonData & { available?: boolean }
}
