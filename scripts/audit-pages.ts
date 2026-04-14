import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const DEFAULT_BASE_URL = 'https://f1rec.com'
const BASE_URL = process.env.BASE_URL ?? DEFAULT_BASE_URL ?? 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const CONCURRENCY = 10
const REQUEST_DELAY_MS = 75
const FETCH_TIMEOUT_MS = 15_000

type PageKind = 'static' | 'driver' | 'team' | 'season' | 'blog'

type PageTarget = {
  path: string
  kind: PageKind
}

type JsonLdScriptIssue = {
  path: string
  message: string
}

type AuditSummary = {
  totalUrlsChecked: number
  http200Count: number
  httpErrors: Array<{ path: string; status: number; detail: string }>
  undefinedFindings: Array<{ path: string; snippet: string }>
  nullFindings: Array<{ path: string; snippet: string }>
  missingJsonLd: Array<{ path: string; expectedType: string }>
  invalidJsonLd: JsonLdScriptIssue[]
}

const STATIC_ROUTES: PageTarget[] = [
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

function sanitizeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function stripScriptAndStyle(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

function snippetAround(text: string, index: number, radius = 80): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function findUndefinedInRenderedHtml(html: string): string | null {
  const noScript = stripScriptAndStyle(html).replace(/typeof\s+undefined/g, ' ')
  const idx = noScript.indexOf('undefined')
  return idx >= 0 ? snippetAround(noScript, idx) : null
}

function findVisibleNullText(html: string): string | null {
  const noScript = stripScriptAndStyle(html)
  const directTagMatch =
    noScript.match(/<(span|td|p|div|li|a|strong|em|small|label|button|h[1-6])\b[^>]*>\s*null\s*<\/\1>/i) ??
    noScript.match(/>\s*null\s*</i)
  if (directTagMatch?.index != null) {
    return snippetAround(noScript, directTagMatch.index)
  }

  const visibleText = stripTags(noScript)
  const idx = visibleText.indexOf('null')
  return idx >= 0 ? snippetAround(visibleText, idx) : null
}

function extractJsonLdContents(html: string): string[] {
  const matches: string[] = []
  const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match = regex.exec(html)
  while (match) {
    matches.push(match[1].trim())
    match = regex.exec(html)
  }
  return matches
}

function getExpectedJsonLdType(path: string): string | null {
  if (path === '/') return 'WebSite'
  if (/^\/drivers\/[^/]+$/.test(path)) return 'Person'
  if (/^\/teams\/[^/]+$/.test(path)) return 'SportsTeam'
  if (/^\/seasons\/[^/]+$/.test(path)) return 'WebPage'
  if (/^\/blog\/[^/]+$/.test(path)) return 'Article'
  if (path === '/sim-racing/rig-builder') return 'WebApplication'
  if (path === '/sim-racing/reviews') return 'ItemList'
  return null
}

function collectKeyFieldIssues(
  value: unknown,
  path: string,
  issues: JsonLdScriptIssue[],
  pagePath: string
): void {
  if (value == null) return

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectKeyFieldIssues(item, `${path}[${index}]`, issues, pagePath))
    return
  }

  if (typeof value !== 'object') return

  const record = value as Record<string, unknown>
  for (const [key, raw] of Object.entries(record)) {
    const fieldPath = path ? `${path}.${key}` : key
    if (key === 'name' || key === 'description' || key === 'url') {
      if (raw === null || raw === undefined) {
        issues.push({ path: pagePath, message: `JSON-LD key "${fieldPath}" is null/undefined` })
      } else if (typeof raw === 'string' && (raw.includes('null') || raw.includes('undefined'))) {
        issues.push({ path: pagePath, message: `JSON-LD key "${fieldPath}" contains "${raw}"` })
      }
    }
    collectKeyFieldIssues(raw, fieldPath, issues, pagePath)
  }
}

