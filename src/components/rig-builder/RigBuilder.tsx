'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import EmailCapture from '@/components/EmailCapture'
import BuildSummary from './BuildSummary'
import CategorySlot from './CategorySlot'
import PresetCards from './PresetCards'
import ProductPicker from './ProductPicker'
import type { BuildState, RigPresetRow, RigProduct, SimBrandRow } from './types'
import { BUILDER_SLOTS, OPTIONAL_KEYS, REQUIRED_KEYS } from './types'
import { productListFromBuild, sumBuildPrice } from './utils'

const optionalKeySet = new Set<string>(OPTIONAL_KEYS)

function emptyBuild(): BuildState {
  return {
    'wheel-bases': null,
    pedals: null,
    rigs: null,
    'steering-wheels': null,
    monitors: null,
    'vr-headsets': null,
    pcs: null,
    accessories: [],
  }
}

function applyIdsToBuild(
  ids: string[],
  productById: Record<string, RigProduct>
): { build: BuildState; visible: Set<string> } {
  const build = emptyBuild()
  const visible = new Set<string>()
  const seen = new Set<string>()

  for (const raw of ids) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    const p = productById[id]
    if (!p) continue
    seen.add(id)
    const k = p.builderCategory
    if (k === 'accessories') {
      const cur = (build.accessories as RigProduct[]) ?? []
      build.accessories = [...cur, p]
      visible.add('accessories')
    } else {
      ;(build as Record<string, RigProduct | RigProduct[] | null>)[k] = p
      if (optionalKeySet.has(k)) visible.add(k)
    }
  }
  return { build, visible }
}

function brandNorm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase()
}

function compatMessages(build: BuildState): { type: 'warning' | 'info'; text: string }[] {
  const wb = build['wheel-bases'] as RigProduct | null
  const sw = build['steering-wheels'] as RigProduct | null
  const ped = build.pedals as RigProduct | null
  const out: { type: 'warning' | 'info'; text: string }[] = []

  const wbBrand = brandNorm(wb?.brand)
  const wbName = brandNorm(wb?.name)
  const swBrand = brandNorm(sw?.brand)
  const swName = brandNorm(sw?.name)

  if (
    (wbBrand.includes('simucube') || wbName.includes('simucube')) &&
    (swBrand.includes('fanatec') || swName.includes('fanatec'))
  ) {
    out.push({
      type: 'warning',
      text: '⚠️ Simucube wheel bases use a different quick release to many Fanatec wheels. Check compatibility before buying.',
    })
  }
  if (
    (wbBrand.includes('fanatec') || wbName.includes('fanatec')) &&
    (swBrand.includes('simucube') || swName.includes('simucube'))
  ) {
    out.push({
      type: 'warning',
      text: '⚠️ Fanatec bases and Simucube wheels may need an adapter or QR swap — verify fitment.',
    })
  }

  if (wb && !ped) {
    out.push({ type: 'info', text: "Don't forget pedals — they're required to drive." })
  }

  const total = sumBuildPrice(build)
  if (total >= 5000) {
    out.push({
      type: 'info',
      text: '💰 Pro-level budget — double-check our reviews for the best-in-class picks.',
    })
  }

  if (total > 0 && total < 800 && productListFromBuild(build).length >= 3) {
    out.push({
      type: 'info',
      text: '🟢 Lean build — great for getting on track; upgrade wheel base or pedals first when you outgrow them.',
    })
  }

  const rig = build.rigs as RigProduct | null
  if (rig && brandNorm(rig.name).includes('8020') && wb && (wbBrand.includes('direct') || wbName.includes('dd '))) {
    out.push({
      type: 'info',
      text: '🔧 Rigid aluminium rigs handle direct-drive torque best — ensure mounting holes line up.',
    })
  }

  return out
}

type Props = {
  productsByCategory: Record<string, RigProduct[]>
  productById: Record<string, RigProduct>
  presets: RigPresetRow[]
  brands: SimBrandRow[]
  productCount: number
  brandCount: number
}

