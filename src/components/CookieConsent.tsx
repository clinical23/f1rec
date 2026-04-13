'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const STORAGE_KEY = 'cookie_consent'

function consentGranted() {
  if (typeof window === 'undefined') return
  window.gtag?.('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  })
}

function consentDenied() {
  if (typeof window === 'undefined') return
  window.gtag?.('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'accepted') {
        consentGranted()
        setShowBanner(false)
        return
      }
      if (stored === 'rejected') {
        consentDenied()
        setShowBanner(false)
        return
      }
      setShowBanner(true)
    } catch {
      setShowBanner(true)
    }
  }, [])

  useEffect(() => {
    if (!showBanner) return
    const id = requestAnimationFrame(() => setAnimateIn(true))
    return () => cancelAnimationFrame(id)
  }, [showBanner])

  const acceptAll = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted')
    } catch {
      /* ignore */
    }
    consentGranted()
    setShowBanner(false)
  }, [])

  const essentialOnly = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'rejected')
    } catch {
      /* ignore */
    }
    consentDenied()
    setShowBanner(false)
  }, [])

  if (!mounted || !showBanner) return null

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--bg2)]/95 backdrop-blur-sm transition-transform duration-300 ease-out ${
        animateIn ? 'translate-y-0' : 'translate-y-full'
      }`}
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="mx-auto max-w-4xl px-4 py-4 md:flex md:items-center md:justify-between md:gap-6 md:py-5">
        <p className="text-sm leading-relaxed text-[var(--text)] md:flex-1">
          We use cookies to analyse site traffic and improve your experience. See our{' '}
          <Link
            href="/privacy"
            className="font-semibold text-[var(--accent)] underline decoration-transparent hover:decoration-current"
          >
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:mt-0 md:w-auto md:shrink-0">
          <button
            type="button"
            onClick={essentialOnly}
            className="w-full rounded border border-[var(--border)] bg-transparent px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-[var(--muted)] transition-colors hover:border-[var(--muted)] hover:text-[var(--text)] sm:w-auto"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="w-full rounded border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
