# F1Rec Content Corpus Scraper — Architecture & n8n Workflow Spec

## Overview

The content corpus powers F1Rec's RAG-driven blog pipeline. n8n scrapes F1 and sim racing sources on a schedule, stores them in the `content_corpus` table, and the Ollama/Mistral pipeline uses them as context when generating articles via the style bible.

## Target: `content_corpus` table (already exists)

| Column | Type | Notes |
|---|---|---|
| id | uuid | Auto-generated |
| source | text | Source identifier (see below) |
| source_url | text | Original URL |
| title | text | Article/post title |
| body | text | Full text content |
| topic_tags | text[] | GIN-indexed array, e.g. `{'f1', 'hamilton', 'ferrari', '2026'}` |
| engagement_score | integer | Upvotes, likes, or estimated reach (0 if unknown) |
| scraped_at | timestamptz | When we scraped it |

## Sources & Frequencies

| Source ID | What | URL / Feed | Frequency | Method |
|---|---|---|---|---|
| `rss-therace` | The Race articles | `https://the-race.com/feed/` | Every 6 hours | n8n RSS Read node |
| `rss-racefans` | RaceFans articles | `https://www.racefans.net/feed/` | Every 6 hours | n8n RSS Read node |
| `rss-autosport` | Autosport articles | `https://www.autosport.com/rss/feed/all` | Every 6 hours | n8n RSS Read node |
| `rss-motorsport` | Motorsport.com | `https://www.motorsport.com/rss/all/news/` | Every 6 hours | n8n RSS Read node |
| `reddit-f1` | r/formula1 hot posts | Reddit JSON API | Every 4 hours | n8n HTTP Request |
| `reddit-simracing` | r/simracing hot posts | Reddit JSON API | Every 8 hours | n8n HTTP Request |
| `f1-official` | Formula1.com news | `https://www.formula1.com/en/latest/all` | Every 6 hours | n8n HTTP Request + HTML extract |
| `twitter` | Key F1 accounts | Manual/future | Manual for now | — |
| `manual` | Editor-added content | — | As needed | Direct Supabase insert |

## n8n Workflow Architecture

### Workflow 1: RSS Feed Scraper (runs every 6 hours)

```
Schedule Trigger (every 6h)
  → RSS Read (The Race feed)
  → RSS Read (RaceFans feed)
  → RSS Read (Autosport feed)
  → RSS Read (Motorsport.com feed)
  → Merge (combine all items)
  → For Each Item:
      → Set node: extract title, link, content/description, pubDate
      → Function node: generate topic_tags from title + content
          - Scan for driver names → tag with slug (e.g. 'hamilton', 'verstappen')
          - Scan for team names → tag with slug (e.g. 'ferrari', 'red-bull')
          - Scan for keywords → tag with topic ('regulations', 'penalty', 'qualifying', 'sprint', 'overtake-mode', 'sim-racing', 'setup')
          - Always add 'f1' tag
          - Add year tag ('2026')
      → Supabase node: UPSERT into content_corpus
          - Match on source_url (deduplicate)
          - Set source = feed identifier
          - Set engagement_score = 0 (RSS doesn't provide this)
          - Set scraped_at = now()
```

### Workflow 2: Reddit Scraper (runs every 4 hours for F1, 8 hours for sim racing)

```
Schedule Trigger (every 4h)
  → HTTP Request: https://www.reddit.com/r/formula1/hot.json?limit=25
  → Function node: parse response
      - Extract: title, selftext, url, permalink, score (upvotes), created_utc
      - Filter: score > 50 (skip low-engagement posts)
      - Skip: image-only posts (no selftext and url is i.redd.it/imgur)
  → For Each Item:
      → Set node: map to content_corpus schema
          - source = 'reddit-f1'
          - source_url = 'https://reddit.com' + permalink
          - title = post title
          - body = selftext (or title if link post)
          - engagement_score = score (upvotes)
          - topic_tags = auto-generated (same logic as RSS)
      → Supabase node: UPSERT on source_url
```

```
Schedule Trigger (every 8h)
  → HTTP Request: https://www.reddit.com/r/simracing/hot.json?limit=25
  → Same pipeline as above but:
      - source = 'reddit-simracing'
      - Filter: score > 30
      - Add 'sim-racing' to topic_tags always
      - Scan for brand names (simucube, moza, fanatec, heusinkveld, etc.)
```

### Workflow 3: Blog Article Generator (runs Monday + Thursday mornings)

This is the existing n8n v2 pipeline, enhanced with RAG context:

```
Schedule Trigger (Mon + Thu, 08:00 UTC)
  → Supabase node: SELECT from content_corpus
      - WHERE scraped_at > now() - interval '4 days'
      - ORDER BY engagement_score DESC
      - LIMIT 20
  → Function node: build context block
      - Concatenate top stories into a "recent news context" string
      - Group by topic for thematic clustering
  → Function node: select article type
      - If race happened in last 3 days → 'race-review'
      - If driver drama/news trending → 'driver-analysis'
      - If regulation/tech news → 'tech'
      - If historical anniversary → 'history'
      - Default → 'driver-analysis' or 'season-preview'
  → Ollama node (Mistral):
      - System prompt = f1rec-style-bible-v1.md content
      - User prompt = "Write a [category] article for F1Rec. Here is recent context: [context block]. Title should be punchy, under 70 chars. Write 600-1000 words."
  → Function node: parse response, extract title + body + category
  → Function node: generate slug from title
  → Supabase node: INSERT into posts
      - title, slug, body, category, published = true
      - published_at = now()
```

