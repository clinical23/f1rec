import { createServerClient } from '@/lib/supabase/server'
import LeaderboardsClient from './LeaderboardsClient'

export default async function LeaderboardsPage() {
  const supabase = createServerClient()
  const [driversRes, constructorsRes, winRes, champRes] = await Promise.all([
    supabase.from('v_driver_leaderboard').select('*').order('career_wins', { ascending: false }),
    supabase.from('v_constructor_leaderboard').select('*').order('race_wins', { ascending: false }),
    supabase.from('drivers').select('full_name, slug, career_wins').order('career_wins', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, championships').order('championships', { ascending: false }).limit(1),
  ])

  const records = [
    winRes.data?.[0]
      ? { title: 'Most Career Wins', holder: winRes.data[0].full_name, slug: winRes.data[0].slug, value: String(winRes.data[0].career_wins), linkBase: '/drivers' }
      : null,
    champRes.data?.[0]
      ? {
          title: 'Most Championships',
          holder: champRes.data[0].full_name,
          slug: champRes.data[0].slug,
          value: String(champRes.data[0].championships),
          linkBase: '/drivers',
        }
      : null,
  ].filter(Boolean)

  return (
    <LeaderboardsClient
      drivers={(driversRes.data ?? []) as any}
      constructors={(constructorsRes.data ?? []) as any}
      records={records as any}
    />
  )
}
