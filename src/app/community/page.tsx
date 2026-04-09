'use client'

import { useEffect } from 'react'

const youtube = [
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

const social = [
  { name: 'r/formula1', members: '4M+ members', desc: 'Main F1 subreddit — news, discussion, race threads.', url: 'https://reddit.com/r/formula1', platform: 'Reddit' },
  { name: 'r/F1Technical', members: '300K+ members', desc: 'Deep technical discussion — aero, PU, strategy.', url: 'https://reddit.com/r/F1Technical', platform: 'Reddit' },
  { name: 'r/formuladank', members: '2M+ members', desc: 'F1 memes and shitposting.', url: 'https://reddit.com/r/formuladank', platform: 'Reddit' },
  { name: '@F1', members: '35M+ followers', desc: 'Official Formula 1 account.', url: 'https://x.com/F1', platform: 'X' },
  { name: '@theaboratory', members: '', desc: 'F1 data analysis and visualisations.', url: 'https://x.com/theaboratory', platform: 'X' },
  { name: '@ScarbsTech', members: '', desc: 'Technical analysis legend — aero drawings and insight.', url: 'https://x.com/ScarbsTech', platform: 'X' },
  { name: '@ChrisMedlandF1', members: '', desc: 'Paddock reporter — breaking news and insider takes.', url: 'https://x.com/ChrisMedlandF1', platform: 'X' },
]

const podcasts = [
  { name: 'Beyond The Grid', desc: 'Official F1 podcast — long-form driver and team interviews.', url: 'https://www.formula1.com/en/latest/tags/beyond-the-grid' },
  { name: 'Missed Apex', desc: 'Independent race reviews and analysis from dedicated fans.', url: 'https://missedapexpodcast.com' },
  { name: 'The Race F1 Podcast', desc: 'Expert analysis from the best motorsport journalists.', url: 'https://the-race.com/podcasts/' },
  { name: 'Shift+F1', desc: 'Approachable F1 coverage for new and returning fans.', url: 'https://www.f1.cool' },
]

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    YouTube: { bg: 'rgba(255,0,0,0.12)', text: '#ff4444' },
    Reddit: { bg: 'rgba(255,69,0,0.12)', text: '#ff6634' },
    X: { bg: 'rgba(255,255,255,0.08)', text: 'var(--text)' },
    Podcast: { bg: 'rgba(149,84,255,0.12)', text: '#9b6dff' },
  }
  const c = colors[platform] || colors.X
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', fontSize: '0.6rem', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: c.bg, color: c.text, borderRadius: '3px' }}>
      {platform}
    </span>
  )
}

export default function CommunityPage() {
  useEffect(() => {
    document.title = 'F1 Community — Best YouTube, Reddit & Podcasts | F1Rec'
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Hero */}
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>Curated by F1Rec</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          The F1<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Community</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          The best voices in Formula 1 — curated for real fans.
        </p>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* YouTube */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              F1 <span style={{ color: '#ff4444' }}>YouTube</span>
            </h2>
            <PlatformBadge platform="YouTube" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {youtube.map(ch => (
              <a key={ch.name} href={ch.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#ff4444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>{ch.name}</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{ch.subs}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{ch.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ff4444' }}>Watch &rarr;</span>
              </a>
            ))}
          </div>
        </div>

        {/* Social */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              F1 <span style={{ color: 'var(--accent)' }}>Social</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {social.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700 }}>{s.name}</span>
                  <PlatformBadge platform={s.platform} />
                </div>
                {s.members && <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-jetbrains, monospace)', marginBottom: '0.4rem' }}>{s.members}</span>}
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{s.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>Visit &rarr;</span>
              </a>
            ))}
          </div>
        </div>

        {/* Podcasts */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              F1 <span style={{ color: '#9b6dff' }}>Podcasts</span>
            </h2>
            <PlatformBadge platform="Podcast" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {podcasts.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#9b6dff')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>{p.name}</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', flex: 1, lineHeight: 1.5 }}>{p.desc}</p>
                <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b6dff' }}>Listen &rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
