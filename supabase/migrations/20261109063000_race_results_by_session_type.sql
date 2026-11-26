-- Race-only reads now say session_type = 'race' instead of is_sprint = false.
-- Why: results also holds qualifying rows (is_sprint = false) since the per-session sync (Prompt 57) and the
-- season catch-up, so "is_sprint = false" counted qualifying P1s as wins and podiums and listed qualifying
-- rows as race results. Before 2026 every row is session_type 'race' with is_sprint false (checked 9 Nov
-- 2026: 26,269 race, 413 qualifying, 132 sprint), so historical numbers don't change.
-- Changes: views v_constructor_leaderboard and v_race_results, function get_race_factsheet. Definitions are
-- rewritten in place from their current text (options, owner and grants kept).
-- Applied to F1Rec (mezipswmplrcdbinwjwy) 9 Nov 2026 ~06:35.
-- Undo: the same block with the two replace() strings swapped.
do $$
declare
  v text;
  def text;
begin
  foreach v in array array['v_constructor_leaderboard', 'v_race_results'] loop
    def := pg_get_viewdef(('public.' || v)::regclass);
    if position('is_sprint = false' in def) = 0 then
      raise notice '% has no is_sprint = false; left alone', v;
      continue;
    end if;
    def := replace(def, 'is_sprint = false', 'session_type = ''race''');
    execute format('create or replace view public.%I with (security_invoker = on) as %s', v, def);
  end loop;

  def := pg_get_functiondef('public.get_race_factsheet'::regproc);
  if position('is_sprint = false' in def) > 0 then
    execute replace(def, 'is_sprint = false', 'session_type = ''race''');
  end if;
end $$;
