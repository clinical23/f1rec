import { createServerClient } from '@/lib/supabase/server'
import CompareClient from './CompareClient'

export default async function ComparePage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('drivers')
    .select('id, slug, full_name, championships, career_wins, career_podiums, career_poles, career_points, career_starts')
    .order('career_wins', { ascending: false })

  if (error) {
    console.error('[compare-page] failed to load drivers', error)
  }

  return <CompareClient drivers={(data ?? []) as any} />
}
