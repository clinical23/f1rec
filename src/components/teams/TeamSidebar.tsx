import Link from 'next/link'

type TeamSidebarProps = {
  team: {
    name: string
    base?: string | null
    team_principal?: string | null
    founded_year?: number | null
    nationality?: string | null
  }
  championshipYears: number[]
  currentDrivers: Array<{ id: string; slug: string; full_name: string; nationality: string | null }>
  currentSeason: number
}

export default function TeamSidebar({ team, championshipYears, currentDrivers, currentSeason }: TeamSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="blog-card">
        <div className="blog-card__eyebrow">Team Info</div>
        <div className="blog-card__meta">Base: {team.base ?? '—'}</div>
        <div className="blog-card__meta">Principal: {team.team_principal ?? '—'}</div>
        <div className="blog-card__meta">Founded: {team.founded_year ?? '—'}</div>
        {team.nationality ? <div className="blog-card__meta">Country: {team.nationality}</div> : null}
      </div>

      <div className="blog-card">
        <div className="blog-card__eyebrow">Current Drivers ({currentSeason})</div>
        {currentDrivers.length === 0 ? (
          <div className="blog-card__meta">No 2026 results yet for this team.</div>
        ) : (
          <ul className="blog-card__list">
            {currentDrivers.map((driver) => (
              <li key={driver.id} className="blog-card__list-item">
                <Link href={`/drivers/${driver.slug}`} className="blog-card__list-item-title">
                  {driver.full_name}
                </Link>
                {driver.nationality ? <div className="blog-card__list-item-date">{driver.nationality}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {championshipYears.length > 0 ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">Constructor Titles</div>
          <div className="blog-card__meta">{championshipYears.join(', ')}</div>
        </div>
      ) : null}

      <div className="blog-card">
        <div className="blog-card__eyebrow">Compare</div>
        <div className="blog-card__meta">See {currentSeason} season standings for {team.name} and rivals.</div>
        <Link href={`/seasons/${currentSeason}`} className="blog-card__cta">
          Open season standings
        </Link>
      </div>
    </div>
  )
}
