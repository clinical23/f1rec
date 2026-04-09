'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Review {
  id: string; slug: string; title: string; excerpt: string | null
  category: string; rating: number; featured: boolean
  published_at: string | null; view_count: number
  product_name: string | null; brand: string | null; price_gbp: number | null
}

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Wheel Bases', value: 'wheel-base' },
  { label: 'Pedals', value: 'pedals' },
  { label: 'Rigs', value: 'rig' },
  { label: 'Monitors', value: 'monitor' },
]

const categoryColors: Record<string, { bg: string; text: string }> = {
  'wheel-base': { bg: 'rgba(59,130,246,0.12)', text: 'var(--blue, #3b82f6)' },
  pedals: { bg: 'rgba(0,212,160,0.12)', text: 'var(--green, #00d4a0)' },
  rig: { bg: 'rgba(245,200,66,0.12)', text: 'var(--gold, #f5c842)' },
  monitor: { bg: 'rgba(206,147,216,0.12)', text: '#ce93d8' },
}

function RatingBar({ rating }: { rating: number }) {
  const pct = (rating / 10) * 100
  const color = rating >= 9 ? 'var(--green)' : rating >= 8 ? 'var(--gold)' : rating >= 7 ? 'var(--text)' : 'var(--muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 800, color, minWidth: '2.5rem', textAlign: 'right' }}>{rating}/10</span>
    </div>
  )
}

function formatDate(val: string | null) {
  if (!val) return ''
  return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    document.title = 'Sim Racing Hardware Reviews — Expert Ratings | F1Rec'
  }, [])

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('sim_reviews')
        .select('id, slug, title, excerpt, category, rating, featured, published_at, view_count, product_id, sim_products!inner(name, brand, price_gbp)')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('rating', { ascending: false })
      if (data) {
        setReviews(data.map((r: any) => ({
          id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt,
          category: r.category, rating: Number(r.rating), featured: r.featured,
          published_at: r.published_at, view_count: r.view_count,
          product_name: r.sim_products?.name ?? null,
          brand: r.sim_products?.brand ?? null,
          price_gbp: r.sim_products?.price_gbp ? Number(r.sim_products.price_gbp) : null,
        })))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews
    return reviews.filter(r => r.category === filter)
  }, [reviews, filter])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>Sim Racing</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Hardware<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Reviews</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          Honest, in-depth reviews of wheels, pedals, rigs, and everything in between.
        </p>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilter(c.value)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: filter === c.value ? 'var(--accent)' : 'var(--border)', background: filter === c.value ? 'rgba(232,0,45,0.15)' : 'transparent', color: filter === c.value ? 'var(--accent)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading reviews...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {filtered.map(r => {
              const catStyle = categoryColors[r.category] ?? { bg: 'var(--bg3)', text: 'var(--muted)' }
              return (
                <Link key={r.id} href={`/sim-racing/reviews/${r.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', fontSize: '0.6rem', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: catStyle.bg, color: catStyle.text, borderRadius: '3px' }}>
                      {r.category}
                    </span>
                    {r.brand && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.brand}</span>
                    )}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: '0.6rem' }}>{r.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem', flex: 1 }}>{r.excerpt || ''}</p>
                  <RatingBar rating={r.rating} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
                    <span>{formatDate(r.published_at)}{r.view_count > 0 ? ` · ${r.view_count.toLocaleString()} views` : ''}</span>
                    {r.price_gbp != null && <span style={{ fontWeight: 600, color: 'var(--green)' }}>&pound;{r.price_gbp}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
