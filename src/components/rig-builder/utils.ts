import type { RigProduct } from './types'

/** Map DB category → builder slot key */
export function builderCategoryFromRow(categorySlug: string | null, categoryName: string | null): string | null {
  const slug = (categorySlug ?? '').toLowerCase()
  const name = (categoryName ?? '').toLowerCase()
  const blob = `${slug} ${name}`

  if (blob.includes('wheel-base') || blob.includes('wheelbase') || slug === 'wheel-bases') return 'wheel-bases'
  if (blob.includes('pedal')) return 'pedals'
  if (blob.includes('rig') || blob.includes('cockpit') || slug.includes('rigs')) return 'rigs'
  if (blob.includes('steering')) return 'steering-wheels'
  if (blob.includes('monitor') || blob.includes('display')) return 'monitors'
  if (blob.includes('vr') || blob.includes('headset')) return 'vr-headsets'
  if (/\bpc\b|computer|gaming pc|sim pc/.test(blob)) return 'pcs'
  if (blob.includes('access')) return 'accessories'

  return null
}

export function formatGbp(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function displayRating(p: RigProduct): number | null {
  const r = p.review_rating ?? p.rating
  if (r == null || !Number.isFinite(Number(r))) return null
  return Number(r)
}

export function productListFromBuild(build: Record<string, RigProduct | RigProduct[] | null>): RigProduct[] {
  const out: RigProduct[] = []
  for (const [, v] of Object.entries(build)) {
    if (!v) continue
    if (Array.isArray(v)) out.push(...v)
    else out.push(v)
  }
  return out
}

export function sumBuildPrice(build: Record<string, RigProduct | RigProduct[] | null>): number {
  return productListFromBuild(build).reduce((s, p) => s + (p.price_gbp ?? 0), 0)
}
