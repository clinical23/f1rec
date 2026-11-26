import type { Metadata } from 'next'
import Link from 'next/link'
import TrackMap from '@/components/weekend/TrackMap'
import { getNextRace } from '@/lib/weekend'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sim Race Week: drive this weekend’s track',
  description:
    'Every race week, drive the same circuit from your own sim rig and see where your lap would line up. Free, run with Lap Doctor on Discord.',
  alternates: { canonical: '/sim' },
}

const LD = (path: string) => `https://lapdoctor.gg${path}?from=f1rec`

const ready = [
  { href: '/fov', title: 'Field of view calculator', body: 'Set the right FOV for your screen and seat, per sim.' },
  { href: '/wheel-setup', title: 'Wheel setup guides', body: 'Rotation, force feedback and the settings that matter for your base.' },
  { href: '/race-ready-pc', title: 'Get your PC race-ready', body: 'Stutter, frame drops and the checks that fix most of them.' },
  { href: '/fuel-calculator', title: 'Fuel calculator', body: 'How much to load and when to pit, for any race length.' },
  { href: '/sim-racing-software', title: 'Official downloads', body: 'Every sim and wheel driver, from the makers’ own pages.' },
  { href: '/sim-racing-flags', title: 'Racing flags explained', body: 'What each flag means and what the sim expects you to do.' },
]

export default async function SimPage() {
  const next = await getNextRace().catch(() => null)
  const track = next?.circuitName ?? 'this weekend’s circuit'

  return (
    <main className="pb-simpage">
      <section className="pb-sim" aria-labelledby="sim-h">
        <div className="pb-wrap pb-sim-in">
          <div>
            <span className="pb-tag">Sim Race Week, with Lap Doctor</span>
            <h1 id="sim-h">Drive the race track before the race</h1>
            <p className="l">
              Every race week there&apos;s one track, one sim and one car. You set laps from your own rig between Monday and
              the race, and the board shows where you&apos;d line up. It&apos;s free, and nothing you can buy makes you faster.
            </p>
            <ol className="pb-steps">
              <li>Join Lap Doctor on Discord. It&apos;s free.</li>
              <li>Drive the week&apos;s track in the chosen sim and car.</li>
              <li>Your best lap goes on the board, under a name you choose.</li>
            </ol>
            <a className="btn-plate" href={LD('/discord')}>Join Lap Doctor</a>
          </div>
          {next?.shape ? (
            <div className="pb-monitor">
              <div className="mh"><b>This week: {track}</b><span>Opens with round 1 of 2027</span></div>
              <TrackMap shape={next.shape} label={`${track} layout`} />
            </div>
          ) : (
            <div className="pb-monitor">
              <div className="mh"><b>The weekly board</b><span>Opens with round 1 of 2027</span></div>
              <p className="pb-monitor-empty">The first challenge opens when the 2027 season starts.</p>
            </div>
          )}
        </div>
      </section>

      <div className="pb-wrap">
        <section className="pb-simblock" aria-labelledby="when-h">
          <h2 id="when-h">When it starts</h2>
          <p>
            The first weekly challenge opens with the first race of 2027. Until then, Lap Doctor&apos;s Discord is open for
            help getting your rig sorted, so you&apos;re driving rather than fiddling with settings when it starts.
          </p>
        </section>

        <section className="pb-simblock" aria-labelledby="rules-h">
          <h2 id="rules-h">The rules</h2>
          <ul className="pb-rules">
            <li>Laps come from your own rig, in the sim and car named for the week.</li>
            <li>Only laps you choose to share go on the board, under the name you pick. You can take them off any time.</li>
            <li>Entry is free. Nobody can pay to enter, and nothing paid makes a car faster.</li>
            <li>No mods are hosted or shared. Tracks and cars are the ones that ship with the sim or come from the maker.</li>
          </ul>
        </section>

        <section className="pb-simblock" aria-labelledby="ready-h">
          <div className="pb-ph"><h2 id="ready-h">Get your rig ready</h2><a href={LD('/')}>More on Lap Doctor</a></div>
          <div className="pb-ready">
            {ready.map((r) => (
              <a key={r.href} href={LD(r.href)}>
                <b>{r.title}</b>
                <span>{r.body}</span>
              </a>
            ))}
          </div>
        </section>

        <p className="pb-simfoot">
          The real race: <Link href="/">this weekend on Sunday Grid</Link>. Sim Race Week is run by Lap Doctor (lapdoctor.gg), a free
          sim racing help community.
        </p>
      </div>
    </main>
  )
}
