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
  return <DriversClient initialDrivers={(data ?? []) as unknown as Driver[]} />
}
