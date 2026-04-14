'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import EmailCapture from '@/components/EmailCapture'

type CreatorRow = {
  id: string
  name: string
  platform: 'youtube' | 'twitch' | 'twitter' | 'reddit' | 'podcast' | 'website'
  category: 'f1-analysis' | 'f1-entertainment' | 'f1-official' | 'sim-racing' | 'sim-hardware' | 'f1-journalism' | 'f1-social'
  url: string
  description: string | null
  subscribers: string | null
  sort_order: number | null
}

type CreatorCard = {
  name: string
  desc: string
  url: string
  subs?: string
  platformLabel?: string
}

const fallbackYouTube: CreatorCard[] = [
  { name: 'Formula 1 Official', subs: '11M+', desc: 'Highlights, features, behind the scenes.', url: 'https://youtube.com/@Formula1' },
  { name: 'The Race', subs: '2M+', desc: 'Best race analysis and journalism.', url: 'https://youtube.com/@TheRace' },
  { name: 'Driver61', subs: '1.3M+', desc: 'Driving technique, engineering deep dives.', url: 'https://youtube.com/@Driver61' },
  { name: 'WTF1', subs: '1.2M+', desc: 'Infographics, rule explainers, entertainment.', url: 'https://youtube.com/@wtf1' },
  { name: 'Josh Revell', subs: '1M+', desc: '"WTF Happened To..." series, history.', url: 'https://youtube.com/@JoshRevell' },
  { name: 'Chain Bear', subs: '900K+', desc: 'Technical explainers, strategy breakdowns.', url: 'https://youtube.com/@chainbear' },
  { name: 'Tommo', subs: '600K+', desc: 'News, opinions, great graphics.', url: 'https://youtube.com/@TommoF1' },
  { name: 'Aldas', subs: '500K+', desc: 'Viral analysis, stats breakdowns.', url: 'https://youtube.com/@AldASF1' },
  { name: 'Peter Windsor', subs: '200K+', desc: 'Paddock insider, classic driver interviews.', url: 'https://youtube.com/@PeterWindsorF1' },
]

const fallbackSimCreators: CreatorCard[] = [
  { name: 'Jimmy Broadbent', subs: '1.2M subs', desc: 'The biggest sim racer on YouTube. Entertaining, chaotic, and surprisingly fast.', url: 'https://youtube.com/@JimmyBroadbent' },
  { name: 'Boosted Media', subs: '500K+', desc: "The most trusted sim racing hardware reviewer. If Dan says it's good, it's good.", url: 'https://youtube.com/@BoostedMedia' },
  { name: 'Dave Cam', subs: '200K+', desc: 'Daily iRacing streams and the most consistent sim racing content on YouTube.', url: 'https://youtube.com/@DaveCamYT' },
  { name: 'Chris Haye', subs: '300K+', desc: 'Sim rig builds, hardware reviews, and setup guides with production quality that rivals mainstream media.', url: 'https://youtube.com/@ChrisHaye' },
  { name: 'Jardier', subs: '150K+', desc: 'iRacing tutorials, race commentary, and the calmest voice in sim racing.', url: 'https://youtube.com/@Jardier' },
  { name: 'Barry Rowland / Sim Racing Garage', subs: '100K+', desc: 'The most detailed, scientific hardware testing on YouTube. Force curves, latency measurements, no shortcuts.', url: 'https://youtube.com/@SimRacingGarage' },
]

const fallbackSocial: CreatorCard[] = [
  { name: 'r/formula1', subs: '4M+ members', desc: 'Main F1 subreddit — news, discussion, race threads.', url: 'https://reddit.com/r/formula1', platformLabel: 'Reddit' },
  { name: 'r/F1Technical', subs: '300K+ members', desc: 'Deep technical discussion — aero, PU, strategy.', url: 'https://reddit.com/r/F1Technical', platformLabel: 'Reddit' },
  { name: 'r/formuladank', subs: '2M+ members', desc: 'F1 memes and shitposting.', url: 'https://reddit.com/r/formuladank', platformLabel: 'Reddit' },
  { name: '@F1', subs: '35M+ followers', desc: 'Official Formula 1 account.', url: 'https://x.com/F1', platformLabel: 'X' },
  { name: '@theaboratory', desc: 'F1 data analysis and visualisations.', url: 'https://x.com/theaboratory', platformLabel: 'X' },
]

