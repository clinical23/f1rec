import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — F1Rec',
  description: 'How F1Rec collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-12 text-[var(--text)] md:py-16">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-black tracking-tight text-[var(--text)] md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Last updated: April 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-[var(--text)]">
          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Who we are
            </h2>
            <p className="text-[var(--text)]">
              F1Rec is a Formula 1 statistics and sim racing platform operated from the United Kingdom.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-[var(--muted)]">
              <li>
                Website:{' '}
                <a
                  href="https://f1rec.com"
                  className="text-[var(--accent)] underline decoration-transparent transition-colors hover:decoration-current"
                >
                  https://f1rec.com
                </a>
              </li>
              <li>
                Contact:{' '}
                <a
                  href="mailto:admin@clinicalrx.co.uk"
                  className="text-[var(--accent)] underline decoration-transparent transition-colors hover:decoration-current"
                >
                  admin@clinicalrx.co.uk
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              What data we collect
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
              <li>
                <span className="text-[var(--text)]">Analytics</span> — via Google Analytics 4: anonymised IP, pages
                visited, session duration, device and browser info, country-level location. GA4 does not collect
                personally identifiable information by default.
              </li>
              <li>
                <span className="text-[var(--text)]">Email address</span> — only if you voluntarily submit it through a
                newsletter signup form.
              </li>
              <li>
                We do <span className="text-[var(--text)]">not</span> offer account registration on this site. No
                passwords. No payment data is collected here.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Cookies we use
            </h2>
            <p className="mb-4 text-[var(--muted)]">
              Below is a summary of cookies we use today. Types follow common industry labelling (necessary vs
              analytics).
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[var(--bg2)]">
                    <th className="border-b border-[var(--border)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                      Cookie
                    </th>
                    <th className="border-b border-[var(--border)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                      Provider
                    </th>
                    <th className="border-b border-[var(--border)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                      Purpose
                    </th>
                    <th className="border-b border-[var(--border)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                      Duration
                    </th>
                    <th className="border-b border-[var(--border)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text)]">_ga</td>
                    <td className="px-3 py-2">Google Analytics</td>
                    <td className="px-3 py-2">Distinguishes unique users</td>
                    <td className="px-3 py-2">2 years</td>
                    <td className="px-3 py-2">Analytics</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text)]">_ga_*</td>
                    <td className="px-3 py-2">Google Analytics</td>
                    <td className="px-3 py-2">Stores session state</td>
                    <td className="px-3 py-2">2 years</td>
                    <td className="px-3 py-2">Analytics</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text)]">cookie_consent</td>
                    <td className="px-3 py-2">F1Rec</td>
                    <td className="px-3 py-2">Remembers your cookie preference (stored in localStorage on your device)</td>
                    <td className="px-3 py-2">1 year</td>
                    <td className="px-3 py-2">Necessary</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">
              <span className="text-[var(--text)]">Note:</span> When Google AdSense is enabled, Google may set additional
              advertising cookies. We will list those here when ads are live.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              How we use your data
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
              <li>To see which pages and features people use (Analytics).</li>
              <li>To improve the site based on real usage patterns.</li>
              <li>To send newsletters if you opted in — email only, for that purpose.</li>
              <li className="text-[var(--text)]">We do not sell your data to third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Third-party services
            </h2>
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <span className="text-[var(--text)]">Google Analytics 4</span> —{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <span className="text-[var(--text)]">Google AdSense</span> (coming soon) —{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <span className="text-[var(--text)]">Vercel</span> (hosting) —{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
                >
                  Vercel Privacy Policy
                </a>
              </li>
              <li>
                <span className="text-[var(--text)]">Supabase</span> (database) —{' '}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
                >
                  Supabase Privacy Policy
                </a>
              </li>
              <li>
                <span className="text-[var(--text)]">ConvertKit</span> (email, when connected) —{' '}
                <a
                  href="https://convertkit.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
                >
                  ConvertKit Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Your rights (UK GDPR / EU GDPR)
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
              <li>Right to access your data</li>
              <li>Right to rectification</li>
              <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent at any time — use the cookie banner or email us</li>
            </ul>
            <p className="mt-4 text-[var(--muted)]">
              To exercise any of these rights, contact{' '}
              <a
                href="mailto:admin@clinicalrx.co.uk"
                className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
              >
                admin@clinicalrx.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Data retention
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
              <li>
                <span className="text-[var(--text)]">Analytics:</span> retained by Google under their retention settings
                (GA4 often defaults to 14 months).
              </li>
              <li>
                <span className="text-[var(--text)]">Email addresses:</span> kept until you unsubscribe from the list.
              </li>
              <li>
                <span className="text-[var(--text)]">Cookie consent preference:</span> we remember your choice for 1 year
                (localStorage).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Children&apos;s privacy
            </h2>
            <p className="text-[var(--muted)]">
              F1Rec is not aimed at children under 13. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide text-[var(--text)]">
              Changes to this policy
            </h2>
            <p className="text-[var(--muted)]">
              We may update this page occasionally. The &quot;Last updated&quot; date at the top will change when we do.
            </p>
          </section>

          <p className="border-t border-[var(--border)] pt-8 text-sm text-[var(--muted)]">
            Questions?{' '}
            <Link href="/" className="text-[var(--accent)] underline decoration-transparent hover:decoration-current">
              Back to home
            </Link>
            {' · '}
            <Link
              href="mailto:admin@clinicalrx.co.uk"
              className="text-[var(--accent)] underline decoration-transparent hover:decoration-current"
            >
              admin@clinicalrx.co.uk
            </Link>
          </p>
        </div>
      </article>
    </main>
  )
}
