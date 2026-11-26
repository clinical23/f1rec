import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import PageHead from '@/components/page/PageHead'
import Countdown from '@/components/weekend/Countdown'
import TrackMap from '@/components/weekend/TrackMap'
import { circuitShape, getWinsAtCircuit } from '@/lib/weekend'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { finishLabel } from '@/lib/results'

type PageProps = { params: Promise<{ slug: string }> }

/** Race pages change only when a result lands, so an hour is plenty; the countdown ticks in the browser. */
export const revalidate = 3600

type ResultRow = {
  id: string
  position_text?: string | null
  session_type?: string | null
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServerClient()
  const { data: race } = await supabase
    .from('races')
    .select('id, name, full_name, season_year, race_date, circuit_slug')
    .eq('slug', slug)
    .maybeSingle()
  if (!race) return { title: 'Race not found' }
  const name = String(race.name ?? race.full_name ?? 'Grand Prix')
  const year = race.season_year ? ` ${race.season_year}` : ''
  const upcoming = race.race_date ? new Date(String(race.race_date)) > new Date() : false
  const { data: winner } = upcoming
    ? { data: null }
    : await supabase
        .from('results')
        .select('driver_name, constructor_name')
        .eq('race_id', String(race.id))
        .eq('session_type', 'race')
        .eq('position', 1)
        .maybeSingle()
  const when = race.race_date ? formatLongDate(String(race.race_date)) : ''
  const description = upcoming
    ? `${name}${year}: date, start time and circuit, plus past winners at this track.${when ? ` ${when}.` : ''}`
    : winner?.driver_name
      ? `${name}${year} results: ${winner.driver_name}${winner.constructor_name ? ` (${winner.constructor_name})` : ''} won. Full finishing order, grid, points and race times.`
      : `${name}${year} results: full finishing order, grid, points and race times.`
  const title = `${name}${year} ${upcoming ? 'Preview' : 'Results'}`
  return {
    title,
    description,
    alternates: { canonical: `/races/${slug}` },
    openGraph: { title: `${title} | Sunday Grid`, description, url: `/races/${slug}` },
  }
}

const ukTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })

const plate = (name: string) => name.replace(/ Grand Prix$/i, ' GP')

