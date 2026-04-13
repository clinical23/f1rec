'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SimBrand = {
  id: string
  name: string
}

export default function BrandsWall() {
  const [brands, setBrands] = useState<SimBrand[]>([])

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from('sim_brands')
        .select('*')
        .eq('is_featured', true)
        .order('sort_order')

      if (!error && data && data.length > 0) {
        setBrands(data as SimBrand[])
      }
    }

    fetchBrands()
  }, [])

  if (brands.length === 0) return null

  return (
    <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '38px 24px 20px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', textTransform: 'uppercase', color: '#e8e8f0', marginBottom: '6px' }}>
        Brands <span style={{ color: 'var(--accent)' }}>we cover</span>
      </h2>
      <p style={{ margin: '0 0 18px', color: '#888899', fontSize: '14px' }}>
        57 products from 27 of the world&apos;s best sim racing manufacturers
      </p>
      <div className="sim-brand-wall" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/sim-racing/products?brand=${encodeURIComponent(brand.name)}`}
            className="sim-brand-card"
            style={{
              textDecoration: 'none',
              background: '#111118',
              border: '1px solid #2a2a3a',
              borderRadius: '8px',
              minHeight: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '16px 12px',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <span style={{ color: '#e8e8f0', fontFamily: '\'Barlow Condensed\', sans-serif', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '14px', lineHeight: 1 }}>
              {brand.name}
            </span>
          </Link>
        ))}
      </div>
      <style>{`
        .sim-brand-card:hover {
          transform: translateY(-2px);
          border-color: #e8002d !important;
        }
        @media (max-width: 980px) {
          .sim-brand-wall { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .sim-brand-wall { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </section>
  )
}
