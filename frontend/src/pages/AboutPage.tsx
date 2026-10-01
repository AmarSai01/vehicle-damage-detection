import { PageHeader } from '../components/PageHeader'
import { LABEL_STRATEGY, LABEL_STRATEGY_SUMMARY, SPLIT_COUNTS } from '../data/academicFacts'

export function AboutPage() {
  return (
    <div className="page-shell">
      <div className="section-stack mx-auto max-w-3xl">
      <PageHeader
        title="About / Project"
        subtitle="Academic full-stack system for vehicle damage classification on CarDD using exactly two deep-learning models."
      />

      {[
        {
          title: 'Problem statement',
          body: (
            <p className="m-0">
              Manual inspection of vehicle damage is slow and inconsistent. Vision models can triage
              common exterior damage types from photographs for insurance and workshop workflows.
            </p>
          ),
        },
        {
          title: 'Objective',
          body: (
            <p className="m-0">
              Build a reproducible pipeline that trains a Custom CNN from scratch and MobileNetV2 via
              transfer learning on the same CarDD splits, evaluates them fairly, and serves real
              inference through a professional web interface.
            </p>
          ),
        },
        {
          title: 'Dataset',
          body: (
            <>
              <p className="m-0">
                CarDD (Wang, Li &amp; Wu, 2023) — six classes: dent, scratch, crack, glass shatter,
                lamp broken, tire flat. Access requires PIC Lab consent. This project does not
                redistribute the dataset.
              </p>
              <p className="m-0 mt-2">{LABEL_STRATEGY_SUMMARY}</p>
            </>
          ),
        },
        {
          title: 'Evaluation facts',
          body: (
            <ul className="m-0 list-disc space-y-2 pl-5">
              <li>
                Both models use the{' '}
                <strong className="text-[var(--color-ink)]">same official split indexes</strong>{' '}
                (source: CarDD COCO official; label strategy{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{LABEL_STRATEGY}</code>
                ).
              </li>
              <li>
                Split sizes: train{' '}
                <strong className="text-[var(--color-ink)]">{SPLIT_COUNTS.train}</strong>,
                validation <strong className="text-[var(--color-ink)]">{SPLIT_COUNTS.val}</strong>,
                held-out test{' '}
                <strong className="text-[var(--color-ink)]">{SPLIT_COUNTS.test}</strong> images.
              </li>
              <li>
                Reported accuracies, macro precision/recall/F1, confusion matrices, and resource
                metrics come only from evaluation artifacts under{' '}
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">
                  ml/artifacts/evaluation/
                </code>{' '}
                — never invented in the UI.
              </li>
              <li>
                Fair comparison: same six classes, same split file, comparable 224×224 inputs, shared
                metrics code path.
              </li>
            </ul>
          ),
        },
        {
          title: 'Methodology',
          body: (
            <p className="m-0">
              Inspect → prepare official split indexes → train both models → evaluate on the held-out
              test set → serve predictions via FastAPI with model-specific preprocessing.
            </p>
          ),
        },
        {
          title: 'Custom CNN',
          body: (
            <p className="m-0">
              Scratch TensorFlow/Keras CNN: four Conv-BN-ReLU blocks (32→256), pooling, dropout,
              dense head, softmax over six classes. No pretrained backbone.
            </p>
          ),
        },
        {
          title: 'MobileNetV2',
          body: (
            <p className="m-0">
              ImageNet-pretrained MobileNetV2 backbone with a custom classification head. Phase 1
              freezes the base; Phase 2 fine-tunes upper layers at a lower learning rate.
            </p>
          ),
        },
        {
          title: 'Evaluation',
          body: (
            <p className="m-0">
              Accuracy, macro precision/recall/F1, confusion matrices, inference time, parameter
              count, and model file size on the official test split. Metrics are stored under{' '}
              <code className="rounded bg-[var(--color-surface)] px-1 text-xs">
                ml/artifacts/evaluation/
              </code>
              .
            </p>
          ),
        },
        {
          title: 'Limitations',
          body: (
            <ul className="m-0 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--color-ink)]">Class imbalance:</strong> crack is rare
                (only 8 test images after image-level label reduction), so per-class metrics for
                crack are unstable and often weak.
              </li>
              <li>
                Multi-instance COCO scenes are reduced to a single image-level label (
                <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{LABEL_STRATEGY}</code>
                ), which is a documented approximation for classification.
              </li>
              <li>
                There is <strong className="text-[var(--color-ink)]">no “no damage” class</strong> —
                CarDD does not provide a genuine undamaged category; inventing one would be
                dishonest.
              </li>
              <li>
                A high-confidence prediction on one uploaded photo is{' '}
                <strong className="text-[var(--color-ink)]">not</strong> the same as held-out test
                accuracy; single-image outputs can still be wrong.
              </li>
              <li>
                This is a <strong className="text-[var(--color-ink)]">local academic demo</strong>,
                not a hardened multi-tenant or certified insurance product.
              </li>
            </ul>
          ),
        },
        {
          title: 'Technology stack',
          body: (
            <ul className="m-0 list-disc space-y-1 pl-5">
              <li>Frontend: React, Vite, TypeScript, Tailwind CSS, Recharts</li>
              <li>Backend: FastAPI, Uvicorn, Pydantic</li>
              <li>ML: TensorFlow / Keras, scikit-learn, Pillow</li>
            </ul>
          ),
        },
      ].map((section) => (
        <section key={section.title} className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
          <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">{section.title}</h2>
          <div className="mt-3">{section.body}</div>
        </section>
      ))}

      <section className="panel panel-pad text-sm text-[var(--color-ink-muted)]">
        <h2 className="font-display m-0 text-xl text-[var(--color-ink)]">Academic disclaimer</h2>
        <p className="m-0 mt-2">
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
    </div>
  )
}
