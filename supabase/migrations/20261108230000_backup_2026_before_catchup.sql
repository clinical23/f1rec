-- Snapshot before the season catch-up job's first run (src/lib/jolpica/season-catchup.ts).
-- Applied to F1Rec (mezipswmplrcdbinwjwy) 8 Nov 2026 ~23:00 via the Supabase MCP.
-- Rows copied: 22 races (2026), 86 results (2026), 22 driver and 10 team standings rows (2026),
-- 818 drivers, 77 circuits. The backup schema isn't exposed to the API (no anon/authenticated access).
-- To restore, e.g. 2026 results:  delete from public.results where season_year = 2026;
--   insert into public.results select * from backup.results_2026_20261108;
-- To drop when no longer needed:  drop schema backup cascade;
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table backup.races_2026_20261108 as select * from public.races where season_year = 2026;
create table backup.results_2026_20261108 as select * from public.results where season_year = 2026;
create table backup.driver_season_stats_2026_20261108 as select * from public.driver_season_stats where season_id = (select id from public.seasons where year = 2026);
create table backup.team_season_stats_2026_20261108 as select * from public.team_season_stats where season_id = (select id from public.seasons where year = 2026);
create table backup.drivers_20261108 as select * from public.drivers;
create table backup.circuits_20261108 as select * from public.circuits;
revoke all on all tables in schema backup from public, anon, authenticated;
