import Link from 'next/link'
import { pathEnabled } from '@/lib/features'
import Logo from '@/components/Logo'

const stats = [
  { label: 'This weekend', href: '/' },
  { label: 'Results', href: '/races' },
  { label: 'Seasons', href: '/seasons' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Teams', href: '/teams' },
  { label: 'Compare', href: '/compare' },
  { label: 'Records', href: '/leaderboards' },
]

const more = [
  { label: 'Random stats', href: '/random' },
  { label: 'Live streams', href: '/live' },
  { label: 'Community', href: '/community' },
  { label: 'Privacy', href: '/privacy' },
].filter((l) => pathEnabled(l.href))

// Lap Doctor is the sim racing side: links go to its own pages, tagged so its analytics can see they came from Sunday Grid.
const LD = (path: string) => `https://lapdoctor.gg${path}${path.includes('?') ? '&' : '?'}from=f1rec`
const sim = [
  { label: 'Sim Race Week', href: '/sim', internal: true },
  { label: 'Lap Doctor Discord', href: LD('/discord') },
  { label: 'FOV calculator', href: LD('/fov') },
  { label: 'Wheel setup guides', href: LD('/wheel-setup') },
  { label: 'Official sim downloads', href: LD('/sim-racing-software') },
]

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? ''

export default function Footer() {
  return (
    <footer className="pb-footer">
      <div className="pb-footer-in">
        <div className="pb-footer-brand">
          <Link href="/" className="pb-logo" aria-label="Sunday Grid home"><Logo /></Link>
          <p>Every race since 1950, and how to drive this weekend&apos;s track in your own sim.</p>
          {DONATE_URL && <a className="btn-plate" style={{ marginTop: 16 }} href={DONATE_URL} target="_blank" rel="noopener noreferrer">Support Sunday Grid</a>}
        </div>
        <div>
          <h2>Stats</h2>
          {stats.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </div>
        <div>
          <h2>Sim racing</h2>
          {sim.map((l) => l.internal
            ? <Link key={l.href} href={l.href}>{l.label}</Link>
            : <a key={l.href} href={l.href} rel="noopener">{l.label}</a>)}
        </div>
        <div>
          <h2>More</h2>
          {more.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </div>
      </div>
      <p className="pb-footer-legal">
        Sunday Grid is an independent stats site, not connected to Formula 1 or the FIA. Results data from the Jolpica F1 API.
        Circuit outlines from bacinger/f1-circuits (MIT). &copy; {new Date().getFullYear()} Sunday Grid.
      </p>
    </footer>
  )
}
