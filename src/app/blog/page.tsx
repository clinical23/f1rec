import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'

const tokens = {
  bg: '#0a0a0f',
  bg2: '#111118',
  border: '#2a2a3a',
  text: '#e8e8f0',
  muted: '#888899',
  accent: '#e8002d',
  gold: '#f5c842',
} as const

const font = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
}

type Post = {
  slug: string
  title: string
  excerpt: string | null
  category: string | null
  published_at: string | null
  reading_time_minutes: number | null
  related_driver_slug: string | null
  related_race_slug: string | null
  featured: boolean | null
}

const categoryMeta: Record<string, { label: string; color: string; bg: string }> = {
  'race-review': { label: 'Race Reviews', color: '#ff8a80', bg: 'rgba(255, 138, 128, 0.14)' },
  'driver-analysis': { label: 'Driver Analysis', color: '#80cbc4', bg: 'rgba(128, 203, 196, 0.14)' },
  'season-preview': { label: 'Season Preview', color: '#90caf9', bg: 'rgba(144, 202, 249, 0.14)' },
  history: { label: 'History', color: '#f5c842', bg: 'rgba(245, 200, 66, 0.14)' },
  tech: { label: 'Tech', color: '#ce93d8', bg: 'rgba(206, 147, 216, 0.14)' },
}

function formatDate(value: string | null) {
  if (!value) return 'Unscheduled'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function readingTime(post: Post) {
  if (post.reading_time_minutes && post.reading_time_minutes > 0) return post.reading_time_minutes
  const words = (post.excerpt ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.ceil(words / 180))
}

function cleanTitle(title: string): string {
  return title.replace(/^Title:\s*/i, '')
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'F1 Blog — Analysis, Previews & History | F1Rec',
    description: 'Race reviews, driver analysis, technical breakdowns, previews, and historical insight from the F1Rec editorial team.',
    openGraph: {
      title: 'F1 Blog — Analysis, Previews & History | F1Rec',
      description: 'Race reviews, driver analysis, technical breakdowns, previews, and historical insight from the F1Rec editorial team.',
      type: 'website',
      url: 'https://f1rec.com/blog',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'F1 Blog — Analysis, Previews & History | F1Rec',
      description: 'Race reviews, driver analysis, technical breakdowns, previews, and historical insight from the F1Rec editorial team.',
    },
  }
}

export default async function BlogIndexPage() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  const posts = ((data ?? []) as Post[]).filter((p) => p.slug)
  const featured = posts.find((p) => p.featured === true) ?? posts[0]
  const rest = posts.filter((p) => p.slug !== featured?.slug)

  return (
    <main style={{ fontFamily: font.body, background: tokens.bg, color: tokens.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 56px' }}>
        <section
          style={{
            border: `1px solid ${tokens.border}`,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${tokens.bg} 0%, ${tokens.bg2} 45%, #171722 100%)`,
            padding: '32px 28px',
            marginBottom: '20px',
          }}
        >
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 900, fontSize: 'clamp(38px,7vw,74px)', lineHeight: 0.95, letterSpacing: '-1px' }}>
            F1 <span style={{ color: tokens.accent }}>ANALYSIS & INSIGHTS</span>
          </h1>
          <p style={{ margin: '14px 0 0', color: tokens.muted, maxWidth: '780px', fontSize: '16px', lineHeight: 1.6 }}>
            Professional editorial coverage for the data era: race reviews, driver form analysis, strategic deep dives, and historical context for every major Formula 1 storyline.
          </p>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {['All', 'Race Reviews', 'Driver Analysis', 'Season Preview', 'History', 'Tech'].map((pill, idx) => (
            <button
              key={pill}
              type="button"
              style={{
                border: `1px solid ${idx === 0 ? tokens.accent : tokens.border}`,
                background: idx === 0 ? `${tokens.accent}20` : tokens.bg2,
                color: idx === 0 ? tokens.text : tokens.muted,
                borderRadius: '999px',
                padding: '8px 14px',
                fontFamily: font.display,
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.6px',
                fontSize: '12px',
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              border: `1px solid ${tokens.border}`,
              borderRadius: '12px',
              background: tokens.bg2,
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontFamily: font.display, fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: tokens.gold, textTransform: 'uppercase' }}>
                Featured
              </span>
              <span style={{ fontSize: '12px', color: tokens.muted }}>{formatDate(featured.published_at)} • {readingTime(featured)} min read</span>
            </div>
            <h2 style={{ margin: '0 0 10px', fontFamily: font.display, fontSize: 'clamp(28px,4vw,42px)', textTransform: 'uppercase', lineHeight: 1 }}>
              {cleanTitle(featured.title)}
            </h2>
            <p style={{ margin: 0, color: tokens.muted, fontSize: '15px', lineHeight: 1.6 }}>{featured.excerpt ?? 'Read full article.'}</p>
          </Link>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {rest.map((post) => {
            const meta = categoryMeta[post.category ?? ''] ?? { label: 'Analysis', color: tokens.muted, bg: tokens.bg2 }
            const related = post.related_driver_slug ?? post.related_race_slug
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '10px',
                  background: tokens.bg2,
                  padding: '16px',
                  transition: 'border-color 160ms ease',
                }}
              >
                <span style={{ display: 'inline-block', marginBottom: '10px', padding: '4px 8px', borderRadius: '6px', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {meta.label}
                </span>
                <h3 style={{ margin: '0 0 8px', fontFamily: font.display, fontSize: '25px', lineHeight: 1, textTransform: 'uppercase' }}>{cleanTitle(post.title)}</h3>
                <p style={{ margin: '0 0 12px', color: tokens.muted, lineHeight: 1.55, fontSize: '14px' }}>{post.excerpt ?? ''}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: tokens.muted }}>
                  <span>{formatDate(post.published_at)}</span>
                  <span>{readingTime(post)} min read</span>
                </div>
                {related && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: tokens.accent, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                    Related: {related}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <button
            type="button"
            style={{
              border: `1px solid ${tokens.border}`,
              background: tokens.bg2,
              color: tokens.text,
              borderRadius: '8px',
              padding: '10px 18px',
              fontFamily: font.display,
              textTransform: 'uppercase',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.8px',
            }}
          >
            Load More Articles
          </button>
        </div>
      </div>
    </main>
  )
}