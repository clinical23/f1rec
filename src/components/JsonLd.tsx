import Script from 'next/script'

interface JsonLdProps {
  data: Record<string, unknown>
  /** Unique id when multiple JSON-LD blocks exist on one page */
  id?: string
}

export default function JsonLd({ data, id = 'json-ld' }: JsonLdProps) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
