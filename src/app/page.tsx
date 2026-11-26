import type { Metadata } from 'next'
import Link from 'next/link'
import Countdown from '@/components/weekend/Countdown'
import TrackMap from '@/components/weekend/TrackMap'
import { getDriverCount, getNextRace, getStandings, getWinsAtCircuit, surname, winStreak } from '@/lib/weekend'
import { SITE_URL, lapDoctor as LD } from '@/lib/site'

/** The page follows the race weekend, so it's rebuilt every ten minutes; the countdown ticks in the browser. */
export const revalidate = 600

export const metadata: Metadata = {
  title: { absolute: 'Sunday Grid: this weekend’s F1 race, every result since 1950, and Sim Race Week' },
  description:
    'The next Grand Prix in UK time, the championship, every result since 1950, and this week’s sim challenge on the same track.',
  openGraph: { title: 'Sunday Grid', url: SITE_URL, siteName: 'Sunday Grid', type: 'website' },
}

/** Flip to true when the first weekly challenge opens (2027 round 1). Until then the band says when it starts. */
const CHALLENGE_LIVE = false

const plateName = (name: string) => name.replace(/ Grand Prix$/i, ' GP').toUpperCase()
const uk = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('en-GB', { ...opts, timeZone: 'Europe/London' })
const ordinal = (n: number) => {
  const t = n % 100
  if (t >= 11 && t <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}
const fromGrid = (g: number | null) => (g == null ? '' : g === 1 ? 'pole' : ordinal(g))
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

function formClass(p: number) {
  if (p === 1) return 'win'
  if (p <= 3) return 'podium'
  if (p <= 10) return 'points'
  return ''
}

export default async function Home() {
  const next = await getNextRace().catch(() => null)
  const season = next?.season ?? new Date().getFullYear()
  const [standings, wins, drivers] = await Promise.all([
    getStandings(season, 6).catch(() => []),
    getWinsAtCircuit(next?.circuitSlug ?? null).catch(() => []),
    getDriverCount().catch(() => 0),
  ])
  const leader = standings[0]
  const second = standings[1]
  const streak = winStreak(wins)
  const roundsLeft = next?.racesLeft ?? 0
  const circuitShort = next?.circuitName?.replace(/ (International )?(Grand Prix )?Circuit$/i, '').replace(/^Autódromo /, '') ?? ''
  const mostWins = standings.length ? Math.max(...standings.map((s) => s.wins)) : 0
  const winsHere = (name: string) => wins.filter((w) => w.winner === name).length

  return (
    <main className="pb-home">
      <section className="pb-hero">
        <video className="pb-hero-video" autoPlay muted loop playsInline preload="metadata" poster="/media/lights-poster.jpg" aria-hidden="true">
          <source src="/media/lights-1080.mp4" type="video/mp4" media="(min-width: 900px)" />
          <source src="/media/lights-720.mp4" type="video/mp4" />
        </video>
        <div className="pb-hero-in">
          {next ? (
            <div className="pb-pole">
              <div className="pb-board">
                <h1 className="pb-plate yellow">
                  <span>{plateName(next.name)}</span>
                  <small>Round {next.round}<br />of {next.season}</small>
                </h1>
                <div className="pb-plate">
                  <span>{next.startIso ? uk(next.startIso, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() : uk(`${next.date}T12:00:00Z`, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span>
                  <small>{uk(`${next.date}T12:00:00Z`, { day: 'numeric', month: 'short' })}<br />UK time</small>
                </div>
                {next.startIso && <Countdown startIso={next.startIso} />}
              </div>
            </div>
          ) : (
            <div className="pb-pole">
              <div className="pb-board">
                <h1 className="pb-plate yellow"><span>OFF SEASON</span><small>See you<br />in March</small></h1>
                <Link className="pb-plate link" href="/calendar"><span>CALENDAR</span><small>Every round<br />and date</small></Link>
              </div>
            </div>
          )}
          {next?.shape && (
            <div className="pb-trackwrap">
              <div className="pb-trackname">
                <b>{next.circuitName}</b>
                <span>{[next.locality, next.country].filter(Boolean).join(', ')}{next.sprint ? '. Sprint weekend' : ''}</span>
              </div>
              <TrackMap shape={next.shape} label={`${next.circuitName} layout`} />
              <div className="pb-trackfacts">
                {next.shape.lengthM && <div><b>{(next.shape.lengthM / 1000).toFixed(3)} km</b><span>Lap</span></div>}
                {next.shape.opened && <div><b>{next.shape.opened}</b><span>Opened</span></div>}
                {next.shape.firstGp && <div><b>{next.shape.firstGp}</b><span>First Grand Prix</span></div>}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="pb-wrap">
        <div className="pb-tiles">
          {streak && streak.count > 1 ? (
            <div className="pb-tile"><b>{streak.count}</b><p>straight wins at {circuitShort || 'this circuit'} for {surname(streak.name)}, from {listJoin(wins.slice(0, streak.count).map((w) => fromGrid(w.grid)).filter(Boolean))}</p></div>
          ) : wins.length > 0 ? (
            <div className="pb-tile"><b>{wins.length}</b><p>Grands Prix held here before this one. Last winner: {wins[0].winner}, {wins[0].season}.</p></div>
          ) : null}
          {leader && second && (
            <div className="pb-tile"><b>{leader.points - second.points}</b><p>points between {surname(leader.name)} and {surname(second.name)}{roundsLeft ? ` with ${roundsLeft} round${roundsLeft === 1 ? '' : 's'} left` : ''}</p></div>
          )}
          {leader && (
            <div className="pb-tile"><b>{leader.wins}</b><p>wins for {surname(leader.name)} this season{leader.wins === mostWins ? ', the most of anyone' : ''}</p></div>
          )}
          {drivers > 0 && <div className="pb-tile"><b>{drivers}</b><p>drivers in the database, every race since 1950</p></div>}
        </div>

        <div className="pb-grid2">
          <section className="pb-panel" aria-labelledby="champ-h">
            <div className="pb-ph"><h2 id="champ-h">Championship</h2><Link href={`/seasons/${season}`}>Full standings</Link></div>
            <table className="pb-champ">
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.slug}>
                    <td className="pl">{s.pos}</td>
                    <td className="tb" style={{ ['--tc' as string]: s.teamColour ?? 'var(--border)' }} aria-hidden="true" />
                    <td className="who"><Link href={`/drivers/${s.slug}`}><b>{s.name}</b></Link><small>{s.team}</small></td>
                    <td className="form" aria-label={`Last ${s.form.length} finishes: ${s.form.join(', ')}`}>
                      {s.form.map((p, j) => <span key={j} className={`f ${formClass(p)}`}>{p}</span>)}
                    </td>
                    <td className="gap">{i === 0 ? '' : `-${leader.points - s.points}`}</td>
                    <td className="pt">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {standings.some((s) => s.form.length) && <p className="pb-note">Form: finishing positions in the last five races, newest last.</p>}
          </section>

          {leader && second && (
            <section className="pb-panel" aria-labelledby="h2h-h">
              <div className="pb-ph"><h2 id="h2h-h">Head to head</h2><Link href="/compare">Compare any two</Link></div>
              <div className="pb-h2h">
                <div className="dp" style={{ ['--tc' as string]: leader.teamColour ?? 'var(--border)' }}><b>{leader.code ?? surname(leader.name).slice(0, 3).toUpperCase()}</b><small>{leader.team}</small></div>
                <span className="vs">VS</span>
                <div className="dp r" style={{ ['--tc' as string]: second.teamColour ?? 'var(--border)' }}><b>{second.code ?? surname(second.name).slice(0, 3).toUpperCase()}</b><small>{second.team}</small></div>
              </div>
              <table className="pb-cmp">
                <tbody>
                  {([
                    ['Points', leader.points, second.points],
                    ['Wins', leader.wins, second.wins],
                    ...(next ? [[`Wins at ${circuitShort || 'this circuit'}`, winsHere(leader.name), winsHere(second.name)] as [string, number, number]] : []),
                  ] as [string, number, number][]).map(([label, a, b]) => (
                    <tr key={label}><td className={a > b ? 'lead' : ''}>{a}</td><td className="m">{label}</td><td className={b > a ? 'lead' : ''}>{b}</td></tr>
                  ))}
                </tbody>
              </table>
              <Link className="btn-plate" href={`/compare?d1=${leader.slug}&d2=${second.slug}`}>Run your own comparison</Link>
            </section>
          )}
        </div>
      </div>

      <section className="pb-sim" aria-labelledby="sim-h">
        <div className="pb-wrap pb-sim-in">
          <div>
            <span className="pb-tag">Sim Race Week</span>
            {CHALLENGE_LIVE ? (
              <>
                <h2 id="sim-h">{next?.circuitName ? `Drive ${circuitShort || next.circuitName} this week` : 'Drive the next track this week'}</h2>
                <p className="l">The real race is on Sunday. Your turn is now: set a lap from your own rig and see where you&apos;d line up.</p>
              </>
            ) : (
              <>
                <h2 id="sim-h">Drive every race track yourself</h2>
                <p className="l">From the first race of 2027, every race week has a sim challenge on the same track. Set a lap from your own rig and see where you&apos;d line up. Get your rig sorted before then.</p>
              </>
            )}
            <ol className="pb-steps">
              <li>Join Lap Doctor, free, on Discord</li>
              <li>Drive the week&apos;s track in the chosen sim and car</li>
              <li>Your best lap goes on the board</li>
            </ol>
            <a className="btn-plate" href={LD('/discord')}>Join Lap Doctor</a>
            <Link className="btn-ghost" href="/sim" style={{ marginLeft: 8 }}>How it works</Link>
          </div>
          <div className="pb-monitor">
            <div className="mh"><b>{next?.circuitName ? `${circuitShort || next.circuitName} hotlap` : 'Hotlap'}</b><span>Opens with round 1 of 2027</span></div>
            <p className="pb-monitor-empty">The first weekly challenge opens when the 2027 season starts. Lap times from Lap Doctor members appear here, fastest first, by the name they choose.</p>
            <div className="pb-monitor-links">
              <a href={LD('/fov')}>Set your field of view</a>
              <a href={LD('/wheel-setup')}>Set up your wheel</a>
              <a href={LD('/sim-racing-software')}>Official sim and driver downloads</a>
            </div>
          </div>
        </div>
      </section>

      <nav className="pb-wrap pb-explore" aria-label="More from Sunday Grid">
        <Link href="/races"><b>Every result</b><span>Every Grand Prix since 1950, searchable.</span></Link>
        <Link href="/seasons"><b>Every season</b><span>Champions, calendars and standings.</span></Link>
        <Link href="/leaderboards"><b>All-time records</b><span>Wins, poles and podiums across every era.</span></Link>
        <Link href="/calendar"><b>The calendar</b><span>Every round and where to watch in the UK.</span></Link>
      </nav>
    </main>
  )
}
