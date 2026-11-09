import { createServerClient } from '@/lib/supabase/server'
import TeamsClient, { type Team } from './TeamsClient'

/** Rebuilt hourly. */
export const revalidate = 3600

export default async function TeamsPage() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('teams')
    .select('id, slug, name, short_name, full_name, base, team_principal, founded_year, championships, primary_color')
    .order('championships', { ascending: false })
    .limit(1000)
  return <TeamsClient initialTeams={(data ?? []) as Team[]} />
}
