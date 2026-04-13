import Link from 'next/link'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'

const tokens = {
  bg: '#0a0a0f',
  bg2: '#111118',
  bg3: '#1a1a24',
  border: '#2a2a3a',
  text: '#e8e8f0',
  muted: '#888899',
  accent: '#e8002d',
} as const

const font = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
}

function cleanTitle(title: string): string {
  return title.replace(/^Title:\s*/i, '')
}

type PageProps = {
  params: Promise<{ slug: string }>
}

type Post = {
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  category: string | null
  author: string | null
  published_at: string | null
  reading_time_minutes: number | null
  related_race_slug: string | null
  related_driver_slug: string | null
  meta_description: string | null
  og_image_url: string | null
}

function categoryLabel(value: string | null) {
  const map: Record<string, string> = {
    'race-review': 'Race Reviews',
    'driver-analysis': 'Driver Analysis',
    'season-preview': 'Season Preview',
    history: 'History',
    tech: 'Tech',
  }
  return map[value ?? ''] ?? 'Analysis'
}

function formatDate(value: string | null) {
  if (!value) return 'Unscheduled'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function readTime(post: Post) {
  if (post.reading_time_minutes && post.reading_time_minutes > 0) return post.reading_time_minutes
  const words = (post.content ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.ceil(words / 220))
}

const bodyProseStyle = {
  fontFamily: font.body,
  fontSize: 18,
  lineHeight: 1.75,
  color: tokens.text,
} as const

function renderInlineMarkdown(text: string): ReactNode {
  if (!text.includes('**')) return text
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/gs
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push(<Fragment key={`t-${key++}`}>{text.slice(last, match.index)}</Fragment>)
    }
    out.push(
      <strong key={`b-${key++}`} style={{ fontWeight: 700 }}>
        {match[1]}
      </strong>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) {
    out.push(<Fragment key={`t-${key++}`}>{text.slice(last)}</Fragment>)
  }
  return out.length > 0 ? out : text
}

type Block =
  | { kind: 'h2'; text: string; level: 'top' | 'sub' }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; lines: string[] }

function parseMarkdownBlocks(content: string): Block[] {
  const raw = content.replace(/\r\n/g, '\n').trim()
  if (!raw) return []

  const chunks = raw.split(/\n{2,}/)
  const blocks: Block[] = []

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trimEnd())
    const nonEmpty = lines.filter((l) => l.length > 0)
    if (nonEmpty.length === 0) continue

    const first = nonEmpty[0]
    if (first.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: first.slice(4).trim() })
      const rest = nonEmpty.slice(1)
      if (rest.length) blocks.push({ kind: 'p', lines: rest })
      continue
    }
    if (first.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: first.slice(3).trim(), level: 'sub' })
      const rest = nonEmpty.slice(1)
      if (rest.length) blocks.push({ kind: 'p', lines: rest })
      continue
    }
    if (first.startsWith('# ')) {
      blocks.push({ kind: 'h2', text: first.slice(2).trim(), level: 'top' })
      const rest = nonEmpty.slice(1)
      if (rest.length) blocks.push({ kind: 'p', lines: rest })
      continue
    }

    blocks.push({ kind: 'p', lines: nonEmpty })
  }

  return blocks
}

