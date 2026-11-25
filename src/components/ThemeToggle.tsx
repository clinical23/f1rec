'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'night' | 'day'

const read = (): Theme => (document.documentElement.dataset.theme === 'day' ? 'day' : 'night')
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => mo.disconnect()
}

/** Night / Day switch. The choice is kept in localStorage 'f1rec-theme'; the inline script in the layout applies it
 *  before the page paints, so there's no flash. Every toggle on the page follows <html data-theme>. */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => 'night' as Theme)
  const pick = (t: Theme) => {
    if (t === 'day') document.documentElement.dataset.theme = 'day'
    else delete document.documentElement.dataset.theme
    try { localStorage.setItem('f1rec-theme', t) } catch {}
  }
  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      <button type="button" aria-pressed={theme === 'night'} onClick={() => pick('night')}>Night</button>
      <button type="button" aria-pressed={theme === 'day'} onClick={() => pick('day')}>Day</button>
    </div>
  )
}
