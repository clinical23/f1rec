import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import CalendarBoard from '@/components/calendar/CalendarBoard'

export const metadata: Metadata = {
  title: '2026 F1 Race Calendar — Schedule & Where to Watch | F1Rec',
  description:
    'Complete 2026 Formula 1 race schedule with dates, circuits, results, and broadcast channels for every country.',
}

type RaceRow = {
  id: string
  slug: string | null
  round: number | null
  name: string | null
  race_date: string | null
  circuit_slug: string | null
}

type CircuitRow = {
  slug: string
  name: string | null
  country: string | null
}

type CountryRow = {
  name: string
  flag_emoji: string | null
}

type WinnerRow = {
  race_slug: string | null
  driver_name: string | null
  driver_slug: string | null
}

type BroadcastRow = {
  id: string
  country: string | null
  country_code: string | null
  channel_name: string | null
  channel_type: string | null
  url: string | null
  notes: string | null
}

export default async function CalendarPage() {
  const supabase = createServerClient()
  const [racesRes, winnersRes, broadcastsRes, countriesRes] = await Promise.all([
    supabase
      .from('races')
      .select('id, slug, round, name, race_date, circuit_slug')
      .eq('season_year', 2026)
      .order('round', { ascending: true }),
    supabase
      .from('results')
      .select('race_slug, driver_name, driver_slug')
      .eq('season_year', 2026)
      .eq('position', 1)
      .eq('is_sprint', false),
    supabase
      .from('broadcast_channels')
      .select('id, country, country_code, channel_name, channel_type, url, notes')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('countries').select('name, flag_emoji'),
  ])

  if (racesRes.error) console.error('[calendar] failed to load races', racesRes.error)
  if (winnersRes.error) console.error('[calendar] failed to load winners', winnersRes.error)
  if (broadcastsRes.error) console.error('[calendar] failed to load broadcast channels', broadcastsRes.error)
  if (countriesRes.error) console.error('[calendar] failed to load countries', countriesRes.error)

  const races = (racesRes.data ?? []) as RaceRow[]
  const circuitSlugs = [...new Set(races.map((race) => race.circuit_slug).filter(Boolean))] as string[]

  let circuitsMap = new Map<string, CircuitRow>()
  if (circuitSlugs.length > 0) {
    const { data: circuitsData, error: circuitsError } = await supabase
      .from('circuits')
      .select('slug, name, country')
      .in('slug', circuitSlugs)
    if (circuitsError) {
      console.error('[calendar] failed to load circuits', circuitsError)
    } else {
      circuitsMap = new Map((circuitsData as CircuitRow[]).map((circuit) => [circuit.slug, circuit]))
    }
  }

  const flagByCountry = new Map<string, string>()
  for (const country of (countriesRes.data ?? []) as CountryRow[]) {
    if (country.name && country.flag_emoji) {
      flagByCountry.set(country.name.toLowerCase(), country.flag_emoji)
    }
  }

  const winnerByRace = new Map<string, WinnerRow>()
  for (const winner of (winnersRes.data ?? []) as WinnerRow[]) {
    const raceSlug = winner.race_slug?.trim()
    if (!raceSlug || winnerByRace.has(raceSlug)) continue
    winnerByRace.set(raceSlug, winner)
  }

  const cards = races.map((race) => {
    const circuit = race.circuit_slug ? circuitsMap.get(race.circuit_slug) : null
    const country = circuit?.country?.trim() ?? ''
    const flagEmoji = country ? flagByCountry.get(country.toLowerCase()) ?? '🏁' : '🏁'
    const winner = race.slug ? winnerByRace.get(race.slug) : null
    return {
      id: race.id,
      slug: race.slug ?? '',
      round: race.round ?? 0,
      name: race.name ?? 'Grand Prix',
      raceDate: race.race_date ?? null,
      dateLabel:
        race.race_date != null && race.race_date !== ''
          ? new Date(race.race_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'TBC',
      circuitName: circuit?.name ?? race.circuit_slug ?? 'Unknown circuit',
      flagEmoji,
      winnerName: winner?.driver_name ?? null,
      winnerSlug: winner?.driver_slug ?? null,
    }
  })

  const broadcasts = (broadcastsRes.data ?? []) as BroadcastRow[]

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-16 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">2026 Season</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[var(--text)] hero-title">
          2026 Race Calendar
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm text-[var(--muted)]">
          Every Grand Prix date, time, and where to watch.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <CalendarBoard races={cards} broadcasts={broadcasts} />
      </section>
    </main>
  )
}