export default function RigBuilder({ productsByCategory, productById, presets, brands, productCount, brandCount }: Props) {
  const searchParams = useSearchParams()
  const [build, setBuild] = useState<BuildState>(emptyBuild)
  const [visibleOptional, setVisibleOptional] = useState<Set<string>>(() => new Set())
  const [pickerKey, setPickerKey] = useState<string | null>(null)

  const brandWebsiteByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of brands) {
      if (b.name && b.website_url) m.set(b.name.toLowerCase(), b.website_url)
    }
    return m
  }, [brands])

  const applyFromIds = useCallback(
    (ids: string[]) => {
      const { build: next, visible } = applyIdsToBuild(ids, productById)
      setBuild(next)
      setVisibleOptional(visible)
    },
    [productById]
  )

  useEffect(() => {
    const raw = searchParams.get('b')
    if (!raw?.trim()) return
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) return
    applyFromIds(ids)
  }, [searchParams, applyFromIds])

  const openPicker = (key: string) => setPickerKey(key)
  const closePicker = () => setPickerKey(null)

  const addAccessory = (p: RigProduct) => {
    setBuild((prev) => {
      const cur = [...((prev.accessories as RigProduct[]) ?? [])]
      if (cur.some((x) => x.id === p.id)) return prev
      return { ...prev, accessories: [...cur, p] }
    })
  }

  const removeAccessory = (id: string) => {
    setBuild((prev) => ({
      ...prev,
      accessories: ((prev.accessories as RigProduct[]) ?? []).filter((x) => x.id !== id),
    }))
  }

  const clearSlot = (key: string) => {
    if (key === 'accessories') {
      setBuild((prev) => ({ ...prev, accessories: [] }))
      return
    }
    setBuild((prev) => ({ ...prev, [key]: null }))
  }

  const handlePickerSelect = (key: string, p: RigProduct) => {
    if (key === 'accessories') {
      addAccessory(p)
      return
    }
    setBuild((prev) => ({ ...prev, [key]: p }))
  }

  const showOptionalButton = (key: string) => (
    <button
      type="button"
      key={`add-${key}`}
      onClick={() => setVisibleOptional((prev) => new Set(prev).add(key))}
      className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg3)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      + Add {BUILDER_SLOTS.find((s) => s.key === key)?.label ?? key}
    </button>
  )

  const notes = compatMessages(build)

  const pickerProducts = pickerKey ? productsByCategory[pickerKey] ?? [] : []
  const pickerTitle = pickerKey ? `Pick ${BUILDER_SLOTS.find((s) => s.key === pickerKey)?.label ?? pickerKey}` : ''

  return (
    <main className="min-h-screen bg-[var(--bg)] pb-28 text-[var(--text)] lg:pb-12">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_8%,transparent)] to-transparent px-6 py-12 text-center md:py-16">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Configurator</p>
        <h1 className="hero-title mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[var(--text)]">
          Sim Racing Rig Builder
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--muted)]">
          Build your dream sim racing setup. Pick components, see prices, buy with one click.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">
          {productCount} products from {brandCount} brands — wheel bases, pedals, rigs, wheels, monitors, and more.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
          Quick <span className="text-[var(--accent)]">starts</span>
        </h2>
        <PresetCards presets={presets} productById={productById} onApplyPreset={applyFromIds} />

        <h2 className="mb-4 mt-12 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
          Your <span className="text-[var(--accent)]">rig</span>
        </h2>

        <div className="lg:grid lg:grid-cols-5 lg:gap-10 lg:items-start">
          <div className="lg:col-span-3 space-y-6">
            {BUILDER_SLOTS.filter((s) => s.required).map((slot) => (
              <CategorySlot
                key={slot.key}
                slot={slot}
                value={build[slot.key] as RigProduct | RigProduct[] | null}
                onChoose={() => openPicker(slot.key)}
                onChange={() => openPicker(slot.key)}
                onClear={() => clearSlot(slot.key)}
                onRemoveAccessory={slot.multiple ? removeAccessory : undefined}
                onAddAnother={slot.multiple ? () => openPicker(slot.key) : undefined}
              />
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              {OPTIONAL_KEYS.filter((k) => !visibleOptional.has(k)).map((k) => showOptionalButton(k))}
            </div>

            {BUILDER_SLOTS.filter((s) => !s.required && visibleOptional.has(s.key)).map((slot) => (
              <CategorySlot
                key={slot.key}
                slot={slot}
                value={build[slot.key] as RigProduct | RigProduct[] | null}
                onChoose={() => openPicker(slot.key)}
                onChange={() => openPicker(slot.key)}
                onClear={() => {
                  clearSlot(slot.key)
                  setVisibleOptional((prev) => {
                    const n = new Set(prev)
                    n.delete(slot.key)
                    return n
                  })
                }}
                onRemoveAccessory={slot.multiple ? removeAccessory : undefined}
                onAddAnother={slot.multiple ? () => openPicker(slot.key) : undefined}
              />
            ))}

            {notes.length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Compatibility & tips
                </h3>
                {notes.map((n) => (
                  <p
                    key={n.text}
                    className={n.type === 'warning' ? 'text-sm text-[var(--gold)]' : 'text-sm text-[var(--muted)]'}
                  >
                    {n.text}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="pt-6">
              <EmailCapture source="rig-builder" />
            </div>

            <section className="border-t border-[var(--border)] pt-8 space-y-2 text-sm">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Related</p>
              <Link href="/sim-racing/reviews" className="block text-[var(--accent)] hover:underline">
                Read our hardware reviews →
              </Link>
              <Link href="/sim-racing/products" className="block text-[var(--accent)] hover:underline">
                Browse all {productCount} products →
              </Link>
              <Link href="/sim-racing/setups" className="block text-[var(--accent)] hover:underline">
                Download car setups →
              </Link>
            </section>
          </div>

          <div className="mt-10 lg:col-span-2 lg:mt-0">
            <BuildSummary build={build} brandWebsiteByName={brandWebsiteByName} />
          </div>
        </div>
      </div>

      <ProductPicker
        open={pickerKey != null}
        title={pickerTitle}
        products={pickerProducts}
        onClose={closePicker}
        onSelect={(p) => pickerKey && handlePickerSelect(pickerKey, p)}
      />
    </main>
  )
}
