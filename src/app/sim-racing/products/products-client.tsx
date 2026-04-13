'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSound } from '@/components/SoundProvider'

type CategoryFilter =
  | 'all'
  | 'wheel-bases'
  | 'pedals'
  | 'rigs-cockpits'
  | 'steering-wheels'
  | 'monitors'
  | 'accessories'

type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'brand'

type Product = {
  id: string
  brand: string | null
  name: string
  category_name: string | null
  category_slug: string | null
  price_gbp: number | null
  rating: number | null
  short_description: string | null
  affiliate_url: string | null
  is_featured: boolean
  is_budget_pick: boolean
  is_premium_pick: boolean
  pros: string[] | null
  cons: string[] | null
}

type SimBrand = {
  id: string
  name: string
  sort_order: number | null
}

const CATEGORY_PILLS: Array<{ label: string; value: CategoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Wheel Bases', value: 'wheel-bases' },
  { label: 'Pedals', value: 'pedals' },
  { label: 'Rigs & Cockpits', value: 'rigs-cockpits' },
  { label: 'Steering Wheels', value: 'steering-wheels' },
  { label: 'Monitors', value: 'monitors' },
  { label: 'Accessories', value: 'accessories' },
]

function normalizeCategory(slug: string | null, name: string | null): CategoryFilter {
  const source = `${slug || ''} ${name || ''}`.toLowerCase()
  if (source.includes('wheel-base') || source.includes('wheelbase')) return 'wheel-bases'
  if (source.includes('pedal')) return 'pedals'
  if (source.includes('rig') || source.includes('cockpit')) return 'rigs-cockpits'
  if (source.includes('steering') || source.includes('wheel')) return 'steering-wheels'
  if (source.includes('monitor') || source.includes('display')) return 'monitors'
  return 'accessories'
}

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [featuredBrands, setFeaturedBrands] = useState<SimBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [brand, setBrand] = useState('all')
  const [sort, setSort] = useState<SortKey>('price-desc')
  const { playSound } = useSound()

  useEffect(() => {
    async function fetchProducts() {
      const [{ data: productData }, { data: brandData }] = await Promise.all([
        supabase
          .from('sim_products')
          .select('id, name, brand, price_gbp, rating, short_description, affiliate_url, is_featured, is_budget_pick, is_premium_pick, pros, cons, category_id, sim_product_categories(name, slug)')
          .order('brand', { ascending: true })
          .order('price_gbp', { ascending: false }),
        supabase
          .from('sim_brands')
          .select('id, name, sort_order')
          .eq('is_featured', true)
          .order('sort_order', { ascending: true }),
      ])

      if (productData) {
        setProducts(
          productData.map((row: any) => ({
            id: row.id,
            brand: row.brand ?? null,
            name: row.name,
            category_name: row.sim_product_categories?.name ?? null,
            category_slug: row.sim_product_categories?.slug ?? null,
            price_gbp: row.price_gbp != null ? Number(row.price_gbp) : null,
            rating: row.rating != null ? Number(row.rating) : null,
            short_description: row.short_description ?? null,
            affiliate_url: row.affiliate_url ?? null,
            is_featured: Boolean(row.is_featured),
            is_budget_pick: Boolean(row.is_budget_pick),
            is_premium_pick: Boolean(row.is_premium_pick),
            pros: Array.isArray(row.pros) ? row.pros : null,
            cons: Array.isArray(row.cons) ? row.cons : null,
          }))
        )
      }
      if (brandData) {
        setFeaturedBrands(brandData as SimBrand[])
      }
      setLoading(false)
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const value = new URLSearchParams(window.location.search).get('brand')
    if (value) {
      setBrand(value)
    }
  }, [])

  const brands = useMemo(() => {
    return ['all', ...Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort()] as string[]
  }, [products])

  const filteredAndSorted = useMemo(() => {
    let rows = products
    if (category !== 'all') {
      rows = rows.filter((p) => normalizeCategory(p.category_slug, p.category_name) === category)
    }
    if (brand !== 'all') {
      rows = rows.filter((p) => p.brand === brand)
    }

    rows = [...rows].sort((a, b) => {
      if (sort === 'price-asc') return (a.price_gbp ?? Number.MAX_SAFE_INTEGER) - (b.price_gbp ?? Number.MAX_SAFE_INTEGER)
      if (sort === 'price-desc') return (b.price_gbp ?? -1) - (a.price_gbp ?? -1)
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1)
      return (a.brand ?? '').localeCompare(b.brand ?? '')
    })

    return rows
  }, [products, category, brand, sort])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>
          Sim Racing Hardware
        </p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.05 }}>
          Sim Racing<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Hardware</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '560px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          Every wheel, pedal, and rig — reviewed and rated.
        </p>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.15rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '6px' }}>
            Trusted <span style={{ color: 'var(--accent)' }}>Brands</span>
          </h2>
          <div className="products-brand-wall" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
            {featuredBrands.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  playSound('click')
                  setBrand(item.name)
                }}
                style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${brand === item.name ? 'var(--accent)' : 'var(--border)'}`,
                  borderBottom: `2px solid ${brand === item.name ? 'var(--accent)' : 'transparent'}`,
                  borderRadius: '6px',
                  minHeight: '56px',
                  color: '#fff',
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.82rem' }}>
            {products.length} products from {new Set(products.map((p) => p.brand).filter(Boolean)).size} brands
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <select value={brand} onChange={(e) => { playSound('click'); setBrand(e.target.value) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', padding: '0.45rem 0.55rem', fontSize: '0.8rem' }}>
              {brands.map((b) => (
                <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => { playSound('click'); setSort(e.target.value as SortKey) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', padding: '0.45rem 0.55rem', fontSize: '0.8rem' }}>
              <option value="price-asc">Price Low→High</option>
              <option value="price-desc">Price High→Low</option>
              <option value="rating">Rating</option>
              <option value="brand">Brand A-Z</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {CATEGORY_PILLS.map((pill) => (
            <button key={pill.value} onClick={() => { playSound('click'); setCategory(pill.value) }} style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: category === pill.value ? 'var(--accent)' : 'var(--border)', background: category === pill.value ? 'rgba(232,0,45,0.15)' : 'transparent', color: category === pill.value ? 'var(--accent)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
              {pill.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading products...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.75rem' }}>
            {filteredAndSorted.map((product) => (
              <div key={product.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontSize: '0.68rem' }}>
                    {product.brand || 'Unknown brand'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {product.is_featured && <span style={{ fontSize: '0.58rem', background: 'rgba(232,0,45,0.15)', color: 'var(--accent)', padding: '0.2rem 0.4rem', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.08em' }}>FEATURED</span>}
                    {product.is_budget_pick && <span style={{ fontSize: '0.58rem', background: 'rgba(0,212,160,0.14)', color: 'var(--green)', padding: '0.2rem 0.4rem', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.08em' }}>BEST VALUE</span>}
                    {product.is_premium_pick && <span style={{ fontSize: '0.58rem', background: 'rgba(245,200,66,0.14)', color: 'var(--gold)', padding: '0.2rem 0.4rem', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.08em' }}>PREMIUM</span>}
                  </div>
                </div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.25rem', textTransform: 'uppercase', lineHeight: 1.05 }}>
                  {product.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', padding: '0.18rem 0.45rem', borderRadius: '3px', background: 'var(--bg3)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-barlow-condensed)' }}>
                    {product.category_name || 'Uncategorized'}
                  </span>
                  {product.rating != null && <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{product.rating}/10</span>}
                </div>
                <p style={{ margin: '0.2rem 0 0.5rem', color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.45, flex: 1 }}>
                  {product.short_description || 'No summary available yet.'}
                </p>
                {(product.pros?.length || product.cons?.length) ? (
                  <details style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.45rem 0.6rem', background: 'var(--bg)' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700 }}>
                      Pros & Cons
                    </summary>
                    {product.pros && product.pros.length > 0 && (
                      <ul style={{ margin: '0.45rem 0 0.3rem', paddingLeft: '1rem', color: 'var(--green)', fontSize: '0.78rem' }}>
                        {product.pros.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    )}
                    {product.cons && product.cons.length > 0 && (
                      <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1rem', color: 'var(--accent)', fontSize: '0.78rem' }}>
                        {product.cons.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    )}
                  </details>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1rem' }}>
                    {product.price_gbp != null ? `£${product.price_gbp.toLocaleString()}` : 'Price TBC'}
                  </span>
                  {product.affiliate_url ? (
                    <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer" onClick={() => playSound('wheel-gun')} style={{ textDecoration: 'none', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: '4px', padding: '0.45rem 0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.68rem' }}>
                      Buy
                    </a>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>No link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <style>{`
          @media (max-width: 980px) {
            .products-brand-wall { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 640px) {
            .products-brand-wall { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
        `}</style>
      </section>
    </main>
  )
}
