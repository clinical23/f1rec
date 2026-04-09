import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://f1rec.com'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/drivers`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/teams`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/races`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/seasons`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/compare`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/sim-racing`, changeFrequency: 'weekly', priority: 0.7 },
  ]

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [driversRes, seasonsRes, postsRes] = await Promise.all([
    supabase.from('drivers').select('slug').order('career_wins', { ascending: false }),
    supabase.from('seasons').select('slug'),
    supabase.from('posts').select('slug').eq('is_published', true),
  ])

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
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...driverRoutes, ...seasonRoutes, ...blogRoutes]
}
