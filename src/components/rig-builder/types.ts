export type RigProduct = {
  id: string
  name: string
  slug: string | null
  brand: string | null
  price_gbp: number | null
  short_description: string | null
  affiliate_url: string | null
  image_url: string | null
  rating: number | null
  review_rating: number | null
  category_slug: string | null
  category_name: string | null
  /** Normalized builder slot key */
  builderCategory: string
}

export type RigPresetRow = {
  id: string
  name: string
  slug: string
  description: string | null
  tier: string
  total_price: number | null
  currency: string | null
  product_ids: string[] | null
  sort_order: number | null
}

export type SimBrandRow = {
  id: string
  name: string
  website_url: string | null
}

export type BuildState = {
  [categorySlug: string]: RigProduct | RigProduct[] | null
}

export const REQUIRED_KEYS = ['wheel-bases', 'pedals', 'rigs', 'steering-wheels'] as const

export const OPTIONAL_KEYS = ['monitors', 'vr-headsets', 'pcs', 'accessories'] as const

export const BUILDER_SLOTS: Array<{
  key: string
  label: string
  icon: string
  required: boolean
  multiple: boolean
}> = [
  { key: 'wheel-bases', label: 'Wheel Base', icon: '🎮', required: true, multiple: false },
  { key: 'pedals', label: 'Pedals', icon: '🦶', required: true, multiple: false },
  { key: 'rigs', label: 'Rig / Cockpit', icon: '🏗️', required: true, multiple: false },
  { key: 'steering-wheels', label: 'Steering Wheel', icon: '🎡', required: true, multiple: false },
  { key: 'monitors', label: 'Monitor', icon: '🖥️', required: false, multiple: false },
  { key: 'vr-headsets', label: 'VR Headset', icon: '🥽', required: false, multiple: false },
  { key: 'pcs', label: 'PC', icon: '💻', required: false, multiple: false },
  { key: 'accessories', label: 'Accessories', icon: '🔧', required: false, multiple: true },
]
