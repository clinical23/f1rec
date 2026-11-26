import { createServerClient } from '@/lib/supabase/server'
import DriversClient from './DriversClient'

interface Driver {
  id: string
  slug: string
  full_name: string
  code: string | null
  nationality: string | null
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  championships: number
  is_active: boolean
  first_season: number | null
  last_season: number | null
}

/** Rebuilt hourly, so results and the next race stay current. */
export const revalidate = 3600

export default async function DriversPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('drivers')
    .select(
      'id, slug, full_name, code, nationality, career_wins, career_podiums, career_poles, career_points, career_starts, championships, is_active, first_season, last_season'
    )
    .order('career_wins', { ascending: false })

  if (error) {
    console.error('[drivers-page] failed to load drivers', error)
  }
  // drivers.is_active isn't reliable (it is set for most of the field), so "on the grid" means raced in the latest season.
  const rows = (data ?? []) as unknown as Driver[]
  const latest = Math.max(0, ...rows.map((d) => d.last_season ?? 0))
  return <DriversClient initialDrivers={rows.map((d) => ({ ...d, is_active: d.last_season === latest }))} />
}
