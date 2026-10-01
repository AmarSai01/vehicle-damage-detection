export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <section>
        <h1 className="font-display text-4xl">About / Project</h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Academic full-stack system for vehicle damage classification on CarDD using exactly two
          deep-learning models.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Problem statement</h2>
        <p>
          Manual inspection of vehicle damage is slow and inconsistent. Vision models can triage
          common exterior damage types from photographs for insurance and workshop workflows.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Objective</h2>
        <p>
          Build a reproducible pipeline that trains a Custom CNN from scratch and MobileNetV2 via
          transfer learning on the same CarDD splits, evaluates them fairly, and serves real
          inference through a professional web interface.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Dataset</h2>
        <p>
          CarDD (Wang, Li &amp; Wu, 2023) — six classes: dent, scratch, crack, glass shatter, lamp
          broken, tire flat. Access requires PIC Lab consent. This project does not redistribute
          the dataset. Image-level labels use a documented max-total-area reduction of COCO
          instances while preserving official train/val/test splits.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Methodology</h2>
        <p>
          Inspect → prepare official split indexes → train both models → evaluate on the held-out
          test set → serve predictions via FastAPI with model-specific preprocessing.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Custom CNN</h2>
        <p>
          Scratch TensorFlow/Keras CNN: four Conv-BN-ReLU blocks (32→256), pooling, dropout, dense
          head, softmax over six classes. No pretrained backbone.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">MobileNetV2</h2>
        <p>
          ImageNet-pretrained MobileNetV2 backbone with a custom classification head. Phase 1 freezes
          the base; Phase 2 fine-tunes upper layers at a lower learning rate.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Evaluation</h2>
        <p>
          Accuracy, macro precision/recall/F1, confusion matrices, inference time, parameter count,
          and model file size on the official test split. Metrics are stored under{' '}
          <code className="rounded bg-[var(--color-surface)] px-1 text-xs">ml/artifacts/evaluation/</code>.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display text-2xl text-[var(--color-ink)]">Technology stack</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Frontend: React, Vite, TypeScript, Tailwind CSS, Recharts</li>
          <li>Backend: FastAPI, Uvicorn, Pydantic</li>
          <li>ML: TensorFlow / Keras, scikit-learn, Pillow</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 text-sm text-[var(--color-ink-muted)]">
        <h2 className="font-display text-xl text-[var(--color-ink)]">Academic disclaimer</h2>
        <p className="mt-2">
          This is an academic demonstration system for coursework / viva presentation. It is not a
          certified insurance product. Predictions can be wrong; always verify critical decisions
          with human inspection. CarDD licensing terms apply to the dataset.
        </p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[var(--color-surface)] p-4 text-xs">
{`@ARTICLE{CarDD,
  author={Wang, Xinkuang and Li, Wenjing and Wu, Zhongcheng},
  journal={IEEE Transactions on Intelligent Transportation Systems},
  title={CarDD: A New Dataset for Vision-Based Car Damage Detection},
  year={2023}, volume={24}, number={7}, pages={7202-7214},
  doi={10.1109/TITS.2023.3258480}
}`}
        </pre>
      </section>
    </div>
  )
}
