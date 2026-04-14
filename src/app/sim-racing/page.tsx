import Link from 'next/link'
import BrandsWall from './brands-wall'
import SoundLink from '@/components/SoundLink'
import EmailCapture from '@/components/EmailCapture'
import { createServerClient } from '@/lib/supabase/server'

const categories = [
  {
    title: 'Products',
    desc: 'Browse our full hardware catalogue with filters by category, brand, rating, and price.',
    href: '/sim-racing/products',
    icon: '🛒',
    tag: 'CATALOGUE',
  },
  {
    title: 'Hardware reviews',
    desc: 'Honest, in-depth reviews of wheels, pedals, rigs, and everything in between.',
    href: '/sim-racing/reviews',
    icon: '🎯',
    tag: 'REVIEWS',
  },
  {
    title: 'Rig builder',
    desc: 'Configure your dream sim racing setup. Compare prices, check compatibility, buy with one click.',
    href: '/sim-racing/rig-builder',
    icon: '🔧',
    tag: 'INTERACTIVE TOOL',
  },
  {
    title: 'Game guides',
    desc: 'Master iRacing, ACC, and Assetto Corsa Evo with track guides, setup tips, and driving tutorials.',
    href: '/sim-racing/guides',
    icon: '🏁',
    tag: 'GUIDES',
  },
  {
    title: 'Setup library',
    desc: 'Download community-tested car setups for every track. iRacing, ACC, and more.',
    href: '/sim-racing/setups',
    icon: '⚙️',
    tag: 'DOWNLOADS',
  },
]

const featuredProducts = [
  { name: 'Fanatec DD Pro', category: 'Wheel base', price: '£349', rating: 8.5, tag: 'Best value' },
  { name: 'Moza R12', category: 'Wheel base', price: '£599', rating: 9.0, tag: 'Editor\'s choice' },
  { name: 'Asetek Forte', category: 'Pedals', price: '£489', rating: 9.2, tag: 'Premium pick' },
  { name: 'Trak Racer TR120', category: 'Rig', price: '£399', rating: 8.8, tag: 'Best rig' },
]

const gameMeta: Record<string, { name: string; desc: string }> = {
  iracing: { name: 'iRacing', desc: 'The gold standard of online sim racing' },
  acc: { name: 'ACC', desc: 'GT3 racing perfection' },
  ace: { name: 'Assetto Corsa Evo', desc: 'The next generation of sim racing' },
}

export const metadata = {
  title: 'Sim Racing Hardware, Reviews & Setups | F1Rec',
  description: 'Your complete sim racing resource for hardware, reviews, setups, and buying guides on F1Rec.',
  openGraph: {
    title: 'Sim Racing Hardware, Reviews & Setups | F1Rec',
    description: 'Your complete sim racing resource for hardware, reviews, setups, and buying guides on F1Rec.',
    url: 'https://f1rec.com/sim-racing',
    siteName: 'F1Rec',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sim Racing Hardware, Reviews & Setups | F1Rec',
    description: 'Your complete sim racing resource for hardware, reviews, setups, and buying guides on F1Rec.',
  },
}

