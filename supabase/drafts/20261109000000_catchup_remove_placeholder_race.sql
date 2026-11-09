-- Season catch-up (src/lib/jolpica/season-catchup.ts): the one way the job removes a races row.
-- Only a placeholder (no results rows) can be removed, and it is copied to backup.races_removed first,
-- so any removal can be undone with:
--   insert into public.races select * from backup.races_removed where id = '<id>';
-- Callable by service_role only (the job's admin client); anon and authenticated cannot.
--
-- NOT APPLIED. Draft for T's decision: the database tool asks for confirmation before anything with a
-- delete in it, and nobody was there to answer (9 Nov 2026, ~00:05). Until it's applied the catch-up job
-- only lists placeholder races that aren't on the official calendar; it never deletes.
-- Backups already taken: backup.*_20261108 (2026 races, results and standings, all drivers and circuits).

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table if not exists backup.races_removed as select * from public.races with no data;
alter table backup.races_removed add column if not exists removed_at timestamptz default now();
revoke all on backup.races_removed from public, anon, authenticated;

create or replace function public.catchup_remove_placeholder_race(p_race_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.results where race_id = p_race_id) then
    raise exception 'race % has results; not removing', p_race_id;
  end if;
  insert into backup.races_removed select r.*, now() from public.races r where r.id = p_race_id;
  delete from public.races where id = p_race_id;
end;
$$;

revoke all on function public.catchup_remove_placeholder_race(uuid) from public, anon, authenticated;
grant execute on function public.catchup_remove_placeholder_race(uuid) to service_role;