## Topic Tagging Logic (Function Node)

```javascript
function generateTags(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const tags = new Set(['f1']);
  
  // Drivers (2026 grid + legends)
  const drivers = {
    'norris': 'norris', 'piastri': 'piastri', 'hamilton': 'hamilton',
    'leclerc': 'leclerc', 'verstappen': 'verstappen', 'hadjar': 'hadjar',
    'russell': 'russell', 'antonelli': 'antonelli', 'alonso': 'alonso',
    'stroll': 'stroll', 'gasly': 'gasly', 'colapinto': 'colapinto',
    'sainz': 'sainz', 'albon': 'albon', 'ocon': 'ocon',
    'bearman': 'bearman', 'hulkenberg': 'hulkenberg', 'bortoleto': 'bortoleto',
    'lawson': 'lawson', 'lindblad': 'lindblad', 'bottas': 'bottas',
    'perez': 'perez', 'senna': 'senna', 'schumacher': 'schumacher',
    'prost': 'prost', 'fangio': 'fangio'
  };
  
  // Teams
  const teams = {
    'mclaren': 'mclaren', 'ferrari': 'ferrari', 'red bull': 'red-bull',
    'mercedes': 'mercedes', 'aston martin': 'aston-martin', 'alpine': 'alpine',
    'williams': 'williams', 'haas': 'haas', 'audi': 'audi',
    'racing bulls': 'racing-bulls', 'cadillac': 'cadillac'
  };
  
  // Topics
  const topics = {
    'qualifying': 'qualifying', 'sprint': 'sprint', 'practice': 'practice',
    'penalty': 'penalty', 'regulation': 'regulations', 'overtake mode': 'overtake-mode',
    'pit stop': 'pit-stop', 'safety car': 'safety-car', 'red flag': 'red-flag',
    'championship': 'championship', 'contract': 'contract', 'rookie': 'rookie',
    'sim rac': 'sim-racing', 'iracing': 'iracing', 'assetto': 'assetto-corsa',
    'setup': 'setup', 'pedal': 'pedals', 'wheel base': 'wheel-base',
    'direct drive': 'direct-drive', 'simucube': 'simucube', 'moza': 'moza',
    'fanatec': 'fanatec', 'heusinkveld': 'heusinkveld'
  };
  
  for (const [keyword, tag] of Object.entries(drivers)) {
    if (text.includes(keyword)) tags.add(tag);
  }
  for (const [keyword, tag] of Object.entries(teams)) {
    if (text.includes(keyword)) tags.add(tag);
  }
  for (const [keyword, tag] of Object.entries(topics)) {
    if (text.includes(keyword)) tags.add(tag);
  }
  
  // Year tags
  if (text.includes('2026')) tags.add('2026');
  if (text.includes('2025')) tags.add('2025');
  
  return Array.from(tags);
}
```

## Deduplication Strategy

- UPSERT on `source_url` — same URL never creates a duplicate row
- For Reddit: permalink is unique per post
- For RSS: article link is unique per article
- `scraped_at` updates on re-scrape so we know freshness

## Content Retention

- Keep everything indefinitely (corpus only grows)
- RAG queries filter by recency (last 4-7 days for article generation)
- Old content still useful for historical context and "on this day" features
- Consider a monthly cleanup of reddit posts with engagement_score < 10 after 30 days (future optimisation)

## Setup Steps

1. Open n8n (local instance)
2. Create Workflow 1 (RSS Feeds) — import or build manually using the nodes above
3. Create Workflow 2a (Reddit F1) and 2b (Reddit Sim Racing)
4. Test each workflow manually — verify rows appear in content_corpus
5. Activate schedules
6. Update Workflow 3 (existing blog pipeline) to pull RAG context from content_corpus before generating

## Supabase Connection in n8n

- Use the Supabase node with:
  - Host: `https://mezipswmplrcdbinwjwy.supabase.co`
  - Service role key (not anon key — needed for INSERT without RLS issues)
  - Get the service role key from Supabase Dashboard → Settings → API → service_role key

## Notes

- Reddit JSON API doesn't need auth for public subreddits, just append `.json` to any listing URL
- RSS feeds are public and don't need API keys
- The Race and Autosport feeds return full article content in `<content:encoded>` — use that, not the truncated `<description>`
- RaceFans feed may only include excerpts — store what's available, it's still useful for topic tagging
- Formula1.com doesn't have a public RSS feed — scraping their news page requires HTML parsing (lower priority, add later)
- Copyright note: We store content for internal RAG context only, never republish verbatim. Generated articles must be original (enforced by style bible)
