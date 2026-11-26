import { createServerClient } from '@/lib/supabase/server'

// Driver and team slugs come from the Jolpica ids ("max_verstappen", "hamilton", "aston_martin"), but people and
// other sites link the way names are written ("max-verstappen", "lewis-hamilton", "aston-martin"). When a page
// isn't found, these find the record those links mean, so the page can send them to its real address.

/** "Kimi Räikkönen" -> "kimi-raikkonen" */
export function nameSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function candidates(slug: string): string[] {
  const s = decodeURIComponent(slug).toLowerCase().trim()
  const parts = s.split(/[-_\s]+/).filter(Boolean)
  return [...new Set([s, s.replace(/-/g, '_'), s.replace(/_/g, '-'), parts.join('_'), parts.at(-1) ?? '', parts[0] ?? ''])].filter(Boolean)
}

async function resolve(table: 'drivers' | 'teams', nameCol: string, slug: string): Promise<string | null> {
  const supabase = createServerClient()
  const want = nameSlug(decodeURIComponent(slug))
  const tries = candidates(slug)
  const { data } = await supabase.from(table).select(`slug, ${nameCol}`).in('slug', tries)
  const rows = (data ?? []) as unknown as Array<Record<string, string>>
  // An exact id match in another spelling ("max-verstappen" -> "max_verstappen") wins.
  const byId = tries.slice(0, 4).map((t) => rows.find((r) => r.slug === t)).find(Boolean)
  if (byId) return byId.slug
  // Otherwise only accept a surname or first-word id if the full name matches what was asked for,
  // so "max-verstappen" can never land on Jos.
  const byName = rows.find((r) => nameSlug(r[nameCol] ?? '') === want)
  if (byName) return byName.slug
  // Last try: search by the last word of the name and compare names.
  const last = want.split('-').at(-1)
  if (!last || last.length < 3) return null
  const { data: more } = await supabase.from(table).select(`slug, ${nameCol}`).ilike(nameCol, `%${last}%`).limit(25)
  const hit = ((more ?? []) as unknown as Array<Record<string, string>>).find((r) => nameSlug(r[nameCol] ?? '') === want)
  return hit?.slug ?? null
}

export const resolveDriverSlug = (slug: string) => resolve('drivers', 'full_name', slug)
export const resolveTeamSlug = (slug: string) => resolve('teams', 'name', slug)
