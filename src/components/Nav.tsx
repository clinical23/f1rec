'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSound } from '@/components/SoundProvider'

const navLinks = [
  { label: 'Home', href: '/', sound: 'home' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Teams', href: '/teams' },
  { label: 'Races', href: '/races' },
  { label: 'Seasons', href: '/seasons' },
  { label: 'Compare', href: '/compare' },
  { label: 'Leaderboards', href: '/leaderboards' },
  { label: 'Community', href: '/community' },
  { label: 'Paddock', href: '/paddock' },
  { label: 'Sim Racing', href: '/sim-racing' },
  { label: 'Resources', href: '/sim-racing/resources' },
  { label: 'Memes', href: '/memes', sound: 'memes' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { soundEnabled, toggleSound, playSound } = useSound()

  const soundFor = (href: string) => {
    if (href === '/') return 'home'
    if (href === '/drivers') return 'drivers'
    if (href === '/teams') return 'teams'
    if (href === '/races') return 'races'
    if (href === '/seasons') return 'seasons'
    if (href === '/compare') return 'compare'
    if (href === '/leaderboards') return 'leaderboards'
    if (href === '/community') return 'community'
    if (href === '/paddock') return 'community'
    if (href === '/sim-racing') return 'sim-racing'
    if (href === '/sim-racing/resources') return 'sim-racing'
    if (href === '/memes') return 'memes'
    return 'click'
  }

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close menu on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <>
      <style>{`
        .nav-links { display: flex; gap: 24px; align-items: center; }
        .nav-hamburger { display: none; }
        .nav-mobile-overlay { display: none; }
        @media (max-width: 1023px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-overlay { display: block !important; }
        }
      `}</style>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '48px',
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '18px',
          color: 'var(--text)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px',
        }} onClick={() => playSound('home')}>
          F1<span style={{ color: 'var(--accent)' }}>Rec</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px',
              color: pathname === link.href ? 'var(--text)' : link.href === '/sim-racing' ? 'var(--accent)' : 'var(--muted)',
              textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1.5px', transition: 'color 0.2s',
            }} onClick={() => playSound(soundFor(link.href))}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleSound}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Hamburger button */}
        <button className="nav-hamburger" onClick={() => { playSound('click'); setOpen(o => !o) }}
          aria-label="Toggle menu"
          style={{
            display: 'none', flexDirection: 'column', gap: '4px', background: 'none',
            border: 'none', cursor: 'pointer', padding: '6px',
          }}>
          <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '1px', transition: 'transform 0.2s, opacity 0.2s', transform: open ? 'rotate(45deg) translate(3px, 3px)' : 'none' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '1px', transition: 'opacity 0.2s', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '1px', transition: 'transform 0.2s, opacity 0.2s', transform: open ? 'rotate(-45deg) translate(3px, -3px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="nav-mobile-overlay" onClick={() => setOpen(false)}
            style={{ display: 'none', position: 'fixed', inset: 0, top: '48px', background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
          {/* Menu panel */}
          <div ref={menuRef} className="nav-mobile-overlay"
            style={{
              display: 'none', position: 'fixed', top: '48px', right: 0, bottom: 0, width: '260px',
              background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 100,
              padding: '1.5rem 0', overflowY: 'auto',
              animation: 'slideIn 0.2s ease',
            }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                style={{
                  display: 'block', padding: '0.85rem 1.5rem',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                  color: pathname === link.href ? 'var(--accent)' : 'var(--text)',
                  textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1.5px',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseDown={() => playSound(soundFor(link.href))}>
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={toggleSound}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.85rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--muted)',
                textAlign: 'left',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                cursor: 'pointer',
                }}>
              Sound {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