function jsonLdHasType(value: unknown, expectedType: string): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.some((item) => jsonLdHasType(item, expectedType))
  if (typeof value !== 'object') return false

  const record = value as Record<string, unknown>
  if (record['@type'] === expectedType) return true
  if (Array.isArray(record['@type']) && (record['@type'] as unknown[]).includes(expectedType)) return true

  return Object.values(record).some((nested) => jsonLdHasType(nested, expectedType))
}

async function getAllTargets(): Promise<PageTarget[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const [{ data: drivers, error: driversError }, { data: teams, error: teamsError }, { data: seasons, error: seasonsError }, { data: posts, error: postsError }] =
    await Promise.all([
      supabase.from('drivers').select('slug').not('slug', 'is', null),
      supabase.from('teams').select('slug').not('slug', 'is', null),
      supabase.from('seasons').select('slug').not('slug', 'is', null),
      supabase.from('posts').select('slug').eq('is_published', true).not('slug', 'is', null),
    ])

  if (driversError || teamsError || seasonsError || postsError) {
    throw new Error(
      `Supabase query error(s): ${[driversError, teamsError, seasonsError, postsError]
        .filter(Boolean)
        .map((error) => error?.message)
        .join(' | ')}`
    )
  }

  const targets: PageTarget[] = [...STATIC_ROUTES]

  for (const row of drivers ?? []) {
    const slug = row.slug as string
    if (slug) targets.push({ path: `/drivers/${slug}`, kind: 'driver' })
  }
  for (const row of teams ?? []) {
    const slug = row.slug as string
    if (slug) targets.push({ path: `/teams/${slug}`, kind: 'team' })
  }
  for (const row of seasons ?? []) {
    const slug = row.slug as string
    if (slug) targets.push({ path: `/seasons/${slug}`, kind: 'season' })
  }
  for (const row of posts ?? []) {
    const slug = row.slug as string
    if (slug) targets.push({ path: `/blog/${slug}`, kind: 'blog' })
  }

  return targets
}

