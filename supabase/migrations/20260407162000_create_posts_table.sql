begin;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  category text check (category in ('race-review', 'driver-analysis', 'season-preview', 'history', 'tech')),
  author text default 'F1Rec Editorial',
  published_at timestamptz default now(),
  updated_at timestamptz default now(),
  related_race_slug text references public.races(slug),
  related_driver_slug text references public.drivers(slug),
  is_published boolean default false,
  reading_time_minutes integer,
  og_image_url text,
  meta_description text,
  view_count integer default 0,
  featured boolean default false
);

insert into public.posts (
  slug,
  title,
  excerpt,
  content,
  category,
  related_race_slug,
  related_driver_slug,
  is_published,
  reading_time_minutes,
  og_image_url,
  meta_description,
  featured
) values
(
  '2024-bahrain-grand-prix-race-review-red-bulls-baseline',
  '2024 Bahrain GP Race Review: Red Bull''s Baseline Is Everyone Else''s Ceiling',
  'Bahrain showed where the 2024 competitive line really is: Red Bull in clear air, Ferrari closest over one lap, and a midfield compressed by tyre management.',
  '# Red Bull''s Baseline Is Everyone Else''s Ceiling

The opening race in Bahrain did not just deliver a winner. It delivered a benchmark. Max Verstappen controlled the Grand Prix from the launch, managed the tyre windows without visible stress, and still had margin left when strategy tightened behind him.

Ferrari''s race pace was the most significant positive relative to expectation. Over one lap, the SF-24 looked cleaner at corner entry than late 2023 trim, and in race conditions both Ferraris could sustain competitive lap-time without the abrupt thermal drop-offs that repeatedly hurt them last season.

Mercedes and McLaren, by contrast, looked like teams still defining their mechanical platform limits. The W15 had flashes in medium-speed sections but lacked consistency over stints. McLaren''s floor and rear-stability package was competitive in clean air but vulnerable once locked into traffic.

### The strategic hinge: tyre life, not headline pace

Bahrain remains one of the best early-season tests because it punishes imbalance quickly. Cars that overwork the rear axle in traction zones lose race shape within six to eight laps.

Red Bull''s advantage was less about absolute peak pace and more about degradation control. Their stints remained operationally simple. Others needed offsets, undercut pressure, or traffic luck to generate equivalent lap-time.

### What the midfield tells us

The midfield spread looked narrow on paper and wider in execution. Haas overperformed in race rhythm versus qualifying expectation. Aston Martin looked operationally tidy but not explosive. Alpine''s opening weekend exposed a larger aerodynamic deficit than anticipated.

### Early championship takeaway

One race never settles a season. But it can establish the direction of travel. Bahrain indicated Red Bull has carried over technical stability, Ferrari has made meaningful race-day progress, and the chasers must solve degradation before they solve outright speed.',
  'race-review',
  '2024-bahrain-grand-prix',
  'max-verstappen',
  true,
  8,
  'https://images.unsplash.com/photo-1541773367336-d14f4f8ec5a6?auto=format&fit=crop&w=1600&q=80',
  'A data-driven breakdown of the 2024 Bahrain Grand Prix, including pace deltas, tyre behaviour, and what it means for the title race.',
  true
),
(
  'max-verstappen-2024-dominance-in-three-numbers',
  'Max Verstappen''s 2024 Dominance in Three Numbers',
  'Beyond race wins, Verstappen''s 2024 edge is built on qualifying control, stint consistency, and low-variance execution under pressure.',
  '# Verstappen''s 2024 Dominance in Three Numbers

Max Verstappen''s 2024 season can be read through one simple lens: he has reduced variance to almost zero. When rivals have spikes, he has a floor. And in modern Formula 1, the floor usually wins championships.

### 1) Qualifying conversion pressure

Pole position still matters, but conversion quality matters more. Verstappen has repeatedly turned front-row starts into race-shaping first stints, forcing rivals into reactive strategy trees by Lap 10.

### 2) Stint-to-stint consistency

The defining trait in 2024 has been repeatability. Across hard and medium compounds, Verstappen''s lap-time drop has been less volatile than direct rivals, especially in the final third of race stints.

That consistency gives Red Bull tactical flexibility. They can extend for clean air, cover undercuts late, or absorb neutralisations without destabilising tyre targets.

### 3) Error-free race craft

Dominance is often framed as car plus speed. In reality, it is speed plus low operational entropy. Verstappen''s starts, traffic phase management, and restart timing have remained elite. Very few points are left on the table.

### Why this matters for the title race

To beat a driver operating at this level, rivals need two things at once: a faster package and a cleaner weekend. In 2024, most competitors have delivered one or the other, but rarely both. Until that changes, Verstappen''s championship control remains structurally strong.',
  'driver-analysis',
  null,
  'max-verstappen',
  true,
  7,
  'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=1600&q=80',
  'A focused driver analysis of Max Verstappen in 2024 through qualifying conversion, stint consistency, and race execution.',
  false
),
(
  'senna-vs-prost-rivalry-that-rewired-f1',
  'Senna vs Prost: The Rivalry That Rewired Formula 1',
  'From McLaren''s civil war to Suzuka flashpoints, Senna-Prost became the defining political and sporting rivalry of modern F1.',
  '# Senna vs Prost: The Rivalry That Rewired Formula 1

Formula 1 has had many rivalries. None carried the same blend of technical excellence, ideological contrast, and institutional fallout as Ayrton Senna versus Alain Prost.

At McLaren in 1988 and 1989, they shared the most complete car on the grid and radically different approaches to speed. Prost was analytical, strategic, and often conservative with risk. Senna was explosive, instinctive, and willing to live on the edge of adhesion and consequence.

### 1989 and 1990: Suzuka as inflection point

The collisions at Suzuka in consecutive seasons did more than decide titles. They triggered global arguments about stewarding consistency, driver ethics, and the role of governing politics in championship outcomes.

For many teams, those seasons changed how contracts were written, how intra-team governance was structured, and how sporting disputes were escalated.

### Technical context often gets lost

This rivalry unfolded during a period of rapid technical transition: turbo-to-naturally aspirated regulations, changing tyre behaviours, and a paddock professionalising data usage. Senna and Prost were not just personalities. They were reference points for two ways of driving and developing cars.

### The modern legacy

Today''s title fights still echo Senna-Prost themes: teammate management, off-track politics, and narrative pressure shaping on-track decisions. Their rivalry did not just define an era. It rewired how Formula 1 understands elite competition.',
  'history',
  null,
  null,
  true,
  9,
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80',
  'A historical analysis of the Senna-Prost rivalry and how it transformed sporting governance, team dynamics, and modern title fights.',
  false
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  category = excluded.category,
  related_race_slug = excluded.related_race_slug,
  related_driver_slug = excluded.related_driver_slug,
  is_published = excluded.is_published,
  reading_time_minutes = excluded.reading_time_minutes,
  og_image_url = excluded.og_image_url,
  meta_description = excluded.meta_description,
  featured = excluded.featured,
  updated_at = now();

commit;
