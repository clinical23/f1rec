import type { CircuitShape } from '@/lib/weekend'

/** The circuit outline (bacinger/f1-circuits, MIT) with a glowing racing line and the start/finish marked. */
export default function TrackMap({ shape, label }: { shape: CircuitShape; label: string }) {
  const nums = shape.d.slice(1).split(' L').map((p) => p.split(' ').map(Number))
  const [sx, sy] = nums[0]
  const [nx, ny] = nums[Math.min(3, nums.length - 1)]
  const ang = (Math.atan2(ny - sy, nx - sx) * 180) / Math.PI + 90
  return (
    <svg className="pb-track" viewBox="0 0 600 460" role="img" aria-label={label}>
      <defs>
        <filter id="pb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={shape.d} fill="none" className="pb-track-bed" strokeWidth="18" strokeLinejoin="round" />
      <path d={shape.d} fill="none" style={{ stroke: 'var(--sig)' }} strokeWidth="5" strokeLinejoin="round" filter="url(#pb-glow)" />
      <g transform={`translate(${sx} ${sy}) rotate(${ang.toFixed(0)})`}>
        <rect x="-14" y="-3" width="28" height="6" fill="#F2F2EC" />
        <rect x="-14" y="-3" width="7" height="3" fill="#0B0C0E" />
        <rect x="0" y="-3" width="7" height="3" fill="#0B0C0E" />
        <rect x="-7" y="0" width="7" height="3" fill="#0B0C0E" />
        <rect x="7" y="0" width="7" height="3" fill="#0B0C0E" />
      </g>
    </svg>
  )
}
