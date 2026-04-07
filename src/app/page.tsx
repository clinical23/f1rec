import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ fontFamily: "'Barlow', sans-serif", background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '56px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '26px', fontWeight: 900, color: '#fff' }}>
          F1<span style={{ color: 'var(--accent)' }}>Rec</span>
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['Drivers', 'Teams', 'Races', 'Seasons', 'Compare', 'Leaderboards'].map(item => (
            <Link key={item} href={`/${item.toLowerCase()}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '6px 12px', borderRadius: '4px' }}>
              {item}
            </Link>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '64px 24px', textAlign: 'center', background: 'linear-gradient(180deg, #0a0a0f 0%, #12040a 50%, #0a0a0f 100%)' }}>
        <div style={{ display: 'inline-block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', padding: '4px 12px', border: '1px solid rgba(232,0,45,0.3)', borderRadius: '20px' }}>
          The F1 Database
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '72px', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-2px', color: '#fff', marginBottom: '20px', textTransform: 'uppercase' }}>
          Every stat.<br /><span style={{ color: 'var(--accent)' }}>Every race.</span><br />Every era.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '17px', maxWidth: '520px', margin: '0 auto 32px' }}>
          The most complete Formula 1 statistics platform. Explore drivers, teams, circuits and results from 1950 to today.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/drivers" style={{ background: 'var(--accent)', color: 'white', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', padding: '12px 28px', borderRadius: '4px', textDecoration: 'none' }}>
            Explore Drivers
          </Link>
          <Link href="/compare" style={{ background: 'transparent', color: 'var(--text)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', padding: '12px 28px', borderRadius: '4px', border: '1px solid var(--border)', textDecoration: 'none' }}>
            Compare Drivers →
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        {[
          { num: '1,076', label: 'Drivers' },
          { num: '1,107', label: 'Races' },
          { num: '77', label: 'Seasons' },
          { num: '78', label: 'Circuits' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '20px 24px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '40px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{stat.num}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>

        {/* MAIN */}
        <div>
          {/* Ad placeholder */}
          <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#444455', textAlign: 'center', marginBottom: '4px', fontFamily: 'monospace' }}>Advertisement</div>
          <div style={{ background: 'var(--bg3)', border: '1px dashed #333344', borderRadius: '6px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444455', fontSize: '11px', fontFamily: 'monospace', marginBottom: '24px' }}>728 × 90 — Leaderboard Ad</div>

          {/* Recent Races */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: '#fff' }}>
              Recent <span style={{ color: 'var(--accent)' }}>Races</span>
            </h2>
            <Link href="/races" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>See all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
            {[
              { round: 'R24', flag: '🇦🇪', name: 'Abu Dhabi Grand Prix', circuit: 'Yas Marina', date: '8 Dec 2024', winner: 'Lando Norris', time: '1:26:13.523' },
              { round: 'R23', flag: '🇶🇦', name: 'Qatar Grand Prix', circuit: 'Lusail', date: '1 Dec 2024', winner: 'Max Verstappen', time: '1:31:05.323' },
              { round: 'R22', flag: '🇧🇷', name: 'São Paulo Grand Prix', circuit: 'Interlagos', date: '3 Nov 2024', winner: 'Max Verstappen', time: '1:45:33.433' },
              { round: 'R21', flag: '🇲🇽', name: 'Mexico City Grand Prix', circuit: 'Hermanos Rodríguez', date: '27 Oct 2024', winner: 'Carlos Sainz', time: '1:42:11.044' },
            ].map((race, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)', width: '40px', textAlign: 'center', flexShrink: 0 }}>{race.round}</div>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{race.flag}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{race.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{race.circuit} · {race.date}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>🥇 {race.winner}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{race.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: '#fff' }}>
              All-Time <span style={{ color: 'var(--accent)' }}>Wins</span> Leaders
            </h2>
            <Link href="/leaderboards" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Full leaderboard →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                {['Pos', 'Driver', 'Wins', 'Podiums', 'Poles', 'Points', '🏆'].map((h, i) => (
                  <th key={i} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 12px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', textAlign: i > 1 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { pos: 1, code: 'HAM', name: 'Lewis Hamilton', nat: '🇬🇧', wins: 103, podiums: 197, poles: 104, points: '4,801.5', titles: 7, color: '#0077c8' },
                { pos: 2, code: 'SCH', name: 'Michael Schumacher', nat: '🇩🇪', wins: 91, podiums: 155, poles: 68, points: '1,566', titles: 7, color: '#cc1e4a' },
                { pos: 3, code: 'VER', name: 'Max Verstappen', nat: '🇳🇱', wins: 63, podiums: 112, poles: 41, points: '3,005.5', titles: 4, color: '#1e3799' },
                { pos: 4, code: 'VET', name: 'Sebastian Vettel', nat: '🇩🇪', wins: 53, podiums: 122, poles: 57, points: '3,098', titles: 4, color: '#cc0000' },
                { pos: 5, code: 'PRO', name: 'Alain Prost', nat: '🇫🇷', wins: 51, podiums: 106, poles: 33, points: '798.5', titles: 4, color: '#ff8700' },
              ].map((d) => (
                <tr key={d.pos} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '4px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 800, background: d.pos === 1 ? 'rgba(245,200,66,0.15)' : d.pos === 2 ? 'rgba(192,192,200,0.15)' : d.pos === 3 ? 'rgba(205,127,50,0.15)' : 'var(--bg4)', color: d.pos === 1 ? 'var(--gold)' : d.pos === 2 ? 'var(--silver)' : d.pos === 3 ? 'var(--bronze)' : 'var(--muted)' }}>{d.pos}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.color, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{d.code}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{d.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{d.nat}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: d.pos === 1 ? 'var(--gold)' : 'var(--text)', fontWeight: d.pos === 1 ? 700 : 400 }}>{d.wins}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>{d.podiums}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>{d.poles}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>{d.points}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'var(--gold)' }}>{d.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SIDEBAR */}
        <div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>2024 Champion</div>
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '24px', fontWeight: 900, color: '#fff' }}>Max Verstappen</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>Red Bull Racing · 🇳🇱</div>
              {[['Points', '437'], ['Wins', '9'], ['Poles', '9'], ['Podiums', '14']].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#fff' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>2024 Constructors</div>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {[
                { pos: 1, color: '#ff8700', name: 'McLaren', pts: '666' },
                { pos: 2, color: '#e8002d', name: 'Ferrari', pts: '652' },
                { pos: 3, color: '#3671c6', name: 'Red Bull', pts: '589' },
                { pos: 4, color: '#27f4d2', name: 'Mercedes', pts: '468' },
              ].map((t) => (
                <div key={t.pos} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#fff' }}>
                    <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: '11px' }}>{t.pos}</span>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: t.color }}></span>
                    {t.name}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gold)' }}>{t.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}