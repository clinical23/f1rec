import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncSession, type SyncSessionResult } from '@/lib/jolpica/session-sync';

// Brings a season up to date from Jolpica (the Ergast successor the rest of the site already uses):
//   1. calendar: each official round gets a races row at the right round, date and circuit
//      (rows that already have results are never moved; placeholder rows for races that aren't on the
//      official calendar are only listed, never deleted: removing them is T's call)
//   2. drivers: anyone in a session who isn't in drivers yet is added (so no result is skipped)
//   3. results: qualifying, sprint and race for every round that has happened, via syncSession
//   4. races: winner, winning team and pole from those results
//   5. standings: driver_season_stats and team_season_stats rebuilt from results
// Idempotent: re-running changes nothing once the season is current. A run stops starting new rounds
// near its time budget and picks up where it left off next time.

const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const PAUSE_MS = 350; // Jolpica allows ~4 requests a second

type JolpicaCircuit = {
  circuitId: string;
  circuitName: string;
  url?: string;
  Location?: { lat?: string; long?: string; locality?: string; country?: string };
};
type JolpicaScheduleRace = {
  season: string;
  round: string;
  raceName: string;
  url?: string;
  date: string;
  time?: string;
  Circuit: JolpicaCircuit;
  Qualifying?: { date: string; time?: string };
  Sprint?: { date: string; time?: string };
};
type JolpicaDriver = {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
};

type DbRace = {
  id: string;
  slug: string;
  round: number;
  name: string;
  race_date: string;
  circuit_id: string | null;
  circuit_slug: string | null;
  has_results: boolean;
};

/** Jolpica circuitId -> circuits row. Keyed by both circuits.circuit_id and circuits.slug, which differ for
 * some tracks (F1Rec's slug isn't always Jolpica's id). */
type CircuitMap = Map<string, { id: string; slug: string }>;

