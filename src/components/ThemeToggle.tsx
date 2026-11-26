'use client'

import { useId, useSyncExternalStore } from 'react'

/** The looks a reader can pick. 'night' is the default and sets no attribute. Keep in step with the script in layout.tsx. */
export const THEMES = [
  { id: 'night', label: 'Night' },
  { id: 'day', label: 'Day' },
  { id: 'timing', label: 'Timing screen' },
  { id: 'tower', label: 'Timing tower' },
  { id: 'ghost', label: 'Ghost car' },
] as const
type Theme = (typeof THEMES)[number]['id']
const IDS = THEMES.map((t) => t.id) as readonly string[]

/** Colours that can replace a theme's own signal colour. Keep in step with globals.css and layout.tsx. */
export const ACCENTS = [
  { id: 'yellow', label: 'Yellow', c: '#FFD200' },
  { id: 'purple', label: 'Purple', c: '#B98CFF' },
  { id: 'orange', label: 'Orange', c: '#FF7A2E' },
  { id: 'blue', label: 'Blue', c: '#6EC8FF' },
  { id: 'green', label: 'Green', c: '#3EE08F' },
] as const

const readAccent = () => document.documentElement.dataset.accent ?? ''

const read = (): Theme => {
  const t = document.documentElement.dataset.theme
  return (t && IDS.includes(t) ? t : 'night') as Theme
}
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] })
  return () => mo.disconnect()
}

function setAccent(next: string) {
  const root = document.documentElement
  if (next) root.dataset.accent = next
  else delete root.dataset.accent
  try { localStorage.setItem('f1rec-accent', next) } catch {}
}

/** Theme picker. The choice is kept in localStorage 'f1rec-theme'; the inline script in the layout applies it before
 *  the page paints, so there's no flash. Every picker on the page follows <html data-theme>. */
export default function ThemeToggle() {
  const id = useId()
  const theme = useSyncExternalStore(subscribe, read, () => 'night' as Theme)
  const accent = useSyncExternalStore(subscribe, readAccent, () => '')
  // Picking the colour that's already on clears it, back to the theme's own colour.
  const pickAccent = (a: string) => setAccent(a === accent ? '' : a)
  const pick = (t: Theme) => {
    if (t === 'night') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    try { localStorage.setItem('f1rec-theme', t) } catch {}
  }
  return (
    <div className="theme-pick">
      <label htmlFor={id}>Theme</label>
      <select id={id} value={theme} onChange={(e) => pick(e.target.value as Theme)}>
        {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <div className="accent-pick" role="group" aria-label="Colour">
        {ACCENTS.map((a) => (
          <button key={a.id} type="button" aria-label={a.label} title={a.label} aria-pressed={accent === a.id}
            style={{ ['--c' as string]: a.c }} onClick={() => pickAccent(a.id)} />
        ))}
      </div>
    </div>
  )
}
