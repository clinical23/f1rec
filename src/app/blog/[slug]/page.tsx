import Link from 'next/link'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import EmailCapture from '@/components/EmailCapture'
import ShareRow from '@/components/blog/ShareRow'
import SidebarCards from '@/components/blog/SidebarCards'
import { calculateReadTime } from '@/lib/blog/read-time'

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

function cleanTitle(title: string | null | undefined): string {
  return String(title ?? '').replace(/^Title:\s*/i, '')
}

function relatedDriverDisplayLine(driver: Record<string, unknown>): string {
  const full = typeof driver.full_name === 'string' ? driver.full_name.trim() : ''
  if (full) return full
  const a = typeof driver.first_name === 'string' ? driver.first_name.trim() : ''
  const b = typeof driver.last_name === 'string' ? driver.last_name.trim() : ''
  return [a, b].filter(Boolean).join(' ') || '—'
}

function relatedDriverNationalityLine(driver: Record<string, unknown>): string {
  const n = driver.nationality
  if (typeof n === 'string' && n.trim()) return n.trim()
  return '—'
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

function safeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
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
  return calculateReadTime(post.content ?? '')
}

const bodyProseStyle = {
  fontFamily: font.body,
  fontSize: 18,
  lineHeight: 1.75,
  color: tokens.text,
} as const

function renderInlineMarkdown(text: string): ReactNode {
  if (!text.includes('**') && !text.includes('[')) return text
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push(<Fragment key={`t-${key++}`}>{text.slice(last, match.index)}</Fragment>)
    }
    if (match[1]) {
      out.push(
        <strong key={`b-${key++}`} style={{ fontWeight: 700 }}>
          {match[1]}
        </strong>
      )
    } else if (match[2] && match[3]) {
      const label = match[2]
      const href = match[3].trim()
      const isInternal = href.startsWith('/')
      if (isInternal) {
        out.push(
          <Link key={`l-${key++}`} href={href}>
            {label}
          </Link>
        )
      } else {
        out.push(
          <a key={`l-${key++}`} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        )
      }
    }
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
            letterSpacing: '-0.02em',
            color: tokens.text,
            fontWeight: 800,
            borderLeft: `2px solid ${tokens.gold}`,
            paddingLeft: '12px',
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
  return (data ?? [])
    .map((post) => safeText(post.slug))
    .filter(Boolean)
    .map((slug) => ({ slug }))
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
  const metaDescription = safeText(post.meta_description) || safeText(post.excerpt) || 'F1Rec editorial insight.'
  return {
    title: `${cleanTitle(post.title) || 'Article'} | F1Rec`,
    description: metaDescription,
    openGraph: {
      title: cleanTitle(post.title) || 'Article',
      description: metaDescription,
      type: 'article',
      url: `/blog/${post.slug}`,
      images: post.og_image_url ? [post.og_image_url] : [],
    },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).eq('is_published', true).maybeSingle()
  if (error || !data) notFound()

  const post = data as Post

  const [driverRes, raceRes, raceWinnerRes, morePostsRes] = await Promise.all([
    post.related_driver_slug
      ? supabase.from('drivers').select('slug, full_name, current_team').eq('slug', post.related_driver_slug).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    post.related_race_slug
      ? supabase.from('races').select('slug, name, round, race_date, season_year').eq('slug', post.related_race_slug).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    post.related_race_slug
      ? supabase
          .from('results')
          .select('driver_name')
          .eq('race_slug', post.related_race_slug)
          .eq('position', 1)
          .eq('is_sprint', false)
          .limit(1)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('posts')
      .select('slug, title, published_at')
      .eq('is_published', true)
      .eq('category', post.category)
      .neq('slug', post.slug)
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  const shareUrl = `https://f1rec.com/blog/${post.slug}`
  const headline = cleanTitle(post.title ?? 'Article')
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description: safeText(post.excerpt) || safeText(post.meta_description) || headline || 'F1Rec editorial article.',
    url: shareUrl,
    ...(post.published_at ? { datePublished: post.published_at, dateModified: post.published_at } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'F1Rec',
      url: 'https://f1rec.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': shareUrl,
    },
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <JsonLd data={articleJsonLd} />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--text)]">
            Home
          </Link>
          <span aria-hidden>›</span>
          <Link href="/blog" className="transition-colors hover:text-[var(--text)]">
            Blog
          </Link>
          <span aria-hidden>›</span>
          <span>{categoryLabel(post.category)}</span>
          <span aria-hidden>›</span>
          <span className="text-[var(--text)]">{cleanTitle(post.title)}</span>
        </nav>

        <div className="blog-layout">
          <div className="blog-layout__main">
            <header className="mb-10">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">
                  {categoryLabel(post.category)}
                </span>
              </div>
              <h1 className="font-display mb-6 text-5xl font-bold leading-[1.05] tracking-tight text-[var(--text)]">
                {cleanTitle(post.title)}
              </h1>
              {post.excerpt ? (
                <p className="mb-6 max-w-[65ch] text-xl leading-relaxed text-[var(--muted)]">{post.excerpt}</p>
              ) : null}
              <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
                <span aria-hidden>·</span>
                <span>{readTime(post)} min read</span>
              </div>
            </header>

            <article className="max-w-[70ch]">
              <div className="[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:decoration-[var(--accent)]/40 [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:decoration-[var(--accent)] [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--gold)]/60 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)]">
                {renderMarkdownWithAd(post.content ?? '')}
              </div>
            </article>

            <div className="mt-10 border-t border-[var(--border)] pt-8">
              <ShareRow title={cleanTitle(post.title)} excerpt={post.excerpt} url={shareUrl} />
            </div>
          </div>

          <aside className="blog-layout__sidebar">
            <SidebarCards
              relatedDriver={
                driverRes.data
                  ? {
                      slug: safeText(driverRes.data.slug),
                      full_name: safeText(driverRes.data.full_name, 'Driver'),
                      current_team: safeText(driverRes.data.current_team, ''),
                      championship_position: null,
                    }
                  : null
              }
              relatedRace={
                raceRes.data
                  ? {
                      slug: safeText(raceRes.data.slug),
                      name: safeText(raceRes.data.name, 'Grand Prix'),
                      round_number: Number(raceRes.data.round ?? 0),
                      race_date: safeText(raceRes.data.race_date),
                      winner_name:
                        Array.isArray(raceWinnerRes.data) && raceWinnerRes.data[0]
                          ? safeText(raceWinnerRes.data[0].driver_name, '') || null
                          : null,
                      season_year: Number(raceRes.data.season_year ?? 0),
                    }
                  : null
              }
              morePostsInCategory={(morePostsRes.data ?? [])
                .filter((item) => typeof item.slug === 'string' && typeof item.title === 'string' && typeof item.published_at === 'string')
                .map((item) => ({
                  slug: item.slug as string,
                  title: cleanTitle(item.title as string),
                  published_at: item.published_at as string,
                }))}
              category={post.category ?? 'analysis'}
            />
          </aside>
        </div>

        <footer className="mt-16 border-t border-[var(--border)] pt-8">
          <div className="max-w-[70ch] rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-6">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-[var(--gold)]">Stay in the loop</h3>
            <p className="mb-4 text-[var(--muted)]">Get Sunday-night race reviews and weekly stats drops in your inbox. No spam.</p>
            <EmailCapture source="blog-article" hideIntro />
          </div>
          <div className="mt-8">
            <Link href="/blog" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">
              ← Back to all posts
            </Link>
          </div>
        </footer>
      </section>
    </main>
  )
}
