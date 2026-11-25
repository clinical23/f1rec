'use client'

import { useEffect, useState } from 'react'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60]
}

/** Days / hours / mins / secs to lights out, as pit board plates. Blank plates until the browser's clock is read. */
export default function Countdown({ startIso }: { startIso: string }) {
  const target = Date.parse(startIso)
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [])
  if (now === null) {
    return (
      <div className="pb-count" aria-hidden="true">
        {['days', 'hours', 'mins', 'secs'].map((u) => <div key={u}><b>--</b><small>{u}</small></div>)}
      </div>
    )
  }
  const left = target - now
  if (left <= 0) {
    return (
      <div className="pb-count done">
        <div><b>Lights out</b><small>{left > -3 * 3600_000 ? 'Race under way' : 'Race finished'}</small></div>
      </div>
    )
  }
  const [d, h, m, s] = parts(left)
  const pad = (x: number) => String(x).padStart(2, '0')
  return (
    <div className="pb-count" role="timer" aria-label={`${d} days ${h} hours ${m} minutes to lights out`}>
      <div><b>{pad(d)}</b><small>days</small></div>
      <div><b>{pad(h)}</b><small>hours</small></div>
      <div><b>{pad(m)}</b><small>mins</small></div>
      <div><b>{pad(s)}</b><small>secs</small></div>
    </div>
  )
}
