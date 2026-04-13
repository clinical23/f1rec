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
  position?: string;
  positionText?: string;
  points?: string;
  grid?: string;
  status?: string;
  Driver: {
    driverId: string;
    givenName?: string;
    familyName?: string;
  };
  Constructor?: {
    name?: string;
  };
  FastestLap?: {
    rank?: string;
    Time?: { time?: string };
  };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Fetch latest completed race results
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
    const raceName = race.raceName ?? "Unknown Grand Prix";

    if (!Number.isFinite(seasonYear) || !Number.isFinite(round)) {
      throw new Error("Invalid season or round received from Jolpica.");
    }

    // 2) Duplicate check by season + round
    const { count, error: countError } = await supabase
      .from("results")
      .select("season_year", { count: "exact", head: true })
      .eq("season_year", seasonYear)
      .eq("round", round);
    if (countError) {
      throw new Error(`Failed duplicate check: ${countError.message}`);
    }

    if (count && count > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Race already exists for ${seasonYear} round ${round}.`,
          season_year: seasonYear,
          round,
          race_name: raceName,
          existing_rows: count,
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = race.Results ?? [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          season_year: seasonYear,
          round,
          race_name: raceName,
          inserted: 0,
          message: "No finisher rows returned from Jolpica.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Lookup related IDs
    const driverSlugs = Array.from(
      new Set(results.map((r) => r.Driver?.driverId).filter(Boolean))
    ) as string[];
    const constructorNames = Array.from(
      new Set(results.map((r) => r.Constructor?.name).filter(Boolean))
    ) as string[];

    const [{ data: driverRows, error: driverLookupError }, { data: teamRows, error: teamLookupError }, { data: seasonRow, error: seasonLookupError }] = await Promise.all([
      supabase.from("drivers").select("id, slug").in("slug", driverSlugs),
      supabase.from("teams").select("id, name").in("name", constructorNames),
      supabase.from("seasons").select("id").eq("year", seasonYear).maybeSingle(),
    ]);

    if (driverLookupError) throw new Error(`Driver lookup failed: ${driverLookupError.message}`);
    if (teamLookupError) throw new Error(`Team lookup failed: ${teamLookupError.message}`);
    if (seasonLookupError) throw new Error(`Season lookup failed: ${seasonLookupError.message}`);

    const driverIdBySlug = new Map<string, string>();
    for (const row of driverRows ?? []) driverIdBySlug.set(row.slug, row.id);

    const teamIdByName = new Map<string, string>();
    for (const row of teamRows ?? []) teamIdByName.set(row.name, row.id);

    const seasonId = seasonRow?.id ?? null;

    // 3) Map API -> DB fields
    const rows = results.map((result) => {
      const position = parseInt(result.position ?? "", 10);
      const points = parseFloat(result.points ?? "");
      const grid = parseInt(result.grid ?? "", 10);
      const driverSlug = result.Driver.driverId;
      const constructorName = result.Constructor?.name ?? null;
      const driverName =
        `${result.Driver.givenName ?? ""} ${result.Driver.familyName ?? ""}`.trim() ||
        driverSlug;
      const slug = `${seasonYear}-${round}-${driverSlug}-${result.position ?? result.positionText ?? "na"}`;

      return {
        slug,
        race_slug: `${seasonYear}-${round}`,
        season_year: seasonYear,
        round,
        race_name: raceName,
        driver_name: driverName,
        driver_slug: driverSlug,
        constructor_name: constructorName,
        position: Number.isFinite(position) ? position : null,
        position_text: result.positionText ?? null,
        points: Number.isFinite(points) ? points : null,
        grid: Number.isFinite(grid) ? grid : null,
        status: result.status ?? null,
        fastest_lap_time: result.FastestLap?.Time?.time ?? null,
        fastest_lap_rank: result.FastestLap?.rank
          ? parseInt(result.FastestLap.rank, 10)
          : null,
        is_sprint: false,
        driver_id: driverIdBySlug.get(driverSlug) ?? null,
        team_id: constructorName ? (teamIdByName.get(constructorName) ?? null) : null,
        season_id: seasonId,
      };
    });

    const mappedDriverIds = rows.filter((row) => row.driver_id !== null).length;
    const mappedTeamIds = rows.filter((row) => row.team_id !== null).length;

    const { error: insertError } = await supabase
      .from("results")
      .insert(rows);

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    // 4) Return import summary
    return new Response(
      JSON.stringify({
        success: true,
        season_year: seasonYear,
        round,
        race_name: raceName,
        inserted: rows.length,
        mapped_driver_ids: mappedDriverIds,
        mapped_team_ids: mappedTeamIds,
        season_id_found: seasonId !== null,
        drivers_missing_id: rows
          .filter((row) => row.driver_id === null)
          .map((row) => row.driver_slug),
        teams_missing_id: rows
          .filter((row) => row.team_id === null)
          .map((row) => row.constructor_name),
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
