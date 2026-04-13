'use client'

import type { RigPresetRow, RigProduct } from './types'

const TIER_BAND: Record<string, string> = {
  budget: '~£500',
  'mid-range': '~£2,000',
  'high-end': '~£5,000',
  ultimate: '~£10,000+',
}

const TIER_EMOJI: Record<string, string> = {
  budget: '🟢',
  'mid-range': '🔵',
  'high-end': '🟠',
  ultimate: '🔴',
}

type Props = {
  presets: RigPresetRow[]
  productById: Record<string, RigProduct>
  onApplyPreset: (productIds: string[]) => void
}

export default function PresetCards({ presets, productById, onApplyPreset }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {presets.map((preset) => {
        const ids = Array.isArray(preset.product_ids) ? preset.product_ids.filter(Boolean) : []
        const ready = ids.length > 0 && ids.every((id) => productById[id])
        const band = TIER_BAND[preset.tier] ?? ''
        const emoji = TIER_EMOJI[preset.tier] ?? '⚪'

        return (
          <div
            key={preset.id}
            className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {emoji}
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {preset.tier.replace('-', ' ')}
              </span>
            </div>
            <h3 className="font-display text-lg font-extrabold uppercase text-[var(--text)]">{preset.name}</h3>
            <p className="mt-1 font-mono text-sm text-[var(--gold)]">{band}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
              {preset.description ?? 'Curated component list for this tier.'}
            </p>
            <button
              type="button"
              disabled={!ready}
              onClick={() => ready && onApplyPreset(ids)}
              className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--bg3)] py-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text)] transition-opacity hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text)]"
            >
              {ready ? 'Start with this →' : 'Coming soon'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
