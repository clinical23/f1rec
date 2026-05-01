import { createAdminClient } from '@/lib/supabase/admin';

const JOLPICA_PREFIX = 'https://api.jolpi.ca/ergast/f1';

export type SyncSessionInput = {
  season: number;
  round: number;
  session_type: string;
};

export type SyncSessionResult = {
  status: 'ok' | 'error';
  race_slug: string | null;
  session_type: string;
  rows_upserted: number;
  errors: string[];
  jolpica_url: string;
};

type SupportedSessionType = 'race' | 'sprint' | 'qualifying';

type JolpicaDriver = {
  driverId: string;
  givenName?: string;
  familyName?: string;
  code?: string;
};

type JolpicaConstructor = {
  constructorId?: string;
  name?: string;
};

type JolpicaRaceResult = {
  number?: string;
  position?: string;
  positionText?: string;
  points?: string;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time?: string };
  Driver: JolpicaDriver;
  Constructor?: JolpicaConstructor;
};

type JolpicaQualifyingResult = {
  number?: string;
  position?: string;
  Driver: JolpicaDriver;
  Constructor?: JolpicaConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
};

type JolpicaRaceRow = {
  raceName?: string;
  Results?: JolpicaRaceResult[];
  SprintResults?: JolpicaRaceResult[];
  QualifyingResults?: JolpicaQualifyingResult[];
};

type JolpicaApiPayload = {
  MRData?: {
    RaceTable?: {
      Races?: JolpicaRaceRow[];
    };
  };
};

function normalizeSessionType(raw: string): string {
  return String(raw ?? '').trim().toLowerCase();
}

function jolpicaSessionUrl(season: number, round: number, session_type: SupportedSessionType): string {
  const base = `${JOLPICA_PREFIX}/${season}/${round}`;
  if (session_type === 'race') return `${base}/results.json`;
  if (session_type === 'sprint') return `${base}/sprint.json`;
  return `${base}/qualifying.json`;
}

function extractRows(
  session_type: SupportedSessionType,
  race: JolpicaRaceRow
): Array<JolpicaRaceResult | JolpicaQualifyingResult> {
  if (session_type === 'race') return race.Results ?? [];
  if (session_type === 'sprint') return race.SprintResults ?? [];
  return race.QualifyingResults ?? [];
}

function slugPositionSegment(position: number | null, positionText: string | null): string {
  if (typeof position === 'number' && Number.isFinite(position)) {
    return `P${position}`;
  }
  const t = (positionText ?? 'np').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'np';
  return `P${t}`;
}

function qualifyingBestTime(q: JolpicaQualifyingResult): string | null {
  return q.Q3?.trim() || q.Q2?.trim() || q.Q1?.trim() || null;
}

