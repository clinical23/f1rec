import Link from 'next/link'
import type { CSSProperties } from 'react'
import PageHead from '@/components/page/PageHead'

export interface Season {
  id: string
  year: number
  slug: string
  rounds: number | null
  champion_driver_id: string | null
  champion_team_id: string | null
  champion_driver_name: string | null
  champion_driver_slug?: string | null
  champion_team_name: string | null
  champion_team_slug?: string | null
  champion_team_color?: string | null
}

const tc = (c?: string | null) => ({ '--tc': c ? (c.startsWith('#') ? c : `#${c}`) : undefined }) as CSSProperties

// Rendered on the server, so the whole list is in the HTML for readers and search engines.
export default function SeasonsClient({ initialSeasons }: { initialSeasons: Season[] }) {
  const seasons = initialSeasons
  const thisYear = new Date().getFullYear()
  const decades = new Map<number, Season[]>()
  for (const s of seasons) {
    const d = Math.floor(s.year / 10) * 10
    decades.set(d, [...(decades.get(d) ?? []), s])
  }
  const titles = new Map<string, number>()
  for (const s of seasons) if (s.champion_driver_name) titles.set(s.champion_driver_name, (titles.get(s.champion_driver_name) ?? 0) + 1)
  const most = [...titles.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Seasons' }]}
        title="Seasons"
        lede="Every world championship from 1950, with its drivers' and constructors' champions. Open a season for the full standings and every race."
        stats={[
          { value: seasons.length, label: 'seasons' },
          ...(most ? [{ value: most[1], label: `titles for ${most[0].split(' ').at(-1)}`, sig: true }] : []),
        ]}
      />
      <div className="pg-body">
        {[...decades.entries()].sort((a, b) => b[0] - a[0]).map(([decade, rows], i) => (
          <details key={decade} className="pg-fold" open={i < 2}>
            <summary><b>{decade}s</b><span>{rows.length} seasons</span></summary>
            <table className="pg-table compact">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Drivers&apos; champion</th>
                  <th className="hide-sm">Constructors&apos; champion</th>
                  <th className="n hide-sm">Races</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} style={tc(s.champion_team_color)}>
                    <td className="pos"><Link href={`/seasons/${s.slug}`}>{s.year}</Link></td>
                    <td>
                      {s.champion_driver_name ? (
                        s.champion_driver_slug ? <Link href={`/drivers/${s.champion_driver_slug}`}>{s.champion_driver_name}</Link> : s.champion_driver_name
                      ) : (
                        <span className="muted">{s.year >= thisYear ? 'Still being decided' : '—'}</span>
                      )}
                    </td>
                    <td className="hide-sm">
                      {s.champion_team_name ? (
                        <>
                          <span className="tc" aria-hidden="true" />
                          {s.champion_team_slug ? <Link href={`/teams/${s.champion_team_slug}`}>{s.champion_team_name}</Link> : s.champion_team_name}
                        </>
                      ) : (
                        <span className="muted">{s.year < 1958 ? 'No constructors’ title before 1958' : s.year >= thisYear ? 'Still being decided' : '—'}</span>
                      )}
                    </td>
                    <td className="n hide-sm">{s.rounds ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </main>
  )
}
