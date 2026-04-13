'use client'

import type { RigProduct } from './types'
import { displayRating, formatGbp } from './utils'

type SlotMeta = {
  key: string
  label: string
  icon: string
  required: boolean
  multiple: boolean
}

type Props = {
  slot: SlotMeta
  value: RigProduct | RigProduct[] | null
  onChoose: () => void
  onChange: () => void
  onClear: () => void
  onRemoveAccessory?: (id: string) => void
  onAddAnother?: () => void
}

function ProductBlock({
  p,
  onRemove,
  showRemove,
}: {
  p: RigProduct
  onRemove?: () => void
  showRemove?: boolean
}) {
  const rt = displayRating(p)
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.image_url}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg3)] object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text)]">
          {p.name} <span className="font-mono text-[var(--gold)]">{formatGbp(p.price_gbp)}</span>
        </p>
        {p.brand ? <p className="text-xs text-[var(--muted)]">{p.brand}</p> : null}
        {rt != null ? (
          <p className="mt-0.5 font-mono text-xs text-[var(--gold)]">★ {rt.toFixed(1)}</p>
        ) : null}
      </div>
      {showRemove && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Remove"
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}

export default function CategorySlot({
  slot,
  value,
  onChoose,
  onChange,
  onClear,
  onRemoveAccessory,
  onAddAnother,
}: Props) {
  const empty = !value || (Array.isArray(value) && value.length === 0)
  const chooseLabel = `Choose ${slot.label}`

  if (empty) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--bg2)_90%,transparent)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {slot.icon}
          </span>
          <span className="font-display font-bold uppercase tracking-wide text-[var(--text)]">{slot.label}</span>
        </div>
        <button
          type="button"
          onClick={onChoose}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          + {chooseLabel}
        </button>
      </div>
    )
  }

  if (slot.multiple && Array.isArray(value)) {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {slot.icon}
            </span>
            <span className="font-display font-bold uppercase tracking-wide text-[var(--text)]">{slot.label}</span>
          </div>
          <div className="flex gap-2">
            {onAddAnother ? (
              <button
                type="button"
                onClick={onAddAnother}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                + Add
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--accent)]"
              aria-label="Clear all"
            >
              ✕
            </button>
          </div>
        </div>
        <ul className="space-y-3">
          {value.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
              <ProductBlock
                p={p}
                showRemove
                onRemove={onRemoveAccessory ? () => onRemoveAccessory(p.id) : undefined}
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const single = value as RigProduct
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden>
          {slot.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{slot.label}</p>
          <div className="mt-1">
            <ProductBlock p={single} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={onChange}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--blue)]"
          aria-label="Change product"
        >
          🔄
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
