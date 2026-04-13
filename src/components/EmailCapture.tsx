'use client'

import { useState, useTransition } from 'react'
import { subscribeAction } from '@/app/actions/subscribe'

type Props = {
  source?: string
}

export default function EmailCapture({ source = 'community' }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'success' | 'already' | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', email)
      fd.set('source', source)
      const result = await subscribeAction(fd)

      if (result.success) {
        if (result.message === "You're already on the list!") {
          setDone('already')
        } else {
          setDone('success')
        }
        return
      }

      setError(result.message)
    })
  }

  if (done === 'success') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <p className="flex items-center gap-2 text-[var(--green)]">
          <span className="text-xl" aria-hidden>
            ✓
          </span>
          <span className="font-semibold">You&apos;re in! We&apos;ll keep you posted.</span>
        </p>
      </div>
    )
  }

  if (done === 'already') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <p className="flex items-center gap-2 text-[var(--green)]">
          <span className="text-xl" aria-hidden>
            ✓
          </span>
          <span className="font-semibold">You&apos;re already on the list!</span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
      <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-[var(--text)] md:text-2xl">
        Stay in the loop
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Race results, driver stats, sim racing deals — no spam, unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor={`email-capture-${source}`}>
            Email address
          </label>
          <input
            id={`email-capture-${source}`}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            required
            disabled={isPending}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto w-full"
          >
            {isPending ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </form>
    </div>
  )
}
