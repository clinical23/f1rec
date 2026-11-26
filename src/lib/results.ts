const CODES: Record<string, string> = { R: 'Ret', W: 'DNS', D: 'DSQ', N: 'NC', F: 'DNQ', E: 'Excl' }

/** What to show in a finishing-position cell: the place if classified, otherwise Ret, DNS, DSQ and so on. */
export function finishLabel(position: number | null | undefined, positionText?: string | null): { label: string | number; classified: boolean } {
  const classified = !positionText || /^\d+$/.test(positionText)
  if (classified) return { label: position ?? '—', classified: true }
  return { label: CODES[positionText] ?? positionText, classified: false }
}
