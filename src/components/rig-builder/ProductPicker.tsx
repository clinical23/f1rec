'use client'

import { useMemo, useState } from 'react'
import type { RigProduct } from './types'
import { displayRating, formatGbp } from './utils'

type SortMode = 'price-asc' | 'price-desc' | 'rating'

type Props = {
  open: boolean
  title: string
  products: RigProduct[]
  onClose: () => void
  onSelect: (p: RigProduct) => void
}

export default function ProductPicker({ open, title, products, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState<string>('all')
  const [sort, setSort] = useState<SortMode>('price-asc')

  const brands = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.brand) set.add(p.brand)
    }
    return ['all', ...[...set].sort((a, b) => a.localeCompare(b))]
  }, [products])

  const filtered = useMemo(() => {
    let rows = products
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.short_description && p.short_description.toLowerCase().includes(q))
      )
    }
    if (brand !== 'all') {
      rows = rows.filter((p) => p.brand === brand)
    }
    rows = [...rows].sort((a, b) => {
      if (sort === 'price-asc') return (a.price_gbp ?? 1e12) - (b.price_gbp ?? 1e12)
      if (sort === 'price-desc') return (b.price_gbp ?? -1) - (a.price_gbp ?? -1)
      return (displayRating(b) ?? -1) - (displayRating(a) ?? -1)
    })
    return rows
  }, [products, search, brand, sort])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/60 lg:bg-black/40"
        aria-label="Close picker"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[70] flex justify-end lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:w-full lg:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rig-picker-title"
      >
        <div className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg2)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 id="rig-picker-title" className="font-display text-lg font-extrabold uppercase text-[var(--text)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Close
            </button>
          </div>
          <div className="border-b border-[var(--border)] bg-[var(--bg3)] p-3 space-y-2">
            <input
              type="search"
              placeholder="Search name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-xs text-[var(--text)]"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b === 'all' ? 'All brands' : b}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-xs text-[var(--text)]"
              >
                <option value="price-asc">Price low → high</option>
                <option value="price-desc">Price high → low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 ? (
              <li className="py-8 text-center text-sm text-[var(--muted)]">No products match.</li>
            ) : (
              filtered.map((p) => {
                const rt = displayRating(p)
                const desc = p.short_description?.slice(0, 100) ?? ''
                return (
                  <li
                    key={p.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display font-bold text-[var(--text)]">{p.name}</p>
                        <p className="text-xs text-[var(--muted)]">{p.brand ?? '—'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-semibold text-[var(--gold)]">{formatGbp(p.price_gbp)}</p>
                        {rt != null ? (
                          <p className="font-mono text-xs text-[var(--gold)]">★ {rt.toFixed(1)}</p>
                        ) : null}
                      </div>
                    </div>
                    {desc ? <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{desc}…</p> : null}
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(p)
                        onClose()
                      }}
                      className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2 font-display text-xs font-bold uppercase tracking-wider text-white hover:opacity-90"
                    >
                      Select
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>
    </>
  )
}
