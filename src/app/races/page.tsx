import { createServerClient } from '@/lib/supabase/server'
import RacesClient, { type RaceResult } from './RacesClient'

/** Rebuilt hourly, so new winners appear soon after the catch-up job imports them. */
export const revalidate = 3600

export default async function RacesPage() {
  const supabase = createServerClient()

  // Every race winner, 1950 to now. The API returns at most 1,000 rows per request, so page through.
  const rows: RaceResult[] = []
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabase
      .from('results')
      .select('season_year, round, race_name, race_slug, driver_name')
      .eq('position', 1)
      .eq('session_type', 'race')
      .order('season_year', { ascending: false })
      .order('round', { ascending: false })
      .range(from, from + 999)
    if (error || !data) break
    rows.push(...(data as RaceResult[]))
    if (data.length < 1000) break
  }

  const seen = new Set<string>()
  const races = rows.filter((r) => {
    const key = `${r.season_year}-${r.round}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const { count } = await supabase.from('races').select('id', { count: 'exact', head: true })

  return <RacesClient initialRaces={races} raceCount={typeof count === 'number' ? count : null} />
}
