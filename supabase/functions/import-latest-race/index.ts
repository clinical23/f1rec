/// <reference lib="deno.ns" />
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const API_BASE = "https://api.jolpi.ca/ergast/f1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ResultItem {
  number?: string;
  position?: string;
  positionText?: string;
  points?: string;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time?: string };
  FastestLap?: { rank?: string; lap?: string; Time?: { time?: string } };
  Driver: {
    driverId: string;
    code?: string;
    givenName?: string;
    familyName?: string;
  };
  Constructor?: { constructorId?: string; name?: string };
}

interface RaceItem {
  season: string;
  round: string;
  raceName?: string;
  Results?: ResultItem[];
}

interface ApiResponse {
  MRData?: { RaceTable?: { Races?: RaceItem[] } };
}

function buildRows(races: RaceItem[], isSprint: boolean) {
  const rows: Record<string, unknown>[] = [];
  for (const race of races) {
    const seasonYear = parseInt(race.season, 10);
    const round = parseInt(race.round, 10);
    const raceSlug = `${race.season}-${race.round}`;

    for (const r of race.Results ?? []) {
      const driverId = r.Driver.driverId;
      const position = parseInt(r.position ?? "", 10);
      const grid = parseInt(r.grid ?? "", 10);
      const points = parseFloat(r.points ?? "");
      const laps = parseInt(r.laps ?? "", 10);
      const driverName =
        `${r.Driver.givenName ?? ""} ${r.Driver.familyName ?? ""}`.trim() ||
        driverId;

      const positionKey = Number.isFinite(position)
        ? String(position)
        : [r.positionText, r.grid, r.status]
            .filter(Boolean)
            .join("-")
            .replace(/\s+/g, "_") || "np";

      rows.push({
        slug: `${raceSlug}-${driverId}-${positionKey}`,
        race_slug: raceSlug,
        season_year: Number.isFinite(seasonYear) ? seasonYear : null,
        round: Number.isFinite(round) ? round : 0,
        race_name: race.raceName ?? null,
        driver_slug: driverId,
        driver_code: r.Driver.code ?? null,
        driver_name: driverName,
        constructor_slug: r.Constructor?.constructorId ?? null,
        constructor_name: r.Constructor?.name ?? null,
        number: r.number ? parseInt(r.number, 10) : null,
        grid: Number.isFinite(grid) ? grid : null,
        position: Number.isFinite(position) ? position : null,
        position_text: r.positionText ?? null,
        points: Number.isFinite(points) ? points : null,
        laps: Number.isFinite(laps) ? laps : null,
        status: r.status ?? null,
        time_millis: r.Time?.millis ? parseInt(r.Time.millis, 10) : null,
        time_text: r.Time?.time ?? null,
        fastest_lap_time: r.FastestLap?.Time?.time ?? null,
        fastest_lap_rank: r.FastestLap?.rank
          ? parseInt(r.FastestLap.rank, 10)
          : null,
        is_sprint: isSprint,
      });
    }
  }
  return rows;
}

function dedup(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = row.slug as string;
    if (!map.has(key)) map.set(key, row);
  }
  return Array.from(map.values());
}

async function lookupDriverIds(
  supabase: any,
  slugs: string[]
) {
  const map = new Map<string, string>();
  if (slugs.length === 0) return map;
  const { data } = await supabase
    .from("drivers")
    .select("id, slug")
    .in("slug", slugs);
  for (const d of data ?? []) map.set(d.slug, d.id);
  return map;
}

async function lookupTeamIds(
  supabase: any,
  slugs: string[]
) {
  const map = new Map<string, string>();
  if (slugs.length === 0) return map;
  const { data } = await supabase
    .from("teams")
    .select("id, slug")
    .in("slug", slugs);
  for (const t of data ?? []) map.set(t.slug, t.id);
  return map;
}

async function lookupSeasonIds(
  supabase: any,
  years: number[]
) {
  const map = new Map<number, string>();
  if (years.length === 0) return map;
  const { data } = await supabase
    .from("seasons")
    .select("id, year")
    .in("year", years);
  for (const s of data ?? []) map.set(s.year, s.id);
  return map;
}

async function updateCareerStats(
  supabase: any,
  driverSlugs: string[]
) {
  const updated: string[] = [];

  for (const slug of driverSlugs) {
    const { data: results } = await supabase
      .from("results")
      .select("position, points, is_sprint")
      .eq("driver_slug", slug)
      .eq("is_sprint", false);

    if (!results || results.length === 0) continue;

    const stats = {
      career_starts: results.length,
      career_wins: results.filter((r: Record<string, unknown>) => r.position === 1).length,
      career_podiums: results.filter(
        (r: Record<string, unknown>) =>
          typeof r.position === "number" && r.position >= 1 && r.position <= 3
      ).length,
      career_points: results.reduce(
        (sum: number, r: Record<string, unknown>) => sum + (typeof r.points === "number" ? r.points : 0),
        0
      ),
    };

    const { error } = await supabase
      .from("drivers")
      .update(stats)
      .eq("slug", slug);

    if (!error) updated.push(slug);
  }

  return updated;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch latest race results from Jolpica
    const res = await fetch(`${API_BASE}/current/last/results.json`);
    if (!res.ok) {
      throw new Error(`Jolpica API returned ${res.status}`);
    }
    const apiData: ApiResponse = await res.json();
    const races = apiData.MRData?.RaceTable?.Races ?? [];

    if (races.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No race data returned from API." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const race = races[0];
    const seasonYear = parseInt(race.season, 10);
    const round = parseInt(race.round, 10);

    // Check if this race already exists
    const { count } = await supabase
      .from("results")
      .select("id", { count: "exact", head: true })
      .eq("season_year", seasonYear)
      .eq("round", round)
      .eq("is_sprint", false);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Race already imported: ${race.raceName} (${seasonYear} R${round}), ${count} results exist.`,
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build rows
    const rows = dedup(buildRows([race], false));

    // Lookup foreign keys
    const driverSlugs = [...new Set(rows.map((r) => r.driver_slug as string))];
    const teamSlugs = [
      ...new Set(rows.map((r) => r.constructor_slug as string).filter(Boolean)),
    ];
    const [driverIdMap, teamIdMap, seasonIdMap] = await Promise.all([
      lookupDriverIds(supabase, driverSlugs),
      lookupTeamIds(supabase, teamSlugs),
      lookupSeasonIds(supabase, [seasonYear]),
    ]);

    for (const row of rows) {
      row.driver_id = driverIdMap.get(row.driver_slug as string) ?? null;
      row.team_id = teamIdMap.get(row.constructor_slug as string) ?? null;
      row.season_id = seasonIdMap.get(seasonYear) ?? null;
    }

    // Upsert results
    const { error } = await supabase
      .from("results")
      .upsert(rows, { onConflict: "slug" });

    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }

    // Update career stats for affected drivers
    const updatedDrivers = await updateCareerStats(supabase, driverSlugs);

    return new Response(
      JSON.stringify({
        success: true,
        race: race.raceName,
        season: seasonYear,
        round,
        results_imported: rows.length,
        drivers_stats_updated: updatedDrivers.length,
        driver_slugs: driverSlugs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