export async function syncSession(input: SyncSessionInput): Promise<SyncSessionResult> {
  const session_type_norm = normalizeSessionType(input.session_type);
  const emptyErr = (
    errors: string[],
    jolpica_url: string
  ): SyncSessionResult => ({
    status: 'error',
    race_slug: null,
    session_type: session_type_norm || input.session_type,
    rows_upserted: 0,
    errors,
    jolpica_url,
  });

  if (session_type_norm === 'sprint_qualifying') {
    return emptyErr(
      [
        'sprint_qualifying not supported by Jolpica /ergast endpoints — see github.com/jolpica/jolpica-f1 discussion #128',
      ],
      ''
    );
  }

  const supported: SupportedSessionType[] = ['race', 'sprint', 'qualifying'];
  if (!supported.includes(session_type_norm as SupportedSessionType)) {
    return emptyErr([`invalid_session_type:${session_type_norm}`], '');
  }

  const session_type = session_type_norm as SupportedSessionType;
  const jolpica_url = jolpicaSessionUrl(input.season, input.round, session_type);

  let response: Response;
  try {
    response = await fetch(jolpica_url, { signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return emptyErr([`jolpica_fetch_failed:${msg}`], jolpica_url);
  }

  if (!response.ok) {
    return emptyErr([`jolpica_http_${response.status}`], jolpica_url);
  }

  let payload: JolpicaApiPayload;
  try {
    payload = (await response.json()) as JolpicaApiPayload;
  } catch {
    return emptyErr(['jolpica_json_parse_failed'], jolpica_url);
  }

  const races = payload.MRData?.RaceTable?.Races ?? [];
  const race = races[0];
  if (!race) {
    return emptyErr(['session_not_found_in_jolpica'], jolpica_url);
  }

  const rawRows = extractRows(session_type, race);
  if (rawRows.length === 0) {
    return emptyErr(['session_not_found_in_jolpica'], jolpica_url);
  }

  const supabase = createAdminClient();

  const { data: raceRows, error: raceLookupError } = await supabase
    .from('races')
    .select('id, slug, circuit_slug, season_id')
    .eq('season_year', input.season)
    .eq('round', input.round);

  if (raceLookupError) {
    return emptyErr([`race_lookup_failed:${raceLookupError.message}`], jolpica_url);
  }

  const raceList = raceRows ?? [];
  if (raceList.length === 0) {
    return emptyErr([`race_row_missing_for_${input.season}-r${input.round}`], jolpica_url);
  }
  if (raceList.length !== 1) {
    return emptyErr([`race_row_ambiguous:${raceList.length}_rows_for_${input.season}-r${input.round}`], jolpica_url);
  }

  const raceRow = raceList[0]!;
  const circuitSlug = raceRow.circuit_slug ? String(raceRow.circuit_slug) : 'unknown';
  const raceSlugDb = String(raceRow.slug);
  const raceName = race.raceName ?? null;

  const driverIds = new Set<string>();
  const teamIds = new Set<string>();

  for (const row of rawRows) {
    const dId = row.Driver?.driverId;
    if (dId) driverIds.add(dId);
    const cId = row.Constructor?.constructorId;
    if (cId) teamIds.add(cId);
  }

  const [driverRes, teamRes] = await Promise.all([
    driverIds.size
      ? supabase.from('drivers').select('id, slug').in('slug', [...driverIds])
      : Promise.resolve({ data: [] as { id: string; slug: string }[], error: null }),
    teamIds.size
      ? supabase.from('teams').select('id, slug').in('slug', [...teamIds])
      : Promise.resolve({ data: [] as { id: string; slug: string }[], error: null }),
  ]);

  if (driverRes.error) {
    return emptyErr([`driver_lookup_failed:${driverRes.error.message}`], jolpica_url);
  }
  if (teamRes.error) {
    return emptyErr([`team_lookup_failed:${teamRes.error.message}`], jolpica_url);
  }

  const driverIdBySlug = new Map<string, string>();
  for (const d of driverRes.data ?? []) driverIdBySlug.set(d.slug, d.id);

  const teamIdBySlug = new Map<string, string>();
  for (const t of teamRes.data ?? []) teamIdBySlug.set(t.slug, t.id);

  const suffix = session_type === 'sprint' ? '-sprint' : session_type === 'qualifying' ? '-quali' : '';
  const is_sprint = session_type === 'sprint';

  const errors: string[] = [];
  const upsertPayload: Record<string, unknown>[] = [];

  if (session_type === 'qualifying') {
    for (const qr of rawRows as JolpicaQualifyingResult[]) {
      const driverSlug = qr.Driver?.driverId;
      const constructorSlug = qr.Constructor?.constructorId ?? null;
      if (!driverSlug) {
        errors.push('qualifying_row_missing_driver');
        continue;
      }
      if (!constructorSlug) {
        errors.push(`constructor_missing:${driverSlug}`);
        continue;
      }

      const driverUuid = driverIdBySlug.get(driverSlug);
      const teamUuid = teamIdBySlug.get(constructorSlug);
      if (!driverUuid) {
        errors.push(`driver_not_found:${driverSlug}`);
        continue;
      }
      if (!teamUuid) {
        errors.push(`team_not_found:${constructorSlug}`);
        continue;
      }

      const posNum = Number.parseInt(qr.position ?? '', 10);
      const position = Number.isFinite(posNum) ? posNum : null;
      const position_text = qr.position ?? null;
      const driverName =
        `${qr.Driver.givenName ?? ''} ${qr.Driver.familyName ?? ''}`.trim() || driverSlug;

      const slug = `${input.season}-${input.round}-${circuitSlug}-${driverSlug}-${slugPositionSegment(
        position,
        position_text
      )}${suffix}`;

      upsertPayload.push({
        slug,
        race_id: raceRow.id,
        driver_id: driverUuid,
        team_id: teamUuid,
        season_id: raceRow.season_id,
        session_type,
        is_sprint,
        race_slug: raceSlugDb,
        season_year: input.season,
        round: input.round,
        race_name: raceName,
        driver_slug: driverSlug,
        driver_code: qr.Driver.code ?? null,
        driver_name: driverName,
        constructor_slug: constructorSlug,
        constructor_name: qr.Constructor?.name ?? null,
        number: qr.number ? Number.parseInt(qr.number, 10) : null,
        grid: null,
        grid_position: null,
        position,
        position_text,
        points: 0,
        status: 'Qualified',
        time_text: qualifyingBestTime(qr),
        time_millis: null,
        laps: null,
      });
    }
  } else {
    for (const rr of rawRows as JolpicaRaceResult[]) {
      const driverSlug = rr.Driver?.driverId;
      const constructorSlug = rr.Constructor?.constructorId ?? null;
      if (!driverSlug) {
        errors.push('race_row_missing_driver');
        continue;
      }
      if (!constructorSlug) {
        errors.push(`constructor_missing:${driverSlug}`);
        continue;
      }

      const driverUuid = driverIdBySlug.get(driverSlug);
      const teamUuid = teamIdBySlug.get(constructorSlug);
      if (!driverUuid) {
        errors.push(`driver_not_found:${driverSlug}`);
        continue;
      }
      if (!teamUuid) {
        errors.push(`team_not_found:${constructorSlug}`);
        continue;
      }

      const posNum = Number.parseInt(rr.position ?? '', 10);
      const position = Number.isFinite(posNum) ? posNum : null;
      const gridNum = Number.parseInt(rr.grid ?? '', 10);
      const grid = Number.isFinite(gridNum) ? gridNum : null;
      const pointsNum = Number.parseFloat(rr.points ?? '');
      const points = Number.isFinite(pointsNum) ? pointsNum : null;
      const driverName =
        `${rr.Driver.givenName ?? ''} ${rr.Driver.familyName ?? ''}`.trim() || driverSlug;

      const slug = `${input.season}-${input.round}-${circuitSlug}-${driverSlug}-${slugPositionSegment(
        position,
        rr.positionText ?? null
      )}${suffix}`;

      upsertPayload.push({
        slug,
        race_id: raceRow.id,
        driver_id: driverUuid,
        team_id: teamUuid,
        season_id: raceRow.season_id,
        session_type,
        is_sprint,
        race_slug: raceSlugDb,
        season_year: input.season,
        round: input.round,
        race_name: raceName,
        driver_slug: driverSlug,
        driver_code: rr.Driver.code ?? null,
        driver_name: driverName,
        constructor_slug: constructorSlug,
        constructor_name: rr.Constructor?.name ?? null,
        number: rr.number ? Number.parseInt(rr.number, 10) : null,
        grid,
        grid_position: grid,
        position,
        position_text: rr.positionText ?? null,
        points,
        status: rr.status ?? null,
        time_text: rr.Time?.time ?? null,
        time_millis: rr.Time?.millis ? Number.parseInt(rr.Time.millis, 10) : null,
        laps: rr.laps ? Number.parseInt(rr.laps, 10) : null,
      });
    }
  }

  if (upsertPayload.length === 0) {
    return {
      status: 'error',
      race_slug: raceSlugDb,
      session_type,
      rows_upserted: 0,
      errors: errors.length ? errors : ['no_rows_to_upsert'],
      jolpica_url,
    };
  }

  let rows_upserted = 0;
  const chunkSize = 500;
  for (let i = 0; i < upsertPayload.length; i += chunkSize) {
    const chunk = upsertPayload.slice(i, i + chunkSize);
    const { error: upsertError } = await supabase.from('results').upsert(chunk, {
      onConflict: 'race_id,driver_id,session_type',
    });
    if (upsertError) {
      return {
        status: 'error',
        race_slug: raceSlugDb,
        session_type,
        rows_upserted,
        errors: [...errors, `upsert_failed:${upsertError.message}`],
        jolpica_url,
      };
    }
    rows_upserted += chunk.length;
  }

  return {
    status: 'ok',
    race_slug: raceSlugDb,
    session_type,
    rows_upserted,
    errors,
    jolpica_url,
  };
}
