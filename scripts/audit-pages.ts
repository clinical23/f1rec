/**
 * F1Rec page render audit — fetches live HTML and flags common breakage patterns.
 *
 * Run: npx tsx scripts/audit-pages.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SITE_URL = process.env.AUDIT_SITE_URL ?? 'https://f1rec.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const CONCURRENCY = 5
const BATCH_DELAY_MS = 100
const FETCH_TIMEOUT_MS = 15_000
const DETAIL_SHORT_THRESHOLD = 500

type PageTarget = {
  path: string
  kind: 'static' | 'driver' | 'team' | 'season' | 'blog'
  expectText?: string
  expectYear?: number
}

type AuditResult = {
  path: string
  url: string
  status: number
  issues: string[]
  severity: 'pass' | 'warning' | 'error'
}

function isDetailPath(path: string): boolean {
  return (
    /^\/drivers\/[^/]+$/.test(path) ||
    /^\/teams\/[^/]+$/.test(path) ||
    /^\/seasons\/[^/]+$/.test(path) ||
    /^\/blog\/[^/]+$/.test(path)
  )
}

function checkSuspiciousErrors(html: string): string[] {
  const issues: string[] = []
  if (/class=["'][^"']*\berror\b[^"']*["']/i.test(html)) issues.push('suspicious: class contains "error"')
  if (/Something went wrong/i.test(html)) issues.push('suspicious: "Something went wrong"')
  if (/\bApplication error\b/i.test(html)) issues.push('suspicious: Application error')
  if (/next-error|__NEXT_ERROR__/i.test(html)) issues.push('suspicious: Next.js error UI marker')
  return issues
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m ? m[1].trim() : null
}

function extractOgTitle(html: string): string | null {
  const m =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)
  return m ? m[1].trim() : null
}

function hasJsonLd(html: string): boolean {
  return /type=["']application\/ld\+json["']/i.test(html) || /application\/ld\+json/i.test(html)
}

async function getAllTargets(): Promise<PageTarget[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const targets: PageTarget[] = [
    { path: '/', kind: 'static' },
    { path: '/drivers', kind: 'static' },
    { path: '/teams', kind: 'static' },
    { path: '/races', kind: 'static' },
    { path: '/seasons', kind: 'static' },
    { path: '/compare', kind: 'static' },
    { path: '/leaderboards', kind: 'static' },
    { path: '/blog', kind: 'static' },
    { path: '/community', kind: 'static' },
    { path: '/sim-racing', kind: 'static' },
    { path: '/sim-racing/products', kind: 'static' },
    { path: '/sim-racing/reviews', kind: 'static' },
    { path: '/sim-racing/setups', kind: 'static' },
    { path: '/sim-racing/rig-builder', kind: 'static' },
    { path: '/memes', kind: 'static' },
    { path: '/privacy', kind: 'static' },
  ]

  const [{ data: drivers }, { data: teams }, { data: seasons }, { data: posts }] = await Promise.all([
    supabase.from('drivers').select('slug, full_name, first_name, last_name').not('slug', 'is', null),
    supabase.from('teams').select('slug, name').not('slug', 'is', null),
    supabase.from('seasons').select('year, slug').not('slug', 'is', null),
    supabase.from('posts').select('slug').eq('is_published', true).not('slug', 'is', null),
  ])

  for (const d of drivers ?? []) {
    const slug = d.slug as string
    const name =
      (d.full_name as string | null)?.trim() ||
      `${(d.first_name as string) ?? ''} ${(d.last_name as string) ?? ''}`.trim()
    targets.push({ path: `/drivers/${slug}`, kind: 'driver', expectText: name || undefined })
  }
  for (const t of teams ?? []) {
    targets.push({
      path: `/teams/${t.slug as string}`,
      kind: 'team',
      expectText: (t.name as string)?.trim() || undefined,
    })
  }
  for (const s of seasons ?? []) {
    const slug = s.slug as string
    const year = typeof s.year === 'number' ? s.year : Number(s.year)
    targets.push({
      path: `/seasons/${slug}`,
      kind: 'season',
      expectYear: Number.isFinite(year) ? year : undefined,
    })
  }
  for (const p of posts ?? []) {
    targets.push({ path: `/blog/${p.slug as string}`, kind: 'blog' })
  }

  return targets
}

async function auditOne(target: PageTarget): Promise<AuditResult> {
  const url = `${SITE_URL.replace(/\/$/, '')}${target.path}`
  const errors: string[] = []
  const warnings: string[] = []
  let status = 0
  let html = ''

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'F1RecAudit/1.0 (+https://f1rec.com)' },
      redirect: 'follow',
    })
    clearTimeout(t)
    status = res.status
    if (status !== 200) {
      errors.push(`HTTP ${status} ${res.statusText || ''}`.trim())
    }
    html = await res.text()
  } catch (e) {
    errors.push(`Fetch failed: ${e instanceof Error ? e.message : String(e)}`)
    const issues = errors
    return { path: target.path, url, status: status || 0, issues, severity: 'error' }
  }

  if (html.includes('Loading...') || html.includes('Loading…')) {
    errors.push('Body contains persistent "Loading..." text')
  }
  if (/\bundefined\b/.test(html)) {
    errors.push('Body contains "undefined"')
  }
  if (/\bNaN\b/.test(html)) {
    errors.push('Body contains "NaN"')
  }
  for (const w of checkSuspiciousErrors(html)) {
    warnings.push(w)
  }

  if (isDetailPath(target.path) && html.length < DETAIL_SHORT_THRESHOLD) {
    warnings.push(`Body very short (${html.length} chars) for detail page`)
  }

  if (target.kind === 'driver' && target.expectText && target.expectText.length >= 2) {
    if (!html.includes(target.expectText)) {
      errors.push(`Expected driver name not found in body: "${target.expectText.slice(0, 80)}"`)
    }
  }
  if (target.kind === 'team' && target.expectText && target.expectText.length >= 2) {
    if (!html.includes(target.expectText)) {
      errors.push(`Expected team name not found in body: "${target.expectText.slice(0, 80)}"`)
    }
  }
  if (target.kind === 'season' && target.expectYear != null) {
    const y = String(target.expectYear)
    if (!html.includes(y)) {
      errors.push(`Expected season year "${y}" not found in body`)
    }
  }

  const title = extractTitle(html)
  if (!title) {
    errors.push('Missing <title> tag')
  } else if (title.includes('undefined')) {
    errors.push('Title contains "undefined"')
  }

  const og = extractOgTitle(html)
  if (!og) {
    warnings.push('Missing og:title meta tag')
  } else if (og.includes('undefined')) {
    errors.push('og:title contains "undefined"')
  }

  if (!hasJsonLd(html)) {
    warnings.push('Missing JSON-LD script (application/ld+json)')
  }

  const severity: AuditResult['severity'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'pass'
  const issues = [...errors, ...warnings]

  return {
    path: target.path,
    url,
    status,
    issues,
    severity,
  }
}

async function runBatches(targets: PageTarget[]): Promise<AuditResult[]> {
  const results: AuditResult[] = []
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map((t) => auditOne(t)))
    results.push(...batchResults)
    if (i + CONCURRENCY < targets.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }
  return results
}

function writeReports(results: AuditResult[]) {
  const dir = resolve(process.cwd(), 'scripts')
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    /* exists */
  }

  const passed = results.filter((r) => r.severity === 'pass').length
  const warnings = results.filter((r) => r.severity === 'warning').length
  const errors = results.filter((r) => r.severity === 'error').length
  const date = new Date().toISOString()

  const jsonPath = resolve(dir, 'audit-report.json')
  writeFileSync(
    jsonPath,
    JSON.stringify({ generatedAt: date, siteUrl: SITE_URL, totals: { checked: results.length, passed, warnings, errors }, results }, null, 2),
    'utf8'
  )

  const errList = results.filter((r) => r.severity === 'error')
  const warnList = results.filter((r) => r.severity === 'warning')

  const lines: string[] = [
    `F1REC PAGE AUDIT REPORT — ${date}`,
    '================================',
    '',
    `Site: ${SITE_URL}`,
    `Total pages checked: ${results.length}`,
    `✅ Passed: ${passed}`,
    `⚠️ Warnings: ${warnings}`,
    `❌ Errors: ${errors}`,
    '',
  ]

  if (errList.length) {
    lines.push('ERRORS:')
    for (const r of errList) {
      lines.push(`  ${r.path} — ${r.issues.join('; ') || 'see JSON'}`)
    }
    lines.push('')
  }
  if (warnList.length) {
    lines.push('WARNINGS:')
    for (const r of warnList) {
      lines.push(`  ${r.path} — ${r.issues.join('; ')}`)
    }
    lines.push('')
  }

  const txtPath = resolve(dir, 'audit-report.txt')
  writeFileSync(txtPath, lines.join('\n'), 'utf8')
  console.log(`Wrote ${jsonPath}`)
  console.log(`Wrote ${txtPath}`)
}

async function main() {
  console.log('Building URL list from Supabase...')
  const targets = await getAllTargets()
  console.log(`Auditing ${targets.length} URLs (${CONCURRENCY} concurrent, ${FETCH_TIMEOUT_MS}ms timeout)...`)
  const results = await runBatches(targets)
  writeReports(results)
  const errors = results.filter((r) => r.severity === 'error').length
  process.exit(errors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
