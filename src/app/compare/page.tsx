import { createServerClient } from '@/lib/supabase/server'
import CompareClient from './CompareClient'

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<{ d1?: string; d2?: string }>
}) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('drivers')
    .select(
      'id, slug, full_name, code, nationality, championships, career_wins, career_podiums, career_poles, career_points, career_starts, first_season, last_season'
    )
    .order('career_wins', { ascending: false })

  if (error) {
    console.error('[compare-page] failed to load drivers', error)
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  return <CompareClient drivers={(data ?? []) as any} initialD1={resolvedSearchParams.d1 ?? ''} initialD2={resolvedSearchParams.d2 ?? ''} />
}
