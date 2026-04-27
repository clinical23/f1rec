type EraLabel =
  | 'Classic Era'
  | 'Turbo & V10 Era'
  | 'Modern V10/V8 Era'
  | 'Hybrid Era'

export function getDriverEra(
  firstSeason: number | null | undefined,
  lastSeason: number | null | undefined
): EraLabel | null {
  if (!firstSeason || !lastSeason) return null
  const midpoint = Math.floor((firstSeason + lastSeason) / 2)
  if (midpoint < 1980) return 'Classic Era'
  if (midpoint < 2000) return 'Turbo & V10 Era'
  if (midpoint < 2014) return 'Modern V10/V8 Era'
  return 'Hybrid Era'
}