export type CatchupReport = {
  season: number;
  calendar: { updated: string[]; inserted: string[]; not_on_calendar: string[]; circuits_added: string[]; refused: string[] };
  drivers_added: string[];
  sessions: { round: number; session: string; status: string; rows: number; errors: string[] }[];
  winners_set: number;
  standings: { drivers: number; teams: number } | null;
  careers_updated: number;
  stopped_early: boolean;
  errors: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function jolpica<T>(path: string): Promise<T> {
  const res = await fetch(`${JOLPICA}${path}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new Error(`jolpica_http_${res.status}:${path}`);
  return (await res.json()) as T;
}

export function raceSlug(season: number, raceName: string): string {
  return `${season}-${raceName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function driverSlugBase(d: JolpicaDriver): string {
  return `${d.givenName}-${d.familyName}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Has this session finished? A session counts as done 4 hours after its scheduled start. */
export function sessionDone(date: string | undefined, time: string | undefined, now: Date): boolean {
  if (!date) return false;
  const start = new Date(`${date}T${time ?? '23:59:00Z'}`);
  return start.getTime() + 4 * 3600_000 < now.getTime();
}

async function loadDbRaces(db: SupabaseClient, season: number): Promise<DbRace[]> {
  const { data, error } = await db
    .from('races')
    .select('id, slug, round, name, race_date, circuit_id, circuit_slug')
    .eq('season_year', season);
  if (error) throw new Error(`races_load_failed:${error.message}`);
  const ids = (data ?? []).map((r) => r.id);
  const withResults = new Set<string>();
  if (ids.length) {
    const { data: res, error: resErr } = await db.from('results').select('race_id').in('race_id', ids).limit(5000);
    if (resErr) throw new Error(`results_load_failed:${resErr.message}`);
    for (const r of res ?? []) withResults.add(String(r.race_id));
  }
  return (data ?? []).map((r) => ({ ...r, has_results: withResults.has(r.id) })) as DbRace[];
}

async function loadCircuits(db: SupabaseClient): Promise<CircuitMap> {
  const { data, error } = await db.from('circuits').select('id, slug, circuit_id').limit(1000);
  if (error) throw new Error(`circuits_load_failed:${error.message}`);
  const map: CircuitMap = new Map();
  for (const c of data ?? []) {
    const row = { id: String(c.id), slug: String(c.slug) };
    if (c.circuit_id) map.set(String(c.circuit_id), row);
    if (c.slug && !map.has(String(c.slug))) map.set(String(c.slug), row);
  }
  return map;
}

async function ensureCircuit(db: SupabaseClient, circuits: CircuitMap, c: JolpicaCircuit, report: CatchupReport): Promise<{ id: string; slug: string }> {
  const known = circuits.get(c.circuitId);
  if (known) return known;
  const loc = c.Location ?? {};
  const { data: made, error } = await db
    .from('circuits')
    .insert({
      slug: c.circuitId,
      circuit_id: c.circuitId,
      name: c.circuitName,
      city: loc.locality ?? c.circuitName,
      locality: loc.locality ?? null,
      country: loc.country ?? null,
      lat: loc.lat ? Number(loc.lat) : null,
      lng: loc.long ? Number(loc.long) : null,
      latitude: loc.lat ? Number(loc.lat) : null,
      longitude: loc.long ? Number(loc.long) : null,
    })
    .select('id')
    .single();
  if (error || !made) throw new Error(`circuit_insert_failed:${c.circuitId}:${error?.message}`);
  report.calendar.circuits_added.push(c.circuitId);
  const row = { id: String(made.id), slug: c.circuitId };
  circuits.set(c.circuitId, row);
  return row;
}

async function slugFree(db: SupabaseClient, slug: string, exceptId?: string): Promise<boolean> {
  const { data } = await db.from('races').select('id').eq('slug', slug).limit(2);
  return !(data ?? []).some((r) => r.id !== exceptId);
}

async function reconcileCalendar(
  db: SupabaseClient,
  season: number,
  seasonId: string,
  schedule: JolpicaScheduleRace[],
  report: CatchupReport
) {
  let dbRaces = await loadDbRaces(db, season);
  const circuits = await loadCircuits(db);
  const officialCircuitIds = new Set<string>();

  for (const s of schedule) {
    const round = Number(s.round);
    const circuit = await ensureCircuit(db, circuits, s.Circuit, report);
    officialCircuitIds.add(circuit.id);
    const fields = {
      round,
      name: s.raceName,
      race_date: s.date,
      race_time: s.time ?? null,
      qualifying_date: s.Qualifying?.date ?? null,
      sprint_date: s.Sprint?.date ?? null,
      url: s.url ?? null,
      circuit_id: circuit.id,
      circuit_slug: circuit.slug,
    };
    const atCircuit = dbRaces.filter((r) => r.circuit_id === circuit.id || r.circuit_slug === circuit.slug || r.circuit_slug === s.Circuit.circuitId);
    if (atCircuit.length > 1) {
      report.calendar.refused.push(`${s.Circuit.circuitId}: ${atCircuit.length} rows in ${season}`);
      continue;
    }
    const wantSlug = raceSlug(season, s.raceName);
    const existing = atCircuit[0];
    if (existing) {
      if (existing.has_results && existing.round !== round) {
        // Results already hang off this row under another round number: don't guess.
        report.calendar.refused.push(`${existing.slug}: has results at round ${existing.round}, official round ${round}`);
        continue;
      }
      // A renamed race gets the matching address, unless it already has results (its pages may be linked).
      const patch: Record<string, unknown> = { ...fields };
      if (!existing.has_results && existing.slug !== wantSlug && (await slugFree(db, wantSlug, existing.id))) {
        patch.slug = wantSlug;
      }
      const changed =
        existing.round !== round || existing.race_date !== s.date || existing.name !== s.raceName || patch.slug !== undefined;
      const { error } = await db.from('races').update(patch).eq('id', existing.id);
      if (error) report.errors.push(`race_update_failed:${existing.slug}:${error.message}`);
      else if (changed) report.calendar.updated.push(`${existing.slug} -> ${patch.slug ?? existing.slug}, round ${round}, ${s.date}`);
      continue;
    }
    const slug = (await slugFree(db, wantSlug)) ? wantSlug : `${wantSlug}-${circuit.slug.replace(/_/g, '-')}`;
    const { error } = await db.from('races').insert({
      ...fields,
      slug,
      full_name: s.raceName,
      season_id: seasonId,
      season_year: season,
    });
    if (error) report.errors.push(`race_insert_failed:${slug}:${error.message}`);
    else report.calendar.inserted.push(`${slug} (round ${round})`);
    dbRaces = await loadDbRaces(db, season);
  }

  // Rows for races that aren't on the official calendar: listed for T, never deleted here.
  dbRaces = await loadDbRaces(db, season);
  for (const r of dbRaces.filter((x) => !x.circuit_id || !officialCircuitIds.has(x.circuit_id))) {
    report.calendar.not_on_calendar.push(`${r.slug} (round ${r.round})${r.has_results ? ' (has results)' : ''}`);
  }

  await db.from('seasons').update({ rounds: schedule.length }).eq('id', seasonId);
}

async function ensureDrivers(db: SupabaseClient, drivers: JolpicaDriver[], report: CatchupReport) {
  const ids = [...new Set(drivers.map((d) => d.driverId))];
  if (!ids.length) return;
  const { data, error } = await db.from('drivers').select('slug, driver_id').or(
    `driver_id.in.(${ids.map((i) => `"${i}"`).join(',')}),slug.in.(${ids.map((i) => `"${i}"`).join(',')})`
  );
  if (error) throw new Error(`drivers_load_failed:${error.message}`);
  const known = new Set<string>();
  for (const d of data ?? []) {
    if (d.driver_id) known.add(String(d.driver_id));
    if (d.slug) known.add(String(d.slug));
  }
  for (const d of drivers) {
    if (known.has(d.driverId)) continue;
    let slug = driverSlugBase(d) || d.driverId;
    const { data: clash } = await db.from('drivers').select('id').eq('slug', slug).limit(1);
    if (clash && clash.length) slug = d.driverId.replace(/_/g, '-');
    const { error: insErr } = await db.from('drivers').insert({
      slug,
      driver_id: d.driverId,
      first_name: d.givenName,
      last_name: d.familyName,
      full_name: `${d.givenName} ${d.familyName}`,
      code: d.code ?? null,
      number: d.permanentNumber ? Number(d.permanentNumber) : null,
      nationality: d.nationality ?? null,
      date_of_birth: d.dateOfBirth ?? null,
      is_active: true,
    });
    if (insErr) report.errors.push(`driver_insert_failed:${d.driverId}:${insErr.message}`);
    else {
      report.drivers_added.push(`${d.givenName} ${d.familyName}`);
      known.add(d.driverId);
    }
  }
}

type SessionKind = 'qualifying' | 'sprint' | 'race';
const SESSION_PATH: Record<SessionKind, string> = { qualifying: 'qualifying', sprint: 'sprint', race: 'results' };
const SESSION_KEY: Record<SessionKind, string> = { qualifying: 'QualifyingResults', sprint: 'SprintResults', race: 'Results' };

async function sessionDrivers(season: number, round: number, kind: SessionKind): Promise<JolpicaDriver[] | null> {
  const payload = await jolpica<{ MRData?: { RaceTable?: { Races?: Record<string, unknown>[] } } }>(
    `/${season}/${round}/${SESSION_PATH[kind]}.json?limit=100`
  );
  const race = payload.MRData?.RaceTable?.Races?.[0];
  const rows = (race?.[SESSION_KEY[kind]] as { Driver: JolpicaDriver }[] | undefined) ?? [];
  return rows.length ? rows.map((r) => r.Driver) : null;
}

/** How many rows a session already has, by race id. */
async function sessionCounts(db: SupabaseClient, raceIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!raceIds.length) return counts;
  const { data } = await db.from('results').select('race_id, session_type').in('race_id', raceIds).limit(10000);
  for (const r of data ?? []) {
    const key = `${r.race_id}|${r.session_type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function setWinners(db: SupabaseClient, season: number): Promise<number> {
  const { data: races } = await db.from('races').select('id').eq('season_year', season);
  let set = 0;
  for (const r of races ?? []) {
    const { data: rows } = await db
      .from('results')
      .select('driver_id, team_id, position, session_type')
      .eq('race_id', r.id)
      .in('session_type', ['race', 'qualifying'])
      .eq('position', 1);
    const winner = (rows ?? []).find((x) => x.session_type === 'race');
    const pole = (rows ?? []).find((x) => x.session_type === 'qualifying');
    if (!winner && !pole) continue;
    const patch: Record<string, unknown> = {};
    if (winner) {
      patch.winner_driver_id = winner.driver_id;
      patch.winner_team_id = winner.team_id;
    }
    if (pole) patch.pole_driver_id = pole.driver_id;
    const { error } = await db.from('races').update(patch).eq('id', r.id);
    if (!error) set++;
  }
  return set;
}

type ResultRow = {
  driver_id: string;
  team_id: string;
  session_type: string;
  position: number | null;
  position_text: string | null;
  points: number | null;
  status: string | null;
  race_id: string;
};

/** Standings from results: race + sprint points; wins, podiums, starts, DNFs from races; poles from qualifying. */
export function computeStandings(rows: ResultRow[]) {
  type D = { driver_id: string; team_id: string; points: number; wins: number; podiums: number; poles: number; starts: number; dnfs: number; best: number[] };
  const drivers = new Map<string, D>();
  const teams = new Map<string, { team_id: string; points: number; wins: number; podiums: number; poles: number }>();
  const get = (r: ResultRow) => {
    let d = drivers.get(r.driver_id);
    if (!d) {
      d = { driver_id: r.driver_id, team_id: r.team_id, points: 0, wins: 0, podiums: 0, poles: 0, starts: 0, dnfs: 0, best: [] };
      drivers.set(r.driver_id, d);
    }
    return d;
  };
  const team = (id: string) => {
    let t = teams.get(id);
    if (!t) {
      t = { team_id: id, points: 0, wins: 0, podiums: 0, poles: 0 };
      teams.set(id, t);
    }
    return t;
  };
  for (const r of rows) {
    const d = get(r);
    const t = team(r.team_id);
    const pts = Number(r.points) || 0;
    if (r.session_type === 'race') {
      d.team_id = r.team_id; // the team they last raced for
      d.points += pts;
      t.points += pts;
      d.starts += 1;
      if (r.position_text === 'R' || r.position_text === 'N') d.dnfs += 1;
      if (r.position === 1) { d.wins += 1; t.wins += 1; }
      if (r.position != null && r.position <= 3) { d.podiums += 1; t.podiums += 1; }
      if (r.position != null) d.best.push(r.position);
    } else if (r.session_type === 'sprint') {
      d.points += pts;
      t.points += pts;
    } else if (r.session_type === 'qualifying' && r.position === 1) {
      d.poles += 1;
      t.poles += 1;
    }
  }
  // Championship order: points, then wins, then count-back of best finishes.
  const cmp = (a: D, b: D) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    for (let p = 1; p <= 30; p++) {
      const ca = a.best.filter((x) => x === p).length;
      const cb = b.best.filter((x) => x === p).length;
      if (ca !== cb) return cb - ca;
    }
    return 0;
  };
  const driverRows = [...drivers.values()].filter((d) => d.starts > 0).sort(cmp).map((d, i) => ({
    driver_id: d.driver_id,
    team_id: d.team_id,
    championship_position: i + 1,
    points: d.points,
    wins: d.wins,
    podiums: d.podiums,
    poles: d.poles,
    starts: d.starts,
    dnfs: d.dnfs,
    // points_per_race is a generated column: the database works it out.
  }));
  const teamRows = [...teams.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((t, i) => ({ ...t, championship_position: i + 1 }));
  return { driverRows, teamRows };
}

async function rebuildStandings(db: SupabaseClient, season: number, seasonId: string) {
  const rows: ResultRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('results')
      .select('driver_id, team_id, session_type, position, position_text, points, status, race_id')
      .eq('season_year', season)
      .range(from, from + 999);
    if (error) throw new Error(`standings_results_failed:${error.message}`);
    rows.push(...((data ?? []) as ResultRow[]));
    if (!data || data.length < 1000) break;
  }
  const { driverRows, teamRows } = computeStandings(rows.filter((r) => r.driver_id && r.team_id));
  if (!driverRows.length) return { drivers: 0, teams: 0 };
  const { error: dErr } = await db
    .from('driver_season_stats')
    .upsert(driverRows.map((r) => ({ ...r, season_id: seasonId })), { onConflict: 'driver_id,season_id' });
  if (dErr) throw new Error(`driver_stats_upsert_failed:${dErr.message}`);
  const { error: tErr } = await db
    .from('team_season_stats')
    .upsert(teamRows.map((r) => ({ ...r, season_id: seasonId })), { onConflict: 'team_id,season_id' });
  if (tErr) throw new Error(`team_stats_upsert_failed:${tErr.message}`);
  // Rows for drivers/teams with no results this season (left by the earlier partial import) are counted,
  // not deleted.
  const { count: staleD } = await db.from('driver_season_stats').select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId).not('driver_id', 'in', `(${driverRows.map((r) => r.driver_id).join(',')})`);
  const { count: staleT } = await db.from('team_season_stats').select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId).not('team_id', 'in', `(${teamRows.map((r) => r.team_id).join(',')})`);
  if (staleD || staleT) console.warn(`[season-catchup] stale standings rows left: drivers ${staleD ?? 0}, teams ${staleT ?? 0}`);
  return { drivers: driverRows.length, teams: teamRows.length };
}

/** Career wins, podiums and starts for everyone who raced this season, counted from results (race sessions
 * only: sprint wins aren't Grand Prix wins). Career points are left alone: earlier seasons' sprint points
 * aren't in results, so a recount would lose them. */
async function updateCareerTotals(db: SupabaseClient, season: number): Promise<number> {
  const { data: entrants } = await db.from('results').select('driver_id').eq('season_year', season).eq('session_type', 'race').limit(2000);
  const ids = [...new Set((entrants ?? []).map((r) => String(r.driver_id)).filter(Boolean))];
  let updated = 0;
  for (const id of ids) {
    const rows: { position: number | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('results').select('position').eq('driver_id', id).eq('session_type', 'race').range(from, from + 999);
      if (error) throw new Error(`career_results_failed:${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const career_wins = rows.filter((r) => r.position === 1).length;
    const career_podiums = rows.filter((r) => r.position != null && r.position <= 3).length;
    const career_starts = rows.length;
    const { error } = await db.from('drivers').update({ career_wins, career_podiums, career_starts, is_active: true }).eq('id', id);
    if (!error) updated++;
  }
  return updated;
}

/** Past races (from 2018) whose race results are incomplete, re-imported a few per run. 2022 São Paulo and
 * Abu Dhabi, for example, had only 10 placeholder rows with no drivers. Rows without a driver are never
 * read by the pages (they have no race_slug), so nothing has to be deleted. */
async function repairPastRaces(db: SupabaseClient, beforeSeason: number, report: CatchupReport, maxRaces = 4) {
  const { data: races } = await db
    .from('races')
    .select('id, slug, round, season_year, race_date')
    .gte('season_year', 2018)
    .lt('season_year', beforeSeason)
    .order('race_date', { ascending: true })
    .limit(1000);
  let done = 0;
  for (const r of races ?? []) {
    if (done >= maxRaces) break;
    const { count } = await db
      .from('results')
      .select('id', { count: 'exact', head: true })
      .eq('race_id', r.id)
      .eq('session_type', 'race')
      .not('driver_id', 'is', null);
    if ((count ?? 0) >= 18) continue;
    done++;
    try {
      await sleep(PAUSE_MS);
      const res = await syncSession({ season: Number(r.season_year), round: Number(r.round), session_type: 'race', race_id: String(r.id) });
      report.sessions.push({ round: Number(r.round), session: `race (repair ${r.season_year})`, status: res.status, rows: res.rows_upserted, errors: res.errors.slice(0, 5) });
    } catch (e) {
      report.sessions.push({ round: Number(r.round), session: `race (repair ${r.season_year})`, status: 'error', rows: 0, errors: [e instanceof Error ? e.message : String(e)] });
    }
  }
}

export async function seasonCatchup(season: number, opts: { budgetMs?: number; now?: Date } = {}): Promise<CatchupReport> {
  const started = Date.now();
  const budget = opts.budgetMs ?? 240_000;
  const now = opts.now ?? new Date();
  const db = createAdminClient();
  const report: CatchupReport = {
    season,
    calendar: { updated: [], inserted: [], not_on_calendar: [], circuits_added: [], refused: [] },
    drivers_added: [],
    sessions: [],
    winners_set: 0,
    standings: null,
    careers_updated: 0,
    stopped_early: false,
    errors: [],
  };

  const { data: seasonRow, error: seasonErr } = await db.from('seasons').select('id').eq('year', season).maybeSingle();
  if (seasonErr || !seasonRow) {
    report.errors.push(`season_missing:${season}`);
    return report;
  }
  const seasonId = String(seasonRow.id);

  const schedulePayload = await jolpica<{ MRData?: { RaceTable?: { Races?: JolpicaScheduleRace[] } } }>(`/${season}.json?limit=100`);
  const schedule = schedulePayload.MRData?.RaceTable?.Races ?? [];
  if (schedule.length < 10) {
    report.errors.push(`schedule_too_short:${schedule.length}`);
    return report;
  }
  await reconcileCalendar(db, season, seasonId, schedule, report);

  const dbRaces = await loadDbRaces(db, season);
  const circuits = await loadCircuits(db);
  const counts = await sessionCounts(db, dbRaces.map((r) => r.id));

  for (const s of schedule) {
    const round = Number(s.round);
    // Matched by circuit and round together: a leftover placeholder at the same round can't be picked.
    const circuit = circuits.get(s.Circuit.circuitId);
    const dbRace = dbRaces.find((r) => r.round === round && !!circuit && r.circuit_id === circuit.id);
    if (!dbRace) continue; // refused above
    const kinds: { kind: SessionKind; date?: string; time?: string }[] = [
      { kind: 'qualifying', date: s.Qualifying?.date, time: s.Qualifying?.time },
      ...(s.Sprint ? [{ kind: 'sprint' as const, date: s.Sprint.date, time: s.Sprint.time }] : []),
      { kind: 'race', date: s.date, time: s.time },
    ];
    for (const k of kinds) {
      if (!sessionDone(k.date, k.time, now)) continue;
      const have = counts.get(`${dbRace.id}|${k.kind}`) ?? 0;
      if (have >= 18) continue; // already complete (a full grid is 20-22)
      if (Date.now() - started > budget) {
        report.stopped_early = true;
        break;
      }
      try {
        await sleep(PAUSE_MS);
        const drivers = await sessionDrivers(season, round, k.kind);
        if (!drivers) {
          report.sessions.push({ round, session: k.kind, status: 'not_published_yet', rows: 0, errors: [] });
          continue;
        }
        await ensureDrivers(db, drivers, report);
        await sleep(PAUSE_MS);
        const r: SyncSessionResult = await syncSession({ season, round, session_type: k.kind, race_id: dbRace.id });
        report.sessions.push({ round, session: k.kind, status: r.status, rows: r.rows_upserted, errors: r.errors.slice(0, 5) });
      } catch (e) {
        report.sessions.push({ round, session: k.kind, status: 'error', rows: 0, errors: [e instanceof Error ? e.message : String(e)] });
      }
    }
    if (report.stopped_early) break;
  }

  if (!report.stopped_early && Date.now() - started < budget) {
    await repairPastRaces(db, season, report);
  }

  try {
    report.winners_set = await setWinners(db, season);
    report.standings = await rebuildStandings(db, season, seasonId);
    // Only once the season is fully imported, so a part-run doesn't leave half-counted careers.
    if (!report.stopped_early) report.careers_updated = await updateCareerTotals(db, season);
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : String(e));
  }
  return report;
}
