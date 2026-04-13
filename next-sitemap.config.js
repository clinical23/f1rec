/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://f1rec.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: ['/api/*'],
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
  },
  additionalPaths: async (config) => {
    const paths = []

    const staticPages = [
      { loc: '/', priority: 1.0, changefreq: 'daily' },
      { loc: '/drivers', priority: 0.9, changefreq: 'weekly' },
      { loc: '/teams', priority: 0.9, changefreq: 'weekly' },
      { loc: '/races', priority: 0.9, changefreq: 'weekly' },
      { loc: '/seasons', priority: 0.8, changefreq: 'monthly' },
      { loc: '/compare', priority: 0.9, changefreq: 'weekly' },
      { loc: '/leaderboards', priority: 0.9, changefreq: 'weekly' },
      { loc: '/blog', priority: 0.8, changefreq: 'daily' },
      { loc: '/community', priority: 0.7, changefreq: 'weekly' },
      { loc: '/sim-racing', priority: 0.8, changefreq: 'weekly' },
      { loc: '/sim-racing/products', priority: 0.8, changefreq: 'weekly' },
      { loc: '/sim-racing/reviews', priority: 0.8, changefreq: 'weekly' },
      { loc: '/sim-racing/setups', priority: 0.7, changefreq: 'weekly' },
      { loc: '/memes', priority: 0.5, changefreq: 'weekly' },
    ]

    for (const page of staticPages) {
      paths.push(await config.transform(config, page.loc))
    }

    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        'https://mezipswmplrcdbinwjwy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg'
      )

      const { data: drivers } = await supabase.from('drivers').select('slug').not('slug', 'is', null)
      if (drivers) {
        for (const d of drivers) {
          paths.push(await config.transform(config, `/drivers/${d.slug}`))
        }
      }

      const { data: teams } = await supabase.from('teams').select('slug').not('slug', 'is', null)
      if (teams) {
        for (const t of teams) {
          paths.push(await config.transform(config, `/teams/${t.slug}`))
        }
      }

      const { data: seasons } = await supabase.from('seasons').select('slug')
      if (seasons) {
        for (const s of seasons) {
          paths.push(await config.transform(config, `/seasons/${s.slug}`))
        }
      }

      const { data: posts } = await supabase.from('posts').select('slug').eq('is_published', true)
      if (posts) {
        for (const p of posts) {
          paths.push(await config.transform(config, `/blog/${p.slug}`))
        }
      }
    } catch (err) {
      console.error('Sitemap generation error:', err)
    }

    return paths
  },
}
