'use client'

import { useEffect, useMemo, useState } from 'react'

export function CountdownTimer({ raceDate }: { raceDate: string }) {
  const target = useMemo(() => new Date(raceDate).getTime(), [raceDate])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (diff === 0) return null

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[var(--gold)]">Lights Out In</div>
      <div className="mt-1 flex items-baseline gap-2 font-display">
        <span className="text-3xl font-bold text-[var(--text)]">{days}d</span>
        <span className="text-2xl font-semibold text-[var(--muted)]">{hours}h</span>
        <span className="text-xl text-[var(--muted)]">{minutes}m</span>
      </div>
    </div>
  )
}