function ResultsTable({ rows, kind }: { rows: ResultRow[]; kind: 'race' | 'sprint' | 'qualifying' }) {
  return (
    <div className="pg-scroll">
      <table className="pg-table">
        <thead>
          <tr>
            <th className="n">Pos</th>
            <th>Driver</th>
            <th className="hide-sm">Team</th>
            {kind !== 'qualifying' && <th className="n hide-sm">Grid</th>}
            <th className="n">{kind === 'qualifying' ? 'Best time' : 'Time or gap'}</th>
            {kind !== 'qualifying' && <th className="n">Pts</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const finished = !r.status || /^(finished|\+\d+ laps?|lapped)$/i.test(r.status)
            const gap = r.time_text?.trim() || (finished ? '—' : r.status)
            const { label, classified } = finishLabel(r.position, r.position_text)
            const gained = kind !== 'qualifying' && r.grid && r.position ? r.grid - r.position : 0
            return (
              <tr key={r.id} className={r.position === 1 ? 'p1' : undefined}>
                <td className={`pos n${classified ? '' : ' muted'}`} style={classified ? undefined : { fontSize: 15 }}>{label}</td>
                <td>
                  {r.driver_slug ? <Link href={`/drivers/${r.driver_slug}`}>{r.driver_name ?? 'Unknown'}</Link> : r.driver_name ?? 'Unknown'}
                  <span className="sub show-sm">{r.constructor_name ?? ''}</span>
                </td>
                <td className="hide-sm">
                  {r.constructor_slug ? <Link href={`/teams/${r.constructor_slug}`} style={{ fontWeight: 500 }}>{r.constructor_name}</Link> : r.constructor_name ?? '—'}
                </td>
                {kind !== 'qualifying' && (
                  <td className="n hide-sm muted">
                    {r.grid === 0 ? 'Pit lane' : r.grid ?? '—'}
                    {gained > 0 && <span style={{ color: 'var(--green)', marginLeft: 6 }}>+{gained}</span>}
                  </td>
                )}
                <td className={`n${finished ? '' : ' muted'}`}>{gap}</td>
                {kind !== 'qualifying' && <td className="n">{r.points ? Number(r.points) : ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function RacePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: race, error } = await supabase.from('races').select('*').eq('slug', slug).maybeSingle()
  if (error || !race) notFound()

  const raceId = String(race.id)
  const date = race.race_date ? String(race.race_date) : null
  const time = race.race_time ? String(race.race_time) : null
  const startIso = date ? `${date}T${time ? (time.endsWith('Z') ? time : `${time}Z`) : '12:00:00Z'}` : null
  const now = new Date()
  const isUpcoming = startIso ? new Date(startIso).getTime() + 3 * 3600_000 > now.getTime() : false
  const seasonYear = typeof race.season_year === 'number' ? race.season_year : null

  const [circuitRes, resultsRes, seasonRacesRes, wins] = await Promise.all([
    race.circuit_slug
      ? supabase.from('circuits').select('slug, name, country, locality, turns, total_length_km, lap_record_time, lap_record_driver, lap_record_year').eq('slug', String(race.circuit_slug)).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('results')
      .select('id, session_type, position, position_text, driver_slug, driver_name, constructor_slug, constructor_name, grid, points, status, time_text, is_sprint')
      .eq('race_id', raceId)
      .order('position', { ascending: true }),
    seasonYear
      ? supabase.from('races').select('slug, name, race_date').eq('season_year', seasonYear).order('race_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    getWinsAtCircuit(race.circuit_slug ? String(race.circuit_slug) : null).catch(() => []),
  ])

  const all = (resultsRes.data ?? []) as ResultRow[]
  const raceRows = all.filter((r) => (r.session_type ?? 'race') === 'race' && !(r as { is_sprint?: boolean }).is_sprint)
  const sprintRows = all.filter((r) => r.session_type === 'sprint' || (r as { is_sprint?: boolean }).is_sprint)
  const qualiRows = all.filter((r) => r.session_type === 'qualifying')
  const winner = raceRows.find((r) => r.position === 1) ?? null
  const pole = qualiRows.find((r) => r.position === 1) ?? null

  const raceName = String(race.name ?? race.full_name ?? 'Grand Prix')
  const circuit = circuitRes.data as Record<string, unknown> | null
  const circuitName = String(circuit?.name ?? race.circuit_slug ?? '')
  const country = (circuit?.country as string | null) ?? null
  const locality = (circuit?.locality as string | null) ?? null
  const shape = circuitShape(race.circuit_slug ? String(race.circuit_slug) : null)

  const seasonRaces = (seasonRacesRes.data ?? []) as { slug: string; name: string; race_date: string | null }[]
  const idx = seasonRaces.findIndex((r) => r.slug === slug)
  const roundNo = idx >= 0 ? idx + 1 : typeof race.round === 'number' ? race.round : null
  const prev = idx > 0 ? seasonRaces[idx - 1] : null
  const next = idx >= 0 && idx < seasonRaces.length - 1 ? seasonRaces[idx + 1] : null

  const pastWins = wins.filter((w) => w.season !== seasonYear).slice(0, 10)
  const tally = new Map<string, number>()
  for (const w of wins) tally.set(w.winner, (tally.get(w.winner) ?? 0) + 1)
  const king = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  const lengthKm = Number(circuit?.total_length_km ?? 0) || (shape?.lengthM ? shape.lengthM / 1000 : 0)

  const eventLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${raceName}${seasonYear ? ` ${seasonYear}` : ''}`,
    sport: 'Formula 1',
    startDate: startIso ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    location: circuitName ? { '@type': 'Place', name: circuitName, address: [locality, country].filter(Boolean).join(', ') || undefined } : undefined,
    url: `${SITE_URL}/races/${slug}`,
  }

  const stats = [
    ...(roundNo ? [{ value: roundNo, label: seasonRaces.length ? `of ${seasonRaces.length} rounds` : 'round' }] : []),
    ...(race.laps ? [{ value: Number(race.laps), label: 'laps' }] : !shape && lengthKm ? [{ value: lengthKm.toFixed(2), label: 'km a lap' }] : []),
    ...(winner
      ? [{ value: (winner.driver_name ?? '').split(' ').at(-1) ?? '', label: `won${winner.constructor_name ? ` for ${winner.constructor_name}` : ''}`, sig: true }]
      : pole
        ? [{ value: (pole.driver_name ?? '').split(' ').at(-1) ?? '', label: 'on pole', sig: true }]
        : []),
  ]

  return (
    <main className="pg" data-race-slug={slug}>
      <JsonLd id="race-ld" data={eventLd} />
      <PageHead
        crumbs={[
          { label: 'Sunday Grid', href: '/' },
          { label: 'Results', href: '/races' },
          ...(seasonYear ? [{ label: String(seasonYear), href: `/seasons/${seasonYear}` }] : []),
          { label: plate(raceName) },
        ]}
        title={raceName}
        small={seasonYear ?? undefined}
        lede={
          <>
            {[circuitName, locality && locality !== circuitName ? locality : null, country].filter(Boolean).join(', ')}
            {startIso ? <>. {isUpcoming ? 'Lights out ' : ''}{ukTime(startIso)} UK.</> : null}
          </>
        }
        stats={stats}
      />

      <div className="pg-body">
        <div className="pg-grid2">
          <div>
            {isUpcoming && startIso && (
              <section className="pg-panel" aria-labelledby="wk-h" style={{ background: 'var(--board)', borderColor: '#2B2F34', color: '#F2F2EC' }}>
                <h2 className="pg-h2" id="wk-h" style={{ color: '#F2F2EC', marginBottom: 14 }}>Race weekend</h2>
                <Countdown startIso={startIso} />
                <p className="pg-note" style={{ color: '#9AA1A8' }}>
                  {race.sprint_date ? 'A sprint weekend. ' : ''}Qualifying {race.qualifying_date ? new Date(String(race.qualifying_date)).toLocaleDateString('en-GB', { weekday: 'long' }) : 'the day before'}, race {new Date(startIso).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/London' })}.
                </p>
              </section>
            )}

            {raceRows.length > 0 ? (
              <section className="pg-sec" style={{ marginTop: isUpcoming ? 36 : 0 }} aria-labelledby="res-h">
                <div className="pb-ph"><h2 className="pg-h2" id="res-h">Race result</h2></div>
                <ResultsTable rows={raceRows} kind="race" />
              </section>
            ) : !isUpcoming ? (
              <p className="pg-empty">The result for this race isn&apos;t in yet. It usually lands within an hour of the chequered flag.</p>
            ) : null}

            {sprintRows.length > 0 && (
              <details className="pg-fold" style={{ marginTop: 20 }}>
                <summary><b style={{ fontSize: 26 }}>Sprint</b><span>won by {sprintRows.find((r) => r.position === 1)?.driver_name ?? '—'}</span></summary>
                <ResultsTable rows={sprintRows} kind="sprint" />
              </details>
            )}
            {qualiRows.length > 0 && (
              <details className="pg-fold" style={{ marginTop: sprintRows.length ? 0 : 20 }} open={isUpcoming}>
                <summary><b style={{ fontSize: 26 }}>Qualifying</b><span>pole: {pole?.driver_name ?? '—'}</span></summary>
                <ResultsTable rows={qualiRows} kind="qualifying" />
              </details>
            )}

            <section className="pg-sec pb-sim" style={{ borderRadius: 8, marginTop: 28 }} aria-labelledby="sim-h">
              <div style={{ position: 'relative', padding: '24px 24px 26px' }}>
                <span className="pb-tag">Sim Race Week</span>
                <h2 id="sim-h" style={{ fontSize: 'clamp(30px, 4vw, 44px)' }}>Drive {circuitName.replace(/ (International )?(Grand Prix )?Circuit$/i, '') || 'this track'} yourself</h2>
                <p className="l">Every race week, a free challenge on the same track in your own sim. Nothing paid makes you faster. Starts with round 1 of 2027.</p>
                <p style={{ marginTop: 16 }}><Link className="btn-plate" href="/sim">How Sim Race Week works</Link></p>
              </div>
            </section>
          </div>

          <aside className="pg-side" aria-label="About this race">
            {shape && (
              <div className="pg-panel" style={{ padding: 16 }}>
                <TrackMap shape={shape} label={`${circuitName} track map`} />
                <div className="pg-facts" style={{ marginTop: 12 }}>
                  {lengthKm ? <div><b>{lengthKm.toFixed(2)}</b><span>km a lap</span></div> : null}
                  {circuit?.turns ? <div><b>{String(circuit.turns)}</b><span>corners</span></div> : null}
                  {shape.firstGp ? <div><b>{shape.firstGp}</b><span>first Grand Prix</span></div> : null}
                </div>
              </div>
            )}

            {pastWins.length > 0 && (
              <div className="pg-panel">
                <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>Winners here</h2></div>
                {king && king[1] > 1 && <p className="pg-note" style={{ marginTop: 0, marginBottom: 8 }}>{king[0]} has won here {king[1]} times, more than anyone.</p>}
                <div className="pg-list">
                  {pastWins.map((w) => (
                    <div key={w.season}>
                      <b style={{ fontWeight: 700 }}>{w.season}</b>
                      <span>{w.winner}{w.team ? `, ${w.team}` : ''}{w.grid ? ` (from ${w.grid === 1 ? 'pole' : `P${w.grid}`})` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(prev || next) && (
              <nav className="pg-panel" aria-label="Other races this season">
                <div className="pg-list">
                  {prev && <Link href={`/races/${prev.slug}`}><b>Previous</b><span>{prev.name}</span></Link>}
                  {next && <Link href={`/races/${next.slug}`}><b>Next</b><span>{next.name}</span></Link>}
                  {seasonYear && <Link href={`/seasons/${seasonYear}`}><b>{seasonYear} season</b><span>Standings and every race</span></Link>}
                </div>
              </nav>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
