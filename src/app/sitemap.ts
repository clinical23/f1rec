import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { pathEnabled } from '@/lib/features'

// Rebuilt daily, so new races and results pages appear without a deploy.
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://f1rec.com'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/drivers`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/teams`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/races`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/seasons`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/compare`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/calendar`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/leaderboards`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/live`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${siteUrl}/community`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/paddock`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${siteUrl}/memes`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${siteUrl}/random`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${siteUrl}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/sim-racing`, changeFrequency: 'weekly', priority: 0.7 },
  ]

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [driversRes, seasonsRes, postsRes, racesRes, teamsRes] = await Promise.all([
    supabase.from('drivers').select('slug').order('career_wins', { ascending: false }),
    supabase.from('seasons').select('slug'),
    supabase.from('posts').select('slug, updated_at, published_at').eq('is_published', true),
    Promise.all([0, 1000].map((from) =>
      supabase.from('races').select('slug, race_date').order('race_date', { ascending: false }).range(from, from + 999)
    )).then((pages) => ({ data: pages.flatMap((p) => p.data ?? []) })),
    supabase.from('teams').select('slug'),
  ])

  const raceRoutes: MetadataRoute.Sitemap = (racesRes.data ?? []).map(r => ({
    url: `${siteUrl}/races/${r.slug}`,
    changeFrequency: (String(r.race_date ?? '') >= new Date().toISOString().slice(0, 4) ? 'weekly' : 'yearly') as 'weekly' | 'yearly',
    priority: String(r.race_date ?? '') >= new Date().toISOString().slice(0, 4) ? 0.7 : 0.5,
  }))

  const teamRoutes: MetadataRoute.Sitemap = (teamsRes.data ?? []).map(t => ({
    url: `${siteUrl}/teams/${t.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const driverRoutes: MetadataRoute.Sitemap = (driversRes.data ?? []).map(d => ({
    url: `${siteUrl}/drivers/${d.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const seasonRoutes: MetadataRoute.Sitemap = (seasonsRes.data ?? []).map(s => ({
    url: `${siteUrl}/seasons/${s.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const blogRoutes: MetadataRoute.Sitemap = (postsRes.data ?? []).map(p => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updated_at ?? p.published_at ?? undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...raceRoutes, ...driverRoutes, ...teamRoutes, ...seasonRoutes, ...blogRoutes].filter((r) =>
    pathEnabled(new URL(r.url).pathname)
  )
}
