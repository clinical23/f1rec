import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

export type Crumb = { label: string; href?: string }
export type Stat = { value: ReactNode; label: string; sig?: boolean }

/** The head band every inner page shares: where you are, the title, one line, and up to four plates. */
export default function PageHead({
  title,
  small,
  lede,
  crumbs,
  stats,
  teamColor,
}: {
  title: ReactNode
  small?: ReactNode
  lede?: ReactNode
  crumbs?: Crumb[]
  stats?: Stat[]
  teamColor?: string | null
}) {
  const style = teamColor ? ({ '--tc': teamColor } as CSSProperties) : undefined
  return (
    <header className="pg-head">
      <div className="pg-head-in">
        <div>
          {crumbs && crumbs.length > 0 && (
            <nav className="pg-crumbs" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} style={{ display: 'contents' }}>
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="pg-title" style={style}>
            {teamColor && <span className="tc" aria-hidden="true" />}
            <span>{title}</span>
            {small && <small>{small}</small>}
          </h1>
          {lede && <p className="pg-lede">{lede}</p>}
        </div>
        {stats && stats.length > 0 && (
          <div className="pg-stats">
            {stats.map((s) => (
              <div key={s.label} className={`pg-stat${s.sig ? ' sig' : ''}`}>
                <b>{s.value}</b>
                <small>{s.label}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
