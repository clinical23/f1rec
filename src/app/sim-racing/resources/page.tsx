import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import EmailCapture from '@/components/EmailCapture'

export const metadata: Metadata = {
  title: 'Sim Racing Resources — Tools, Mods & Communities | F1Rec',
  description:
    'Essential sim racing software, overlays, mods, and communities. SimHub, Content Manager, CrewChief, and more.',
}

type SimResource = {
  id: string
  name: string | null
  category: string | null
  url: string | null
  description: string | null
  is_free: boolean | null
  platform: string | null
  sort_order: number | null
  is_active: boolean | null
}

function sectionForCategory(category: string | null): string {
  const key = (category ?? '').toLowerCase()
  if (key === 'software') return 'Essential Software'
  if (key === 'overlay' || key === 'tool') return 'Overlays & Telemetry'
  if (key === 'modding') return 'Modding'
  if (key === 'community') return 'Communities'
  if (key === 'league') return 'Competitive Leagues'
  if (key === 'patreon') return 'Patreon Creators'
  return 'Essential Software'
}

const SECTION_ORDER = [
  'Essential Software',
  'Overlays & Telemetry',
  'Modding',
  'Communities',
  'Competitive Leagues',
  'Patreon Creators',
] as const

export default async function SimResourcesPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('sim_resources')
    .select('id, name, category, url, description, is_free, platform, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[sim-resources] failed to load resources', error)
  }

  const rows = (data ?? []) as SimResource[]
  const grouped = new Map<string, SimResource[]>()
  for (const item of rows) {
    const section = sectionForCategory(item.category)
    const list = grouped.get(section) ?? []
    list.push(item)
    grouped.set(section, list)
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-16 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Sim Racing Hub</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[var(--text)] hero-title">
          Sim Racing Resources
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm text-[var(--muted)]">
          Every tool, overlay, mod, and community you need to race smarter and faster.
        </p>
        <div className="mt-5 flex justify-center gap-3 text-xs font-semibold uppercase tracking-wide">
          <Link href="/sim-racing" className="text-[var(--accent)] no-underline hover:underline">
            Sim Hub →
          </Link>
          <Link href="/sim-racing/setups" className="text-[var(--accent)] no-underline hover:underline">
            Setups →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-16">
        {SECTION_ORDER.map((section) => {
          const entries = grouped.get(section) ?? []
          if (entries.length === 0) return null

          return (
            <section key={section} className="mb-12 border-t border-[#2a2a3a] pt-12">
              <h2 className="mb-8 font-display text-xl font-extrabold tracking-wide text-[var(--text)]">
                {section}
              </h2>
              {section === 'Modding' ? (
                <p className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
                  Content Manager + Custom Shaders Patch is still the go-to combo for a modernized AC modding stack.
                </p>
              ) : null}
              <div className="grid gap-6 md:grid-cols-2">
                {entries.map((item) => (
                  <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text)]">
                        {item.name ?? 'Resource'}
                      </span>
                      <span className="rounded bg-[var(--bg3)] px-2 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wider text-[var(--muted)]">
                        {item.platform ?? 'Multi'}
                      </span>
                      <span
                        className={`rounded px-2 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wider ${
                          item.is_free
                            ? 'bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)]'
                            : 'bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)]'
                        }`}
                      >
                        {item.is_free ? 'Free' : 'Paid'}
                      </span>
                      {section === 'Patreon Creators' ? (
                        <span className="rounded bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wider text-[var(--accent)]">
                          Paid
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--muted)]">{item.description ?? 'No description available.'}</p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline"
                      >
                        Open Resource →
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          )
        })}

        <section className="max-w-3xl">
          <EmailCapture source="sim-resources" />
        </section>
      </div>
    </main>
  )
}
