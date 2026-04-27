import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import RaceSidebar from '@/components/races/RaceSidebar'
import { CountdownTimer } from '@/components/races/CountdownTimer'

type PageProps = { params: Promise<{ slug: string }> }

type ResultRow = {
  id: string
  position: number | null
  driver_slug: string | null
  driver_name: string | null
  constructor_slug: string | null
  constructor_name: string | null
  grid: number | null
  points: number | null
  status: string | null
  time_text: string | null
}

function formatLongDate(value: string | null) {
  if (!value) return 'TBC'
  return new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDate(value: string | null) {
  if (!value) return 'TBC'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function rowStyle(position: number | null) {
  if (position === 1) return { background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }
  if (position === 2 || position === 3) return { background: 'rgba(255,255,255,0.02)' }
  return {}
}

function normalizePastWinnerRows(
  rows: Array<{ slug: string | null; season_year: number | null; race_date: string | null }>,
  winnersByRace: Map<string, { winner_name: string; winner_slug: string }>
) {
  return rows
    .filter((row): row is { slug: string; season_year: number; race_date: string | null } => typeof row.slug === 'string' && typeof row.season_year === 'number')
    .map((row) => {
      const winner = winnersByRace.get(row.slug)
      return {
        slug: row.slug,
        season_year: row.season_year,
        winner_name: winner?.winner_name ?? 'Unknown',
        winner_slug: winner?.winner_slug ?? '',
      }
    })
    .filter((row) => row.winner_slug)
}

export default async function RacePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: race, error } = await supabase.from('races').select('*').eq('slug', slug).maybeSingle()
  if (error || !race) notFound()

  const raceDateObj = race.race_date ? new Date(String(race.race_date)) : null
  const now = new Date()
  const isUpcoming = raceDateObj ? raceDateObj > now : false
  const isCompleted = !isUpcoming

  const [circuitRes, resultsRes, blogPostRes, lastYearRaceRes, pastRacesRes] = await Promise.all([
    race.circuit_slug
      ? supabase.from('circuits').select('slug, name, country').eq('slug', String(race.circuit_slug)).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('results')
      .select('id, position, driver_slug, driver_name, constructor_slug, constructor_name, grid, points, status, time_text, is_sprint')
      .eq('race_slug', slug)
      .eq('is_sprint', false)
      .order('position', { ascending: true }),
    supabase
      .from('posts')
      .select('slug, title, published_at, excerpt, category')
      .eq('related_race_slug', slug)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    isUpcoming && race.circuit_slug && race.race_date
      ? supabase
          .from('races')
          .select('slug, name, race_date, season_year')
          .eq('circuit_slug', String(race.circuit_slug))
          .lt('race_date', String(race.race_date))
          .order('race_date', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    race.circuit_slug
      ? supabase
          .from('races')
          .select('slug, season_year, race_date')
          .eq('circuit_slug', String(race.circuit_slug))
          .neq('slug', slug)
          .order('season_year', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ])

  const results = (resultsRes.data ?? []) as ResultRow[]
  const winner = results.find((row) => row.position === 1) ?? null

  const pastRaceSlugs = (pastRacesRes.data ?? [])
    .map((row) => (typeof row.slug === 'string' ? row.slug : null))
    .filter((v): v is string => Boolean(v))

  const [pastWinnersRes, lastYearWinnerRes] = await Promise.all([
    pastRaceSlugs.length > 0
      ? supabase.from('results').select('race_slug, driver_name, driver_slug').in('race_slug', pastRaceSlugs).eq('position', 1).eq('is_sprint', false)
      : Promise.resolve({ data: [], error: null }),
    lastYearRaceRes.data?.slug
      ? supabase
          .from('results')
          .select('driver_name, driver_slug')
          .eq('race_slug', String(lastYearRaceRes.data.slug))
          .eq('position', 1)
          .eq('is_sprint', false)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const winnersByRace = new Map<string, { winner_name: string; winner_slug: string }>()
  for (const row of pastWinnersRes.data ?? []) {
    if (typeof row.race_slug !== 'string' || typeof row.driver_slug !== 'string' || typeof row.driver_name !== 'string') continue
    if (!winnersByRace.has(row.race_slug)) {
      winnersByRace.set(row.race_slug, { winner_name: row.driver_name, winner_slug: row.driver_slug })
    }
  }

  const pastWinners = normalizePastWinnerRows((pastRacesRes.data ?? []) as Array<{ slug: string | null; season_year: number | null; race_date: string | null }>, winnersByRace)

  const raceName = String(race.name ?? race.full_name ?? 'Grand Prix')
  const circuitName = String(circuitRes.data?.name ?? race.circuit_slug ?? '')
  const country = (circuitRes.data?.country as string | null) ?? null
  const seasonYear = typeof race.season_year === 'number' ? race.season_year : null
  const round = typeof race.round === 'number' ? race.round : null
  const reviewPost = blogPostRes.data
    ? {
        slug: String(blogPostRes.data.slug),
        title: String(blogPostRes.data.title),
        published_at: String(blogPostRes.data.published_at),
        excerpt: (blogPostRes.data.excerpt as string | null) ?? null,
        category: (blogPostRes.data.category as string | null) ?? null,
      }
    : null

  return (
    <main data-race-slug={slug} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-[var(--text)]">
            Home
          </Link>
          <span aria-hidden>›</span>
          <Link href="/races" className="transition-colors hover:text-[var(--text)]">
            Races
          </Link>
          <span aria-hidden>›</span>
          <span className="text-[var(--text)]">{raceName}</span>
        </nav>
      </section>

      <header className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-3 text-sm uppercase tracking-widest text-[var(--accent)]">Round {round ?? '—'} · {seasonYear ?? 'N/A'} Season</div>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">{raceName}</h1>

        {isUpcoming ? (
          <>
            <div className="mt-4 text-xl text-[var(--muted)]">{circuitName}</div>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              {race.race_date ? <CountdownTimer raceDate={String(race.race_date)} /> : null}
              <div className="text-sm text-[var(--muted)]">
                <div className="text-xs uppercase tracking-widest text-[var(--gold)]">Race Day</div>
                <div className="mt-1 text-base text-[var(--text)]">{formatLongDate(race.race_date as string | null)}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 text-xl text-[var(--muted)]">
              {circuitName} · {formatLongDate(race.race_date as string | null)}
            </div>
            {winner ? (
              <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 px-5 py-3">
                <span className="text-xs uppercase tracking-widest text-[var(--gold)]">Winner</span>
                {winner.driver_slug ? (
                  <Link href={`/drivers/${winner.driver_slug}`} className="text-lg font-semibold text-[var(--text)] transition-colors hover:text-[var(--gold)]">
                    {winner.driver_name ?? 'Unknown driver'}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold text-[var(--text)]">{winner.driver_name ?? 'Unknown driver'}</span>
                )}
                <span className="text-sm text-[var(--muted)]">· {winner.constructor_name ?? 'Unknown team'}</span>
              </div>
            ) : null}
          </>
        )}
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="blog-layout">
          <div className="blog-layout__main">
            {isUpcoming ? (
              <div className="flex flex-col gap-4">
                {reviewPost && reviewPost.category === 'season-preview' ? (
                  <div className="blog-card">
                    <div className="blog-card__eyebrow">What To Watch</div>
                    <div className="blog-card__title">{reviewPost.title}</div>
                    {reviewPost.excerpt ? <div className="blog-card__meta">{reviewPost.excerpt}</div> : null}
                    <Link href={`/blog/${reviewPost.slug}`} className="blog-card__cta">
                      Read season preview
                    </Link>
                  </div>
                ) : null}

                {lastYearRaceRes.data ? (
                  <Link href={`/races/${String(lastYearRaceRes.data.slug)}`} className="blog-card">
                    <div className="blog-card__eyebrow">Last Year At {circuitName}</div>
                    <div className="blog-card__title">
                      {lastYearRaceRes.data.season_year} {lastYearRaceRes.data.name}
                    </div>
                    <div className="blog-card__meta">
                      Won by {lastYearWinnerRes.data?.driver_name ?? 'Unknown'} · {formatDate(lastYearRaceRes.data.race_date as string | null)}
                    </div>
                  </Link>
                ) : null}

                <div className="blog-card">
                  <div className="blog-card__eyebrow">Past Winners</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', paddingBottom: '0.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Season</th>
                          <th style={{ textAlign: 'left', paddingBottom: '0.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastWinners.map((item) => (
                          <tr key={`${item.slug}-${item.season_year}`} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.55rem 0.25rem 0.55rem 0', color: 'var(--muted)' }}>{item.season_year}</td>
                            <td style={{ padding: '0.55rem 0' }}>
                              <Link href={`/drivers/${item.winner_slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                                {item.winner_name}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="blog-card">
                  <div className="blog-card__eyebrow">Race Results</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                      <thead>
                        <tr>
                          {['Pos', 'Driver', 'Team', 'Grid', 'Points', 'Status', 'Time/Gap'].map((h) => (
                            <th key={h} style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)', textAlign: h === 'Driver' || h === 'Team' ? 'left' : 'right', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', ...rowStyle(row.position) }}>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: row.position === 1 ? 'var(--gold)' : 'var(--muted)' }}>
                              {row.position ?? '—'}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              {row.driver_slug ? (
                                <Link href={`/drivers/${row.driver_slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                                  {row.driver_name ?? 'Unknown'}
                                </Link>
                              ) : (
                                <span>{row.driver_name ?? 'Unknown'}</span>
                              )}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', color: 'var(--muted)' }}>
                              {row.constructor_slug ? (
                                <Link href={`/teams/${row.constructor_slug}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                                  {row.constructor_name ?? '—'}
                                </Link>
                              ) : (
                                <span>{row.constructor_name ?? '—'}</span>
                              )}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{row.grid ?? '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{row.points ?? '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--muted)' }}>{row.status ?? '—'}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {row.status && row.status.toUpperCase().includes('DNF') ? row.status : row.time_text ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {reviewPost ? (
                  <Link href={`/blog/${reviewPost.slug}`} className="blog-card">
                    <div className="blog-card__eyebrow">Race Review</div>
                    <div className="blog-card__title">{reviewPost.title}</div>
                    {reviewPost.excerpt ? <div className="blog-card__meta">{reviewPost.excerpt}</div> : null}
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <aside className="blog-layout__sidebar">
            <RaceSidebar
              race={{
                slug: String(race.slug ?? slug),
                name: raceName,
                season_year: seasonYear,
                round,
                race_date: (race.race_date as string | null) ?? null,
                country,
                circuit_name: circuitName || null,
              }}
              isUpcoming={isUpcoming}
              pastWinners={pastWinners}
              blogPost={reviewPost ? { slug: reviewPost.slug, title: reviewPost.title, published_at: reviewPost.published_at } : null}
            />
          </aside>
        </div>
      </section>
    </main>
  )
}
