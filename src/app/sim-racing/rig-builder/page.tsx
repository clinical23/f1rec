import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import RigBuilder from '@/components/rig-builder/RigBuilder'
import { builderCategoryFromRow } from '@/components/rig-builder/utils'
import type { RigPresetRow, RigProduct, SimBrandRow } from '@/components/rig-builder/types'

export const metadata: Metadata = {
  title: 'Sim Racing Rig Builder — Build Your Dream Setup | F1Rec',
  description:
    'Build your perfect sim racing rig. Choose from 57 products across 27 brands — wheel bases, pedals, cockpits, steering wheels, monitors, and more. Compare prices and buy.',
  openGraph: {
    title: 'Sim Racing Rig Builder | F1Rec',
    description: 'Build your dream sim racing setup with our interactive configurator.',
    url: 'https://f1rec.com/sim-racing/rig-builder',
    siteName: 'F1Rec',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sim Racing Rig Builder | F1Rec',
    description: 'Build your dream sim racing setup with our interactive configurator.',
  },
}

type ProductRow = {
  id: string
  name: string
  slug: string | null
  brand: string | null
  price_gbp: number | string | null
  rating: number | string | null
  short_description: string | null
  description: string | null
  affiliate_url: string | null
  image_url: string | null
  sim_product_categories: { name: string; slug: string } | { name: string; slug: string }[] | null
}

async function loadData() {
  const supabase = createServerClient()

  const [productsRes, brandsRes, presetsRes, reviewsRes] = await Promise.all([
    supabase
      .from('sim_products')
      .select(
        'id, name, slug, brand, price_gbp, rating, short_description, description, affiliate_url, image_url, sim_product_categories(name, slug)'
      ),
    supabase.from('sim_brands').select('id, name, website_url'),
    supabase.from('rig_presets').select('*').order('sort_order', { ascending: true }),
    supabase.from('sim_reviews').select('product_id, rating'),
  ])

  const reviewMax = new Map<string, number>()
  for (const r of reviewsRes.data ?? []) {
    const pid = r.product_id as string
    const val = Number(r.rating)
    if (!Number.isFinite(val)) continue
    reviewMax.set(pid, Math.max(reviewMax.get(pid) ?? 0, val))
  }

  const rawRows = (productsRes.data ?? []) as ProductRow[]
  const products: RigProduct[] = []

  for (const row of rawRows) {
    const cat = row.sim_product_categories
    const c = Array.isArray(cat) ? cat[0] : cat
    const builderCategory = builderCategoryFromRow(c?.slug ?? null, c?.name ?? null)
    if (!builderCategory) continue

    const rr = reviewMax.get(row.id)
    products.push({
      id: row.id,
      name: row.name,
      slug: row.slug ?? null,
      brand: row.brand ?? null,
      price_gbp: row.price_gbp != null ? Number(row.price_gbp) : null,
      short_description: row.short_description ?? row.description ?? null,
      affiliate_url: row.affiliate_url ?? null,
      image_url: row.image_url ?? null,
      rating: row.rating != null ? Number(row.rating) : null,
      review_rating: rr != null && Number.isFinite(rr) ? rr : null,
      category_slug: c?.slug ?? null,
      category_name: c?.name ?? null,
      builderCategory,
    })
  }

  const productsByCategory: Record<string, RigProduct[]> = {}
  for (const p of products) {
    if (!productsByCategory[p.builderCategory]) productsByCategory[p.builderCategory] = []
    productsByCategory[p.builderCategory].push(p)
  }

  const productById: Record<string, RigProduct> = {}
  for (const p of products) {
    productById[p.id] = p
  }

  let presets: RigPresetRow[] = []
  if (!presetsRes.error && presetsRes.data) {
    presets = presetsRes.data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      slug: String(row.slug ?? ''),
      description: (row.description as string) ?? null,
      tier: String(row.tier ?? 'budget'),
      total_price: row.total_price != null ? Number(row.total_price) : null,
      currency: (row.currency as string) ?? null,
      product_ids: Array.isArray(row.product_ids) ? (row.product_ids as string[]) : null,
      sort_order: row.sort_order != null ? Number(row.sort_order) : null,
    }))
  }

  const brands = ((brandsRes.data ?? []) as SimBrandRow[]).filter((b) => b.name)

  return {
    productsByCategory,
    productById,
    presets,
    brands,
    productCount: products.length,
    brandCount: new Set(products.map((p) => p.brand).filter(Boolean)).size,
  }
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'F1Rec Sim Racing Rig Builder',
  description: 'Interactive sim racing rig configurator',
  url: 'https://f1rec.com/sim-racing/rig-builder',
  applicationCategory: 'ShoppingApplication',
  operatingSystem: 'Web',
}

export default async function RigBuilderPage() {
  const data = await loadData()

  return (
    <>
      <JsonLd data={jsonLd} id="jsonld-rig-builder" />
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
            Loading rig builder…
          </div>
        }
      >
        <RigBuilder
          productsByCategory={data.productsByCategory}
          productById={data.productById}
          presets={data.presets}
          brands={data.brands}
          productCount={data.productCount}
          brandCount={data.brandCount}
        />
      </Suspense>
    </>
  )
}
