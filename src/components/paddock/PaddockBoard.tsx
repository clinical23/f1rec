'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type PaddockItem = {
  id: string
  title: string | null
  content: string | null
  category: string | null
  youtube_id: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

type TabKey = 'all' | 'behind-scenes' | 'driver-life' | 'logistics' | 'teds-notebook' | 'trending'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'behind-scenes', label: 'Behind the Scenes' },
  { key: 'driver-life', label: 'Driver Life' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'teds-notebook', label: "Ted's Notebook" },
  { key: 'trending', label: 'Trending' },
]

function normalizeCategory(category: string | null): string {
  return (category ?? '').toLowerCase()
}

function tabMatches(tab: TabKey, item: PaddockItem): boolean {
  const category = normalizeCategory(item.category)
  if (tab === 'all') return true
  if (tab === 'behind-scenes') return category === 'behind-scenes' || category === 'factory-tour'
  if (tab === 'driver-life') return category === 'driver-life'
  if (tab === 'logistics') return category === 'logistics'
  if (tab === 'teds-notebook') return category === 'teds-notebook'
  if (tab === 'trending') return category === 'trending' || category === 'social-viral'
  return false
}

function preview(text: string | null): string {
  const content = (text ?? '').trim()
  if (!content) return 'No preview available.'
  return content.length > 150 ? `${content.slice(0, 150)}...` : content
}

export default function PaddockBoard({ items }: { items: PaddockItem[] }) {
  const [tab, setTab] = useState<TabKey>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const visible = useMemo(() => items.filter((item) => tabMatches(tab, item)), [items, tab])

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`rounded border px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-wide ${
              tab === entry.key
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--muted)]'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((item) => {
            const isTed = normalizeCategory(item.category) === 'teds-notebook'
            const isOpen = expanded[item.id] === true
            return (
              <article
                key={item.id}
                className={`rounded-xl border bg-[var(--bg2)] p-4 ${
                  isTed
                    ? 'border-[color-mix(in_srgb,var(--gold)_60%,transparent)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wider ${
                      isTed
                        ? 'bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)]'
                        : 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]'
                    }`}
                  >
                    {item.category ?? 'paddock'}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold uppercase text-[var(--text)]">{item.title ?? 'Untitled'}</h3>
                {item.youtube_id ? (
                  <a
                    href={`https://youtube.com/watch?v=${item.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`}
                      alt={item.title ?? 'Paddock video'}
                      className="h-auto w-full rounded-lg border border-[var(--border)]"
                    />
                  </a>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{isOpen ? item.content : preview(item.content)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !isOpen }))}
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]"
                  >
                    {isOpen ? 'Show less' : 'Read more'}
                  </button>
                  {item.related_driver_slug ? (
                    <Link href={`/drivers/${item.related_driver_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                      Related driver →
                    </Link>
                  ) : null}
                  {item.related_team_slug ? (
                    <Link href={`/teams/${item.related_team_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                      Related team →
                    </Link>
                  ) : null}
                </div>
                {isTed ? (
                  <p className="mt-3 rounded border border-[color-mix(in_srgb,var(--gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-3 py-2 text-xs text-[var(--muted)]">
                    An honorary section for the best paddock journalist in F1. We love you, Ted.
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg2)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No paddock stories in this category yet.
        </p>
      )}
    </>
  )
}
