/**
 * Verified non-metric academic facts from this project's split_meta.json
 * (source: cardd_coco_official, label_strategy: max_total_area).
 * Accuracies and evaluation scores must still come from API artifacts —
 * do not invent metrics here.
 */

export const SPLIT_COUNTS = {
  train: 2816,
  val: 810,
  test: 374,
} as const

export const LABEL_STRATEGY = 'max_total_area' as const

export const LABEL_STRATEGY_SUMMARY =
  'CarDD COCO images can contain multiple damage instances. For classification we assign one image-level label using the documented max_total_area reduction of instance masks, while preserving the official train/val/test split indexes. Original CarDD files are never modified.'

export const CLASS_SUPPORT = {
  dent: { title: 'Dent', all: 1173, train: 823, val: 241, test: 109 },
  scratch: { title: 'Scratch', all: 1324, train: 932, val: 270, test: 122 },
  crack: { title: 'Crack', all: 94, train: 61, val: 25, test: 8 },
  glass_shatter: { title: 'Glass Shatter', all: 653, train: 457, val: 131, test: 65 },
  lamp_broken: { title: 'Lamp Broken', all: 463, train: 333, val: 88, test: 42 },
  tire_flat: { title: 'Tire Flat', all: 293, train: 210, val: 55, test: 28 },
} as const

export type ClassId = keyof typeof CLASS_SUPPORT
