begin;

create temporary table _race_slug_map (
  old_slug text not null primary key,
  new_slug text not null
);

with computed as (
  select
    slug as old_slug,
    case
      when coalesce(nullif(trim(name), ''), '') = '' then slug
      else lower(
        regexp_replace(
          regexp_replace(
            season_year::text || '-' || name,
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '(^-+|-+$)',
          '',
          'g'
        )
      )
    end as base_slug
  from public.races
),
numbered as (
  select
    old_slug,
    base_slug,
    row_number() over (partition by base_slug order by old_slug) as rn
  from computed
)
insert into _race_slug_map (old_slug, new_slug)
select
  old_slug,
  case
    when rn = 1 then base_slug
    else base_slug || '-' || rn::text
  end as new_slug
from numbered;

update public.results r
set race_slug = m.new_slug
from _race_slug_map m
where r.race_slug = m.old_slug;

update public.races r
set slug = m.new_slug
from _race_slug_map m
where r.slug = m.old_slug;

commit;