const fallbackPodcasts: CreatorCard[] = [
  { name: 'Beyond The Grid', desc: 'Official F1 podcast — long-form driver and team interviews.', url: 'https://www.formula1.com/en/latest/tags/beyond-the-grid' },
  { name: 'Missed Apex', desc: 'Independent race reviews and analysis from dedicated fans.', url: 'https://missedapexpodcast.com' },
  { name: 'The Race F1 Podcast', desc: 'Expert analysis from the best motorsport journalists.', url: 'https://the-race.com/podcasts/' },
  { name: 'Shift+F1', desc: 'Approachable F1 coverage for new and returning fans.', url: 'https://www.f1.cool' },
]

const F1_YT_CATEGORIES = ['f1-official', 'f1-analysis', 'f1-entertainment', 'f1-journalism'] as const
const SIM_YT_CATEGORIES = ['sim-racing', 'sim-hardware'] as const

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    YouTube: { bg: 'rgba(255,0,0,0.12)', text: '#ff4444' },
    Reddit: { bg: 'rgba(255,69,0,0.12)', text: '#ff6634' },
    X: { bg: 'rgba(255,255,255,0.08)', text: 'var(--text)' },
    Podcast: { bg: 'rgba(149,84,255,0.12)', text: '#9b6dff' },
    'Sim Racing': { bg: 'rgba(0,212,160,0.12)', text: 'var(--green, #00d4a0)' },
  }
  const c = colors[platform] || colors.X
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', fontSize: '0.6rem', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: c.bg, color: c.text, borderRadius: '3px' }}>
      {platform}
    </span>
  )
}