export default async function SimRacingPage() {
  const supabase = createServerClient()
  const { data: setupRows, error: setupError } = await supabase.from('sim_setups').select('game')
  if (setupError) {
    console.error('[sim-racing] failed to load setup counts', setupError)
  }

  const counts = new Map<string, number>()
  for (const row of setupRows ?? []) {
    const game = String(row.game ?? '').trim().toLowerCase()
    if (!game) continue
    counts.set(game, (counts.get(game) ?? 0) + 1)
  }

  const games = Object.entries(gameMeta)
    .map(([slug, meta]) => ({
      slug,
      name: meta.name,
      desc: meta.desc,
      setups: counts.get(slug) ?? 0,
    }))
    .filter((game) => game.setups > 0)

  return (
    <main>
      {/* Hero */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(232,0,45,0.08) 0%, transparent 60%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{
          color: 'var(--accent)',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          From the grid to the rig
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 7vw, 72px)',
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: 'var(--text)',
          marginBottom: '8px',
        }}>
          Sim Racing<br />
          <span style={{ color: 'var(--accent)' }}>Hub</span>
        </h1>
        <p style={{
          color: 'var(--muted)',
          fontSize: '17px',
          maxWidth: '580px',
          margin: '20px auto 32px',
          lineHeight: 1.6,
        }}>
          Expert hardware reviews, an interactive rig builder, and
          downloadable setups — everything you need to race faster.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <SoundLink href="/sim-racing/products" soundId="click" style={{
            background: 'var(--bg2)',
            color: 'var(--text)',
            padding: '14px 32px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s',
          }}>
            Browse products
          </SoundLink>
          <SoundLink href="/sim-racing/rig-builder" soundId="wheel-gun" style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '14px 32px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '4px',
            transition: 'opacity 0.2s',
          }}>
            Build your rig
          </SoundLink>
          <SoundLink href="/sim-racing/reviews" soundId="click" style={{
            background: 'transparent',
            color: 'var(--text)',
            padding: '14px 32px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s',
          }}>
            Browse reviews →
          </SoundLink>
        </div>
        <div style={{ marginTop: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { href: '/sim-racing/products', label: 'Products' },
            { href: '/sim-racing/reviews', label: 'Reviews' },
            { href: '/sim-racing/setups', label: 'Setups' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              textDecoration: 'none',
              borderRadius: '4px',
              padding: '0.35rem 0.6rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 700,
              fontSize: '0.68rem',
            }}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <BrandsWall />

      {/* Category cards */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}>
          {categories.map((cat) => (
            <Link key={cat.href} href={cat.href} style={{
              textDecoration: 'none',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '28px 24px',
              transition: 'border-color 0.2s, transform 0.2s',
              display: 'block',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '28px' }}>{cat.icon}</span>
                <span style={{
                  background: 'rgba(232,0,45,0.12)',
                  color: 'var(--accent)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '3px',
                }}>
                  {cat.tag}
                </span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '20px',
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                {cat.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5 }}>
                {cat.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px 24px 60px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '24px',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>
            Top <span style={{ color: 'var(--accent)' }}>picks</span>
          </h2>
          <Link href="/sim-racing/reviews" style={{
            color: 'var(--accent)',
            fontSize: '13px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '0.5px',
          }}>
            All reviews →
          </Link>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {featuredProducts.map((product) => (
            <div key={product.name} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <div style={{
                width: '100%',
                height: '140px',
                background: 'var(--bg3)',
                borderRadius: '6px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--muted)', fontSize: '13px', fontFamily: 'var(--font-display)' }}>
                  Product image
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {product.category}
                </span>
                <span style={{
                  background: 'rgba(245,200,66,0.12)',
                  color: 'var(--gold)',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  padding: '2px 8px',
                  borderRadius: '3px',
                }}>
                  {product.rating}/10
                </span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '17px',
                color: 'var(--text)',
                marginBottom: '4px',
              }}>
                {product.name}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '15px' }}>{product.price}</span>
                <span style={{
                  background: 'rgba(232,0,45,0.12)',
                  color: 'var(--accent)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '3px',
                }}>
                  {product.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Games section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px 24px 60px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '24px',
          textTransform: 'uppercase',
          color: 'var(--text)',
          marginBottom: '24px',
        }}>
          Setups <span style={{ color: 'var(--accent)' }}>available</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
          Live setup counts by game. Guides coming soon.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {games.length > 0 ? games.map((game) => (
            <div key={game.name} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '20px',
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginBottom: '4px',
              }}>
                {game.name}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
                {game.desc}
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{
                  background: 'var(--bg3)',
                  color: 'var(--green)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '4px',
                }}>
                  {game.setups} setups
                </span>
                <Link href="/sim-racing/setups" style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Browse →
                </Link>
              </div>
            </div>
          )) : (
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
              color: 'var(--muted)',
              fontSize: '14px',
            }}>
              No setup files are published yet.
            </div>
          )}
        </div>
      </section>

      {/* Email capture */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >
        <EmailCapture source="sim-racing" />
      </section>
    </main>
  )
}
