'use client'

import { useEffect, useState } from 'react'

type ShareRowProps = {
  title: string
  excerpt: string | null
  url: string
}

export default function ShareRow({ title, excerpt, url }: ShareRowProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const shareOnX = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const emailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
    `${excerpt ?? ''}\n\n${url}`
  )}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const buttonClass =
    'inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)] transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={shareOnX} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        <XIcon />
        <span className="hidden sm:inline">Share on X</span>
        <span className="sm:hidden">X</span>
      </a>
      <button type="button" onClick={copyLink} className={buttonClass}>
        <LinkIcon />
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
        <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <a href={emailHref} className={buttonClass}>
        <MailIcon />
        <span className="hidden sm:inline">Email this</span>
        <span className="sm:hidden">Email</span>
      </a>
      {copied ? <span className="text-xs text-[var(--green)]">Link copied.</span> : null}
    </div>
  )
}

function XIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M18.901 1.154h3.68l-8.04 9.188 9.458 12.504h-7.406l-5.8-7.584-6.636 7.584H.477l8.6-9.827L0 1.154h7.594l5.242 6.932 6.065-6.932Zm-1.29 19.49h2.04L6.486 3.24H4.298z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.2 4.73"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.62-1.62"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m22 7-10 7L2 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
