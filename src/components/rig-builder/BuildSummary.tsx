'use client'

import { useState } from 'react'
import type { RigProduct } from './types'
import { REQUIRED_KEYS } from './types'
import { formatGbp, productListFromBuild, sumBuildPrice } from './utils'

type Build = Record<string, RigProduct | RigProduct[] | null>

type Props = {
  build: Build
  brandWebsiteByName: Map<string, string>
}

function buyUrl(p: RigProduct, brandWebsiteByName: Map<string, string>): string | null {
  if (p.affiliate_url) return p.affiliate_url
  const b = p.brand?.trim()
  if (b) {
    const u = brandWebsiteByName.get(b.toLowerCase())
    if (u) return u
  }
  return null
}

export default function BuildSummary({ build, brandWebsiteByName }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)

  const items = productListFromBuild(build)
  const total = sumBuildPrice(build)
  const requiredFilled = REQUIRED_KEYS.filter((k) => {
    const v = build[k]
    if (v == null) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length
  const missing = REQUIRED_KEYS.filter((k) => {
    const v = build[k]
    if (v == null) return true
    if (Array.isArray(v)) return v.length === 0
    return false
  })
  const missingLabels: Record<string, string> = {
    'wheel-bases': 'Wheel Base',
    pedals: 'Pedals',
    rigs: 'Rig / Cockpit',
    'steering-wheels': 'Steering Wheel',
  }

  async function handleShare() {
    const ids = items.map((p) => p.id).join(',')
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/sim-racing/rig-builder?b=${encodeURIComponent(ids)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy build link:', url)
    }
  }

  const summaryInner = (
    <>
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-[var(--text)]">Your build</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Pick components to see pricing.</p>
      ) : (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm lg:max-h-64">
          {items.map((p) => (
            <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] border-opacity-50 pb-2 last:border-0">
              <span className="min-w-0 truncate text-[var(--text)]">{p.name}</span>
              <span className="shrink-0 font-mono text-xs text-[var(--gold)]">{formatGbp(p.price_gbp)}</span>
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--accent)]">
          Missing: {missing.map((k) => missingLabels[k] ?? k).join(', ')}
        </p>
      ) : null}

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Total</p>
        <p className="font-mono text-2xl font-bold text-[var(--gold)]">{formatGbp(total)}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {requiredFilled} of {REQUIRED_KEYS.length} required
          {items.length > requiredFilled ? ` · ${items.length} components` : ''}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={items.length === 0}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg3)] py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-40"
        >
          {copied ? 'Copied link!' : 'Share build'}
        </button>
        <button
          type="button"
          onClick={() => setBuyOpen((o) => !o)}
          disabled={items.length === 0}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-40"
        >
          Buy components
        </button>
      </div>

      {buyOpen && items.length > 0 ? (
        <ul className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3 text-sm">
          {items.map((p) => {
            const href = buyUrl(p, brandWebsiteByName)
            return (
              <li key={`buy-${p.id}`}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    {p.name} →
                  </a>
                ) : (
                  <span className="text-[var(--muted)]">{p.name} (no link)</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </>
  )

  return (
    <>
      {/* Desktop sticky */}
      <aside className="sticky top-24 hidden h-fit rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 lg:block">
        {summaryInner}
      </aside>

      {/* Mobile bar + drawer */}
      <div className="lg:hidden">
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg2)] px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Total</p>
              <p className="font-mono text-lg font-bold text-[var(--gold)]">{formatGbp(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white"
            >
              View build
            </button>
          </div>
        </div>

        {drawerOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-50 bg-black/50"
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-[55] max-h-[75vh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--bg2)] p-5 pb-24"
              style={{ paddingBottom: 'max(6rem, env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
              {summaryInner}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-4 w-full rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--muted)]"
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
