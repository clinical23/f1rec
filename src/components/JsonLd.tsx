/**
 * JSON-LD for search engines. Uses a real <script> tag so markup appears in the
 * initial HTML (next/script + afterInteractive often omits it from page source).
 */
function sanitizeJsonLd(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (Array.isArray(value)) {
    const next = value.map(sanitizeJsonLd).filter((v) => v !== undefined && v !== null)
    return next
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      const s = sanitizeJsonLd(v)
      if (s !== undefined && s !== null) out[k] = s
    }
    return out
  }
  return value
}

interface JsonLdProps {
  data: Record<string, unknown>
  /** Unique id when multiple JSON-LD blocks exist on one page */
  id?: string
}

export default function JsonLd({ data, id = 'json-ld' }: JsonLdProps) {
  const cleaned = sanitizeJsonLd(data) as Record<string, unknown>
  const json = JSON.stringify(cleaned ?? {})

  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
