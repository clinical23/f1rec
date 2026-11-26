import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PageHead from '@/components/page/PageHead'
import CalendarBoard from '@/components/calendar/CalendarBoard'

export const metadata: Metadata = {
  title: 'F1 Race Calendar: Dates, Results and Where to Watch',
  description:
    'Every round of the Formula 1 season with dates, circuits, winners and where to watch in your country.',
}

type RaceRow = {
  id: string
  slug: string | null
  round: number | null
  name: string | null
  race_date: string | null
  race_time: string | null
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
  constructor_name: string | null
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
  // This year's calendar until its last race is run, then the next season's once Jolpica publishes it.
  const today = new Date().toISOString().slice(0, 10)
  const { data: nextRow } = await supabase.from('races').select('season_year').gte('race_date', today).order('race_date', { ascending: true }).limit(1).maybeSingle()
  const season = Number(nextRow?.season_year ?? new Date().getFullYear())
  const [racesRes, winnersRes, broadcastsRes, countriesRes] = await Promise.all([
    supabase
      .from('races')
      .select('id, slug, round, name, race_date, race_time, circuit_slug')
      .eq('season_year', season)
      .order('race_date', { ascending: true }),
    supabase
      .from('results')
      .select('driver_name, driver_slug, constructor_name, ...races!inner(race_slug:slug)')
      .eq('season_year', season)
      .eq('position', 1)
      .eq('session_type', 'race'),
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
      raceTime: race.race_time ?? null,
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
      winnerTeam: winner?.constructor_name ?? null,
    }
  })

  const broadcasts = (broadcastsRes.data ?? []) as BroadcastRow[]
  const now = new Date()
  const nextRace = cards
    .filter((race) => race.raceDate && new Date(race.raceDate) >= now)
    .sort((a, b) => new Date(a.raceDate ?? '').getTime() - new Date(b.raceDate ?? '').getTime())[0]

  const done = cards.filter((c) => c.winnerName).length
  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Calendar' }]}
        title="Calendar"
        small={season}
        lede={nextRace ? <>Next up: <Link href={`/races/${nextRace.slug}`}>{nextRace.name}</Link>, {nextRace.dateLabel}. Times are UK.</> : `Every round of the ${season} season.`}
        stats={[
          { value: cards.length, label: 'rounds' },
          { value: done, label: 'raced' },
          { value: cards.length - done, label: 'to go', sig: true },
        ]}
      />
      <div className="pg-body">
        <CalendarBoard races={cards} broadcasts={broadcasts} nextId={nextRace?.id ?? null} />
      </div>
    </main>
  )
}