export default function CommunityPage() {
  const [creators, setCreators] = useState<CreatorRow[] | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    document.title = 'F1 Community — Best YouTube, Reddit & Podcasts | F1Rec'

    async function fetchCreators() {
      const { data, error } = await supabase
        .from('community_creators')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })

      if (!error && data) {
        setCreators(data as CreatorRow[])
      }
    }

    fetchCreators()
  }, [])

  const sections = useMemo(() => {
    if (!creators || creators.length === 0) {
      return {
        f1Youtube: fallbackYouTube,
        simYoutube: fallbackSimCreators,
        social: fallbackSocial,
        podcasts: fallbackPodcasts,
      }
    }

    const toCard = (row: CreatorRow): CreatorCard => ({
      name: row.name,
      desc: row.description || '',
      url: row.url,
      subs: row.subscribers || undefined,
      platformLabel:
        row.platform === 'twitter'
          ? 'X'
          : row.platform === 'reddit'
            ? 'Reddit'
            : row.platform === 'podcast'
              ? 'Podcast'
              : row.platform.charAt(0).toUpperCase() + row.platform.slice(1),
    })

    const f1Youtube = creators
      .filter((c) => c.platform === 'youtube' && F1_YT_CATEGORIES.includes(c.category))
      .map(toCard)
    const simYoutube = creators
      .filter((c) => c.platform === 'youtube' && SIM_YT_CATEGORIES.includes(c.category))
      .map(toCard)
    const social = creators
      .filter((c) => c.platform === 'reddit' || c.platform === 'twitter')
      .map(toCard)
    const podcasts = creators
      .filter((c) => c.platform === 'podcast')
      .map(toCard)

    return {
      f1Youtube: f1Youtube.length > 0 ? f1Youtube : fallbackYouTube,
      simYoutube: simYoutube.length > 0 ? simYoutube : fallbackSimCreators,
      social: social.length > 0 ? social : fallbackSocial,
      podcasts: podcasts.length > 0 ? podcasts : fallbackPodcasts,
    }
  }, [creators])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Hero */}
      <section style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>Curated by F1Rec</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          The F1<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Community</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          The best voices in Formula 1 — curated for real fans.
        </p>
      </section>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        {/* Trending */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ borderRadius: '10px', padding: '1px', background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--green, #00d4a0) 70%, var(--accent)))' }}>
            <a
              href="https://youtube.com/@chainbear"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block', background: 'var(--bg2)', borderRadius: '9px', padding: '1.5rem' }}
            >
              <p style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.7rem', fontWeight: 700 }}>
                Trending Now
              </p>
              <h2 style={{ margin: '0.45rem 0', fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.5rem', lineHeight: 1, fontWeight: 800 }}>
                This Week&apos;s Pick
              </h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Chain Bear explains the 2026 active aero regulations in the clearest breakdown we&apos;ve seen. Essential viewing.
              </p>
            </a>
          </div>
        </div>

        {/* YouTube */}
        <div style={{ marginBottom: '4rem', borderTop: '1px solid #2a2a3a', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              F1 <span style={{ color: '#ff4444' }}>YouTube</span>
            </h2>
            <PlatformBadge platform="YouTube" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {(expandedSections.f1Youtube ? sections.f1Youtube : sections.f1Youtube.slice(0, 6)).map(ch => (
              <a key={ch.name} href={ch.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#ff4444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>{ch.name}</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{ch.subs || ''}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{ch.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ff4444' }}>Watch &rarr;</span>
              </a>
            ))}
          </div>
          {sections.f1Youtube.length > 6 ? (
            <button onClick={() => setExpandedSections((prev) => ({ ...prev, f1Youtube: !prev.f1Youtube }))}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
              {expandedSections.f1Youtube ? 'Show fewer creators' : `Show all ${sections.f1Youtube.length} creators`}
            </button>
          ) : null}
        </div>

        {/* Sim Racing Creators */}
        <div style={{ marginBottom: '4rem', borderTop: '1px solid #2a2a3a', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Sim Racing <span style={{ color: 'var(--green, #00d4a0)' }}>Creators</span>
            </h2>
            <PlatformBadge platform="Sim Racing" />
            <Link href="/sim-racing/reviews" style={{ marginLeft: 'auto', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              See our hardware reviews →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {(expandedSections.simYoutube ? sections.simYoutube : sections.simYoutube.slice(0, 6)).map(ch => (
              <a key={ch.name} href={ch.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green, #00d4a0)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>{ch.name}</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{ch.subs || ''}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{ch.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green, #00d4a0)' }}>Watch &rarr;</span>
              </a>
            ))}
          </div>
          {sections.simYoutube.length > 6 ? (
            <button onClick={() => setExpandedSections((prev) => ({ ...prev, simYoutube: !prev.simYoutube }))}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
              {expandedSections.simYoutube ? 'Show fewer creators' : `Show all ${sections.simYoutube.length} creators`}
            </button>
          ) : null}
        </div>

        {/* Social */}
        <div style={{ marginBottom: '4rem', borderTop: '1px solid #2a2a3a', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              F1 <span style={{ color: 'var(--accent)' }}>Social</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {(expandedSections.social ? sections.social : sections.social.slice(0, 6)).map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700 }}>{s.name}</span>
                  <PlatformBadge platform={s.platformLabel || 'X'} />
                </div>
                {s.subs && <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-jetbrains, monospace)', marginBottom: '0.4rem' }}>{s.subs}</span>}
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{s.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>Visit &rarr;</span>
              </a>
            ))}
          </div>
          {sections.social.length > 6 ? (
            <button onClick={() => setExpandedSections((prev) => ({ ...prev, social: !prev.social }))}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
              {expandedSections.social ? 'Show fewer creators' : `Show all ${sections.social.length} creators`}
            </button>
          ) : null}
        </div>

        {/* Podcasts */}
        <div style={{ marginBottom: '4rem', borderTop: '1px solid #2a2a3a', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              F1 <span style={{ color: '#9b6dff' }}>Podcasts</span>
            </h2>
            <PlatformBadge platform="Podcast" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {(expandedSections.podcasts ? sections.podcasts : sections.podcasts.slice(0, 6)).map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#9b6dff')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>{p.name}</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{p.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b6dff' }}>Listen &rarr;</span>
              </a>
            ))}
          </div>
          {sections.podcasts.length > 6 ? (
            <button onClick={() => setExpandedSections((prev) => ({ ...prev, podcasts: !prev.podcasts }))}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
              {expandedSections.podcasts ? 'Show fewer creators' : `Show all ${sections.podcasts.length} creators`}
            </button>
          ) : null}
        </div>

        {/* Join */}
        <EmailCapture source="community" />
      </div>
    </main>
  )
}