async function auditPages(targets: PageTarget[]): Promise<AuditSummary> {
  const summary: AuditSummary = {
    totalUrlsChecked: targets.length,
    http200Count: 0,
    httpErrors: [],
    undefinedFindings: [],
    nullFindings: [],
    missingJsonLd: [],
    invalidJsonLd: [],
  }

  const base = BASE_URL.replace(/\/$/, '')

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (target) => {
        const url = `${base}${target.path}`
        let html = ''
        let status = 0
        let statusText = ''

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
          const response = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'user-agent': 'F1RecPageAudit/2.0' },
          })
          clearTimeout(timeout)
          status = response.status
          statusText = response.statusText
          html = await response.text()
        } catch (error) {
          summary.httpErrors.push({
            path: target.path,
            status: status || 0,
            detail: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          })
          return
        }

        if (status === 200) {
          summary.http200Count += 1
        } else {
          summary.httpErrors.push({
            path: target.path,
            status,
            detail: `HTTP ${status} ${statusText}`.trim(),
          })
        }

        const undefinedSnippet = findUndefinedInRenderedHtml(html)
        if (undefinedSnippet) {
          summary.undefinedFindings.push({ path: target.path, snippet: undefinedSnippet })
        }

        const nullSnippet = findVisibleNullText(html)
        if (nullSnippet) {
          summary.nullFindings.push({ path: target.path, snippet: nullSnippet })
        }

        const expectedType = getExpectedJsonLdType(target.path)
        if (expectedType && target.path !== '/compare') {
          const scripts = extractJsonLdContents(html)
          if (scripts.length === 0) {
            summary.missingJsonLd.push({ path: target.path, expectedType })
            return
          }

          let foundExpectedType = false
          scripts.forEach((script, index) => {
            if (!script) {
              summary.invalidJsonLd.push({ path: target.path, message: `Empty JSON-LD script #${index + 1}` })
              return
            }

            try {
              const parsed = JSON.parse(script)
              if (jsonLdHasType(parsed, expectedType)) {
                foundExpectedType = true
              }
              collectKeyFieldIssues(parsed, '', summary.invalidJsonLd, target.path)
            } catch (error) {
              summary.invalidJsonLd.push({
                path: target.path,
                message: `JSON parse error in script #${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
              })
            }
          })

          if (!foundExpectedType) {
            summary.missingJsonLd.push({ path: target.path, expectedType })
          }
        }
      })
    )

    if (i + CONCURRENCY < targets.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  return summary
}

function printSummary(summary: AuditSummary): void {
  const totalIssues =
    summary.httpErrors.length +
    summary.undefinedFindings.length +
    summary.nullFindings.length +
    summary.missingJsonLd.length +
    summary.invalidJsonLd.length

  const date = new Date().toISOString()
  console.log('============================================')
  console.log(`F1REC PAGE AUDIT — ${date}`)
  console.log('============================================')
  console.log(`Total URLs checked: ${summary.totalUrlsChecked}`)
  console.log(`✅ HTTP 200: ${summary.http200Count}`)
  console.log(`❌ HTTP errors: ${summary.httpErrors.length}`)
  if (summary.httpErrors.length > 0) {
    summary.httpErrors.forEach((item) => console.log(`  - ${item.path}: ${item.detail}`))
  }
  console.log(`❌ "undefined" found: ${summary.undefinedFindings.length}`)
  if (summary.undefinedFindings.length > 0) {
    summary.undefinedFindings.forEach((item) => console.log(`  - ${item.path}: ${item.snippet}`))
  }
  console.log(`❌ "null" in body: ${summary.nullFindings.length}`)
  if (summary.nullFindings.length > 0) {
    summary.nullFindings.forEach((item) => console.log(`  - ${item.path}: ${item.snippet}`))
  }
  console.log(`❌ Missing JSON-LD: ${summary.missingJsonLd.length}`)
  if (summary.missingJsonLd.length > 0) {
    summary.missingJsonLd.forEach((item) =>
      console.log(`  - ${item.path}: expected @type "${item.expectedType}"`)
    )
  }
  console.log(`❌ Invalid JSON-LD: ${summary.invalidJsonLd.length}`)
  if (summary.invalidJsonLd.length > 0) {
    summary.invalidJsonLd.forEach((item) => console.log(`  - ${item.path}: ${item.message}`))
  }
  console.log('============================================')
  console.log(
    totalIssues === 0 ? 'RESULT: ✅ ALL CLEAN' : `RESULT: ❌ ${totalIssues} ISSUES FOUND`
  )
  console.log('============================================')
}

function writeDetailedResults(summary: AuditSummary): string {
  const scriptsDir = resolve(process.cwd(), 'scripts')
  mkdirSync(scriptsDir, { recursive: true })

  const timestamp = sanitizeTimestamp(new Date())
  const outputPath = resolve(scriptsDir, `audit-results-${timestamp}.json`)
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        concurrency: CONCURRENCY,
        delayMs: REQUEST_DELAY_MS,
        summary,
      },
      null,
      2
    ),
    'utf8'
  )

  return outputPath
}

async function main(): Promise<void> {
  console.log(`Building URL list from Supabase...`)
  const targets = await getAllTargets()
  console.log(
    `Auditing ${targets.length} URLs at ${BASE_URL} (${CONCURRENCY} concurrent, ${REQUEST_DELAY_MS}ms delay)...`
  )
  const summary = await auditPages(targets)
  printSummary(summary)
  const outputPath = writeDetailedResults(summary)
  console.log(`Detailed results written to ${outputPath}`)

  const totalIssues =
    summary.httpErrors.length +
    summary.undefinedFindings.length +
    summary.nullFindings.length +
    summary.missingJsonLd.length +
    summary.invalidJsonLd.length

  process.exit(totalIssues === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('Audit failed:', error)
  process.exit(1)
})