function renderMarkdownWithAd(content: string) {
  const parsed = parseMarkdownBlocks(content)
  let paragraphCount = 0
  const elements: ReactNode[] = []

  for (let idx = 0; idx < parsed.length; idx += 1) {
    const block = parsed[idx]
    if (block.kind === 'h2') {
      const isTop = block.level === 'top'
      elements.push(
        <h2
          key={`h2-${idx}`}
          style={{
            margin: isTop ? '32px 0 12px' : '28px 0 10px',
            fontFamily: font.display,
            fontSize: isTop ? 32 : 28,
            lineHeight: 1.15,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: tokens.text,
            fontWeight: 800,
          }}
        >
          {renderInlineMarkdown(block.text)}
        </h2>
      )
      continue
    }
    if (block.kind === 'h3') {
      elements.push(
        <h3
          key={`h3-${idx}`}
          style={{
            margin: '24px 0 10px',
            fontFamily: font.display,
            fontSize: 24,
            lineHeight: 1.2,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: tokens.text,
            fontWeight: 800,
          }}
        >
          {renderInlineMarkdown(block.text)}
        </h3>
      )
      continue
    }

    paragraphCount += 1
    const paraBody = (
      <>
        {block.lines.map((line, lineIdx) => (
          <Fragment key={lineIdx}>
            {lineIdx > 0 ? <br /> : null}
            {renderInlineMarkdown(line)}
          </Fragment>
        ))}
      </>
    )
    const para = (
      <p key={`p-${idx}`} style={{ margin: '0 0 1.25em', ...bodyProseStyle }}>
        {paraBody}
      </p>
    )

    if (paragraphCount === 3) {
      elements.push(
        <div key={`ad-wrap-${idx}`}>
          {para}
          <div
            style={{
              width: '100%',
              maxWidth: '728px',
              height: '90px',
              margin: '18px 0 24px',
              background: tokens.bg3,
              border: `1px dashed ${tokens.border}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.muted,
              fontFamily: font.body,
              fontSize: 12,
            }}
          >
            728 × 90 Ad — Inline Sponsor Slot
          </div>
        </div>
      )
    } else {
      elements.push(para)
    }
  }

  return elements
}

export async function generateStaticParams() {
  const supabase = createServerClient()
  const { data } = await supabase.from('posts').select('slug').eq('is_published', true)
  return (data ?? []).map((post) => ({ slug: String(post.slug) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServerClient()
  const { data } = await supabase.from('posts').select('*').eq('slug', slug).eq('is_published', true).maybeSingle()
  if (!data) {
    return {
      title: 'Article Not Found | F1Rec',
      description: 'The requested article is not available.',
    }
  }
  const post = data as Post
  return {
    title: `${cleanTitle(post.title)} | F1Rec`,
    description: post.meta_description ?? post.excerpt ?? 'F1Rec editorial insight.',
    openGraph: {
      title: cleanTitle(post.title),
      description: post.meta_description ?? post.excerpt ?? 'F1Rec editorial insight.',
      type: 'article',
      url: `/blog/${post.slug}`,
      images: post.og_image_url ? [post.og_image_url] : [],
    },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data } = await supabase.from('posts').select('*').eq('slug', slug).eq('is_published', true).maybeSingle()

  if (!data) {
    return (
      <main style={{ fontFamily: font.body, background: tokens.bg, color: tokens.text, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '560px', width: '100%', border: `1px solid ${tokens.border}`, background: tokens.bg2, borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontFamily: font.display, fontSize: '40px', textTransform: 'uppercase' }}>Article Not Found</h1>
          <p style={{ margin: '0 0 18px', color: tokens.muted }}>The article you are looking for is unavailable or unpublished.</p>
          <Link href="/blog" style={{ display: 'inline-block', background: tokens.accent, color: '#fff', textDecoration: 'none', padding: '10px 16px', borderRadius: '8px', fontFamily: font.display, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            Back to Blog
          </Link>
        </div>
      </main>
    )
  }

  const post = data as Post

  const [{ data: related }, { data: relatedRace }, { data: relatedDriver }] = await Promise.all([
    supabase.from('posts').select('*').eq('is_published', true).neq('slug', post.slug).order('published_at', { ascending: false }).limit(3),
    post.related_race_slug ? supabase.from('races').select('*').eq('slug', post.related_race_slug).maybeSingle() : Promise.resolve({ data: null }),
    post.related_driver_slug ? supabase.from('drivers').select('*').eq('slug', post.related_driver_slug).maybeSingle() : Promise.resolve({ data: null }),
  ])

  let standings: Array<{ driver: string; points: number }> = []
  const seasonForStandings = typeof relatedRace?.season_year === 'number' ? relatedRace.season_year : null
  if (seasonForStandings) {
    const { data: rows } = await supabase.from('results').select('driver_name,driver_slug,points').eq('season_year', seasonForStandings)
    const scores = new Map<string, number>()
    for (const row of rows ?? []) {
      const key = String(row.driver_name ?? row.driver_slug ?? 'Unknown')
      const points = typeof row.points === 'number' ? row.points : Number.parseFloat(String(row.points ?? '0')) || 0
      scores.set(key, (scores.get(key) ?? 0) + points)
    }
    standings = Array.from(scores.entries())
      .map(([driver, points]) => ({ driver, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5)
  }

  const shareUrl = `https://f1rec.com/blog/${post.slug}`
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    url: `https://f1rec.com/blog/${post.slug}`,
    datePublished: post.published_at,
    dateModified: post.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'F1Rec',
      url: 'https://f1rec.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://f1rec.com/blog/${post.slug}`,
    },
  }

  return (
    <main style={{ fontFamily: font.body, background: tokens.bg, color: tokens.text, minHeight: '100vh' }}>
      <JsonLd data={articleJsonLd} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px 48px' }}>
        <nav style={{ fontSize: '13px', color: tokens.muted, marginBottom: '18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: tokens.muted, textDecoration: 'none' }}>Home</Link>
          <span aria-hidden>›</span>
          <Link href="/blog" style={{ color: tokens.muted, textDecoration: 'none' }}>Blog</Link>
          <span aria-hidden>›</span>
          <span>{categoryLabel(post.category)}</span>
          <span aria-hidden>›</span>
          <span style={{ color: tokens.text }}>{cleanTitle(post.title)}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '32px', alignItems: 'start' }}>
          <article>
            <header style={{ border: `1px solid ${tokens.border}`, background: `linear-gradient(135deg, ${tokens.bg} 0%, ${tokens.bg2} 45%, #171722 100%)`, borderRadius: '12px', padding: '26px', marginBottom: '20px' }}>
              <div style={{ color: tokens.accent, fontFamily: font.display, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', fontSize: '12px', marginBottom: '8px' }}>
                {categoryLabel(post.category)}
              </div>
              <h1 style={{ margin: '0 0 10px', fontFamily: font.display, fontWeight: 900, fontSize: 'clamp(34px,5vw,56px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
                {cleanTitle(post.title)}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', color: tokens.muted, fontSize: '13px' }}>
                <span>{formatDate(post.published_at)}</span>
                <span>{readTime(post)} min read</span>
                <span>{post.author ?? 'F1Rec Editorial'}</span>
              </div>
            </header>

            <div
              style={{
                maxWidth: '780px',
                fontFamily: font.body,
                fontSize: 18,
                lineHeight: 1.75,
                color: tokens.text,
              }}
            >
              {renderMarkdownWithAd(post.content ?? '')}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px', marginBottom: '30px' }}>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(cleanTitle(post.title))}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', border: `1px solid ${tokens.border}`, background: tokens.bg2, color: tokens.text, borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>Share on X</a>
              <a href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(cleanTitle(post.title))}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', border: `1px solid ${tokens.border}`, background: tokens.bg2, color: tokens.text, borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>Share on Reddit</a>
              <button type="button" style={{ border: `1px solid ${tokens.border}`, background: tokens.bg2, color: tokens.text, borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                Copy Link
              </button>
            </div>

            <section>
              <h2 style={{ margin: '0 0 12px', fontFamily: font.display, fontSize: '28px', textTransform: 'uppercase' }}>
                Related <span style={{ color: tokens.accent }}>Articles</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {(related ?? []).map((item) => (
                  <Link key={item.slug} href={`/blog/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', border: `1px solid ${tokens.border}`, borderRadius: '10px', background: tokens.bg2, padding: '14px' }}>
                    <div style={{ color: tokens.accent, fontFamily: font.display, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                      {categoryLabel(item.category as string | null)}
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontFamily: font.display, fontSize: '22px', lineHeight: 1, textTransform: 'uppercase' }}>{item.title as string}</h3>
                    <p style={{ margin: 0, color: tokens.muted, fontSize: '13px', lineHeight: 1.5 }}>{(item.excerpt as string | null) ?? ''}</p>
                  </Link>
                ))}
              </div>
            </section>
          </article>

          <aside style={{ width: '300px', position: 'sticky', top: '72px' }}>
            <div style={{ background: tokens.bg2, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontFamily: font.display, textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 800, marginBottom: '10px' }}>Related Race</div>
              {relatedRace ? (
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 700 }}>{String(relatedRace.name ?? relatedRace.slug)}</div>
                  <div style={{ color: tokens.muted, marginTop: '4px' }}>
                    {String(relatedRace.season_year ?? '')} • Round {String(relatedRace.round ?? '')}
                  </div>
                </div>
              ) : (
                <div style={{ color: tokens.muted, fontSize: '13px' }}>No related race tagged.</div>
              )}
            </div>

            <div style={{ background: tokens.bg2, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontFamily: font.display, textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 800, marginBottom: '10px' }}>Related Driver</div>
              {relatedDriver ? (
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 700 }}>
                    {String(relatedDriver.first_name ?? '')} {String(relatedDriver.last_name ?? '')}
                  </div>
                  <div style={{ color: tokens.muted, marginTop: '4px' }}>{String(relatedDriver.nationality ?? '')}</div>
                </div>
              ) : (
                <div style={{ color: tokens.muted, fontSize: '13px' }}>No related driver tagged.</div>
              )}
            </div>

            <div style={{ background: tokens.bg2, border: `1px solid ${tokens.border}`, borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontFamily: font.display, textTransform: 'uppercase', letterSpacing: '0.9px', fontWeight: 800, marginBottom: '10px' }}>Season Standings</div>
              {standings.length > 0 ? (
                standings.map((row) => (
                  <div key={row.driver} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderBottom: `1px solid ${tokens.border}`, padding: '8px 0', fontSize: '13px' }}>
                    <span>{row.driver}</span>
                    <span style={{ color: tokens.muted }}>{Number.isInteger(row.points) ? row.points : row.points.toFixed(1)} pts</span>
                  </div>
                ))
              ) : (
                <div style={{ color: tokens.muted, fontSize: '13px' }}>Standings unavailable for this article.</div>
              )}
            </div>

            <div
              style={{
                width: '300px',
                height: '250px',
                background: tokens.bg3,
                border: `1px dashed ${tokens.border}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.muted,
                fontSize: '12px',
              }}
            >
              300 × 250 Ad Slot
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
