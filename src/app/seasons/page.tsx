import { createServerClient } from '@/lib/supabase/server'
import SeasonsClient, { type Season } from './SeasonsClient'

/** Rebuilt hourly. */
export const revalidate = 3600

export default async function SeasonsPage() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('seasons')
    .select('id, year, slug, rounds, champion_driver_id, champion_team_id')
    .order('year', { ascending: false })
  const rows = data ?? []

  const driverIds = rows.map((s) => s.champion_driver_id).filter(Boolean) as string[]
  const teamIds = rows.map((s) => s.champion_team_id).filter(Boolean) as string[]
  const [driversRes, teamsRes] = await Promise.all([
    driverIds.length ? supabase.from('drivers').select('id, full_name, slug').in('id', driverIds) : Promise.resolve({ data: [] as { id: string; full_name: string; slug: string }[] }),
    teamIds.length ? supabase.from('teams').select('id, name, slug, primary_color').in('id', teamIds) : Promise.resolve({ data: [] as { id: string; name: string; slug: string; primary_color: string | null }[] }),
  ])
  const driverMap = new Map((driversRes.data ?? []).map((d) => [d.id, d]))
  const teamMap = new Map((teamsRes.data ?? []).map((t) => [t.id, t]))

  const seasons: Season[] = rows.map((s) => ({
    ...s,
    champion_driver_name: s.champion_driver_id ? driverMap.get(s.champion_driver_id)?.full_name ?? null : null,
    champion_driver_slug: s.champion_driver_id ? driverMap.get(s.champion_driver_id)?.slug ?? null : null,
    champion_team_name: s.champion_team_id ? teamMap.get(s.champion_team_id)?.name ?? null : null,
    champion_team_slug: s.champion_team_id ? teamMap.get(s.champion_team_id)?.slug ?? null : null,
    champion_team_color: s.champion_team_id ? teamMap.get(s.champion_team_id)?.primary_color ?? null : null,
  }))

  return <SeasonsClient initialSeasons={seasons} />
}
