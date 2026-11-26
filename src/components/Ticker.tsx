import { getNextRace, getStandings, surname } from '@/lib/weekend'

export const ukWhen = (iso: string | null, date: string) => {
  const d = iso ? new Date(iso) : new Date(`${date}T12:00:00Z`)
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' })
  return iso ? `${day} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })} UK` : day
}

/** The strip across the top of every page: what's next and who's leading. */
export default async function Ticker() {
  let items: [string, string][] = []
  try {
    const next = await getNextRace()
    const standings = next ? await getStandings(next.season, 2) : []
    if (next) items.push(['Next', `${next.name}, ${ukWhen(next.startIso, next.date)}`])
    if (standings[0]) items.push(['Leader', `${surname(standings[0].name)} ${standings[0].points} pts`])
    if (standings[1]) items.push(['Gap', `${standings[0].points - standings[1].points} pts to ${surname(standings[1].name)}`])
    items.push(['Sim Race Week', 'opens with round 1 of 2027, with Lap Doctor'])
  } catch {
    items = []
  }
  if (!items.length) return null
  return (
    <div className="pb-ticker" aria-label="Race weekend summary">
      <div>
        {items.map(([k, v]) => (
          <span key={k}><b>{k}</b>{v}</span>
        ))}
      </div>
    </div>
  )
}
