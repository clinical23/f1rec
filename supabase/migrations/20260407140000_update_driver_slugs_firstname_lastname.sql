-- Rebuild drivers.slug from first_name + last_name: lowercase, non-alphanumerics -> hyphens.
-- Examples: hamilton -> lewis-hamilton, alonso -> fernando-alonso (using name columns).
-- Also updates results.driver_slug from old slug -> new slug so seeded results still join drivers.

begin;

create temporary table _driver_slug_map (
  old_slug text not null primary key,
  new_slug text not null
);

with computed as (
  select
    slug as old_slug,
    case
      when coalesce(nullif(trim(first_name), ''), '') = ''
       and coalesce(nullif(trim(last_name), ''), '') = '' then slug
      else trim(
        both '-'
        from lower(
          regexp_replace(
            regexp_replace(
              coalesce(first_name, '') || '-' || coalesce(last_name, ''),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            ),
            '-+',
            '-',
            'g'
          )
        )
      )
    end as base_slug
  from public.drivers
),
numbered as (
  select
    old_slug,
    base_slug,
    row_number() over (
      partition by base_slug
      order by old_slug
    ) as rn
  from computed
)
insert into _driver_slug_map (old_slug, new_slug)
select
  old_slug,
  case
    when rn = 1 then base_slug
    else base_slug || '-' || rn::text
  end
from numbered;

-- Foreign data: race results still keyed by old Ergast-style slugs
update public.results r
set driver_slug = m.new_slug
from _driver_slug_map m
where r.driver_slug = m.old_slug;

-- Drivers: apply new slugs (unique by construction, including -2, -3 suffixes)
update public.drivers d
set slug = m.new_slug
from _driver_slug_map m
where d.slug = m.old_slug;

commit;
