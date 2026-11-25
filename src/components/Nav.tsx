'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

const main = [
  { label: 'This weekend', href: '/' },
  { label: 'Results', href: '/races' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Teams', href: '/teams' },
  { label: 'Compare', href: '/compare' },
  { label: 'Sim challenge', href: '/sim' },
]
const more = [
  { label: 'Seasons', href: '/seasons' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Records', href: '/leaderboards' },
]

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`))

export default function Nav() {
  const pathname = usePathname() ?? '/'
  // The menu stays open only on the page it was opened on, so following a link closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenOn(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="pb-header">
      <div className="pb-header-in">
        <Link href="/" className="pb-logo" aria-label="F1Rec home"><b>F1</b><i>REC</i></Link>
        <nav className="pb-nav" aria-label="Main">
          {main.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="pb-header-right">
          <Link href="/drivers" className="pb-search">Search drivers, races, seasons</Link>
          <ThemeToggle />
          <button type="button" className="pb-menu-btn" aria-expanded={open} aria-controls="pb-menu" onClick={() => setOpen(!open)}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      {open && (
        <div id="pb-menu" className="pb-menu">
          {[...main, ...more].map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? 'page' : undefined}>{l.label}</Link>
          ))}
          <div className="pb-menu-theme"><span>Theme</span><ThemeToggle /></div>
        </div>
      )}
    </header>
  )
}
