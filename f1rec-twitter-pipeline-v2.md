# F1REC TWITTER PIPELINE — n8n Workflow Build Guide v2
# Target: Miami GP, May 1-3 2026
# Version: 2.0 — Manual approval mode
# Updated: 15 April 2026 — Driver numbers confirmed from OpenF1 session 11261 (Japan R3)
# Save to desktop. Build in n8n on sim rig.

---

## OVERVIEW

Phase 1 (manual approval) Twitter pipeline. During a race session, it:
1. Checks if a session is active (short-circuits if not)
2. Polls OpenF1 for live position/timing/pit/race-control data every 15 seconds
3. Detects events (overtakes, pit stops, safety cars, lead changes, milestones)
4. Queries F1Rec Supabase for historical context via RPC function
5. Generates a tweet via Ollama/Mistral
6. Sends to manual approval queue (n8n Wait node)
7. You approve → posts to @F1RecStats → logs to tweets_log table

```
Schedule Trigger (15s)
    → HTTP Request: OpenF1 /sessions (active check)
    → IF: Session active?
        → NO → End
        → YES → HTTP Requests (parallel):
                  /position
                  /race_control
                  /pit
               → Code Node: Compare to last state, detect events, dedup, cooldown
               → IF: Event detected + cooldown clear?
                   → YES → HTTP Request: Supabase RPC get_driver_context()
                          → HTTP Request: Ollama generate tweet
                          → Code: Format + validate tweet
                          → Wait: Manual approval (5min timeout)
                          → X Create Tweet: Post to @F1RecStats
                          → HTTP Request: Log to tweets_log
                   → NO → End
```

---

## WHAT YOU ALREADY HAVE WORKING

- [x] n8n installed locally on sim rig
- [x] "My workflow 2": Manual Trigger → X Create Tweet → verified posting
- [x] OAuth 1.0a credentials connected (Consumer Key/Secret + Access Token/Secret)
- [x] $5 X API credits loaded (billing Apr 14 – May 14)
- [x] OpenF1 Sponsor tier (€9.90/mo) — 6 req/s, WebSocket available
- [x] Ollama running with Mistral model
- [x] Supabase with 25,883+ results for historical context
- [x] Style bible written

---

## CONFIRMED 2026 DRIVER NUMBERS (from OpenF1 session 11261)

| # | Driver | Team | Acronym |
|---|---|---|---|
| 1 | Norris | McLaren | NOR |
| 3 | Verstappen | Red Bull Racing | VER |
| 5 | Bortoleto | Audi | BOR |
| 6 | Hadjar | Red Bull Racing | HAD |
| 10 | Gasly | Alpine | GAS |
| 11 | Perez | Cadillac | PER |
| 12 | Antonelli | Mercedes | ANT |
| 14 | Alonso | Aston Martin | ALO |
| 16 | Leclerc | Ferrari | LEC |
| 18 | Stroll | Aston Martin | STR |
| 23 | Albon | Williams | ALB |
| 27 | Hulkenberg | Audi | HUL |
| 30 | Lawson | Racing Bulls | LAW |
| 31 | Ocon | Haas F1 Team | OCO |
| 41 | Lindblad | Racing Bulls | LIN |
| 43 | Colapinto | Alpine | COL |
| 44 | Hamilton | Ferrari | HAM |
| 55 | Sainz | Williams | SAI |
| 63 | Russell | Mercedes | RUS |
| 77 | Bottas | Cadillac | BOT |
| 81 | Piastri | McLaren | PIA |
| 87 | Bearman | Haas F1 Team | BEA |

---

## NODE-BY-NODE SPEC

### Node 1: Schedule Trigger
- Type: Schedule Trigger
- Interval: **Every 15 seconds**
- Active: Only enable manually during race sessions
- **IMPORTANT:** Disable between sessions. Consider using n8n's "Active" toggle.

### Node 2: HTTP Request — Session Check
```
Method: GET
URL: https://api.openf1.org/v1/sessions?session_key=latest
```
This returns the current/most recent session. Check `status` field — if no session is live, end workflow immediately.

### Node 3: IF — Session Active?
```
Condition: {{ $json[0].status }} equals "Started" OR "Active"
True → continue to data polling
False → End (no active session)
```

### Node 4a: HTTP Request — OpenF1 Positions
```
Method: GET
URL: https://api.openf1.org/v1/position?session_key=latest
```

### Node 4b: HTTP Request — OpenF1 Race Control (parallel with 4a)
```
Method: GET
URL: https://api.openf1.org/v1/race_control?session_key=latest
```

### Node 4c: HTTP Request — OpenF1 Pit Stops (parallel with 4a)
```
Method: GET
URL: https://api.openf1.org/v1/pit?session_key=latest
```

### Node 5: Code Node — Event Detection (THE BRAIN)

```javascript
// ============================================================
// F1REC EVENT DETECTION — v2
// Compares current state to previous poll, emits tweet-worthy events
// ============================================================

const currentPositions = $('HTTP Request - Positions').all().map(item => item.json);
const raceControl = $('HTTP Request - Race Control').all().map(item => item.json);
const pits = $('HTTP Request - Pits').all().map(item => item.json);

const staticData = $getWorkflowStaticData('global');
const prevPositions = staticData.lastPositions || [];
const prevRaceControl = staticData.lastRaceControl || [];
const prevPits = staticData.lastPits || [];

const events = [];

// --- CONFIRMED 2026 DRIVER MAP (from OpenF1 session 11261) ---
const driverMap = {
  1:  { name: 'Norris',      team: 'McLaren',       slug: 'lando-norris' },
  3:  { name: 'Verstappen',  team: 'Red Bull',      slug: 'max-verstappen' },
  5:  { name: 'Bortoleto',   team: 'Audi',          slug: 'gabriel-bortoleto' },
  6:  { name: 'Hadjar',      team: 'Red Bull',      slug: 'isack-hadjar' },
  10: { name: 'Gasly',       team: 'Alpine',        slug: 'pierre-gasly' },
  11: { name: 'Perez',       team: 'Cadillac',      slug: 'sergio-perez' },
  12: { name: 'Antonelli',   team: 'Mercedes',      slug: 'kimi-antonelli' },
  14: { name: 'Alonso',      team: 'Aston Martin',  slug: 'fernando-alonso' },
  16: { name: 'Leclerc',     team: 'Ferrari',       slug: 'charles-leclerc' },
  18: { name: 'Stroll',      team: 'Aston Martin',  slug: 'lance-stroll' },
  23: { name: 'Albon',       team: 'Williams',      slug: 'alexander-albon' },
  27: { name: 'Hulkenberg',  team: 'Audi',          slug: 'nico-hulkenberg' },
  30: { name: 'Lawson',      team: 'Racing Bulls',  slug: 'liam-lawson' },
  31: { name: 'Ocon',        team: 'Haas',          slug: 'esteban-ocon' },
  41: { name: 'Lindblad',    team: 'Racing Bulls',  slug: 'arvid-lindblad' },
  43: { name: 'Colapinto',   team: 'Alpine',        slug: 'franco-colapinto' },
  44: { name: 'Hamilton',    team: 'Ferrari',        slug: 'lewis-hamilton' },
  55: { name: 'Sainz',       team: 'Williams',      slug: 'carlos-sainz' },
  63: { name: 'Russell',     team: 'Mercedes',      slug: 'george-russell' },
  77: { name: 'Bottas',      team: 'Cadillac',      slug: 'valtteri-bottas' },
  81: { name: 'Piastri',     team: 'McLaren',       slug: 'oscar-piastri' },
  87: { name: 'Bearman',     team: 'Haas',          slug: 'oliver-bearman' },
};

const getDriver = (num) => driverMap[num] || { name: `#${num}`, team: 'Unknown', slug: '' };

// --- DEDUPLICATION GUARD ---
const now = Date.now();
if (!staticData.recentEvents) staticData.recentEvents = [];
// Clean events older than 90 seconds
staticData.recentEvents = staticData.recentEvents.filter(e => now - e.ts < 90000);

const isDuplicate = (key) => staticData.recentEvents.some(e => e.key === key);
const markEvent = (key) => staticData.recentEvents.push({ key, ts: now });

// --- COOLDOWN: Max 1 tweet per 2 minutes ---
const lastTweetTime = staticData.lastTweetTime || 0;
const cooldownMs = 120000; // 2 minutes
const cooldownActive = (now - lastTweetTime) < cooldownMs;

// --- OVERTAKE DETECTION ---
for (const curr of currentPositions) {
  const prev = prevPositions.find(p => p.driver_number === curr.driver_number);
  if (!prev) continue;
  
  if (curr.position < prev.position) {
    const gained = prev.position - curr.position;
    // Top 10 moves or 3+ positions gained outside top 10
    if (curr.position <= 10 || gained >= 3) {
      const driver = getDriver(curr.driver_number);
      const overtaken = currentPositions.find(p => p.position === prev.position);
      const overtakenDriver = overtaken ? getDriver(overtaken.driver_number) : null;
      
      const eventKey = `overtake-${driver.name}-P${curr.position}`;
      if (!isDuplicate(eventKey)) {
        markEvent(eventKey);
        events.push({
          type: 'overtake',
          driver: driver.name,
          driverSlug: driver.slug,
          team: driver.team,
          from: prev.position,
          to: curr.position,
          gained,
          overtakenDriver: overtakenDriver?.name || 'unknown',
          overtakenSlug: overtakenDriver?.slug || '',
          priority: curr.position <= 3 ? 'high' : 'medium'
        });
      }
    }
  }
}

// --- LEADER CHANGE DETECTION ---
const currentLeader = currentPositions.find(p => p.position === 1);
const prevLeader = prevPositions.find(p => p.position === 1);
if (currentLeader && prevLeader && currentLeader.driver_number !== prevLeader.driver_number) {
  const newLeader = getDriver(currentLeader.driver_number);
  const oldLeader = getDriver(prevLeader.driver_number);
  const eventKey = `lead-${newLeader.name}`;
  if (!isDuplicate(eventKey)) {
    markEvent(eventKey);
    events.push({
      type: 'lead-change',
      driver: newLeader.name,
      driverSlug: newLeader.slug,
      team: newLeader.team,
      previousLeader: oldLeader.name,
      previousLeaderSlug: oldLeader.slug,
      priority: 'high'
    });
  }
}

// --- SAFETY CAR / RED FLAG / VSC DETECTION ---
const newRCMessages = raceControl.filter(msg => {
  return !prevRaceControl.some(prev => prev.date === msg.date);
});

for (const msg of newRCMessages) {
  const msgText = msg.message || '';
  if (msg.category === 'SafetyCar' || msgText.includes('SAFETY CAR')) {
    const eventKey = `sc-${msg.date}`;
    if (!isDuplicate(eventKey)) {
      markEvent(eventKey);
      events.push({ type: 'safety-car', message: msgText, priority: 'high' });
    }
  }
  if (msg.category === 'Flag' && msg.flag === 'RED') {
    const eventKey = `red-${msg.date}`;
    if (!isDuplicate(eventKey)) {
      markEvent(eventKey);
      events.push({ type: 'red-flag', message: msgText, priority: 'high' });
    }
  }
  if (msgText.includes('VIRTUAL SAFETY CAR')) {
    const eventKey = `vsc-${msg.date}`;
    if (!isDuplicate(eventKey)) {
      markEvent(eventKey);
      events.push({ type: 'vsc', message: msgText, priority: 'medium' });
    }
  }
  // Retirement detection
  if (msgText.includes('RETIRED') || msgText.includes('OUT OF THE RACE')) {
    // Try to extract driver number from message
    const numMatch = msgText.match(/CAR (\d+)/);
    if (numMatch) {
      const driver = getDriver(parseInt(numMatch[1]));
      const eventKey = `ret-${driver.name}`;
      if (!isDuplicate(eventKey)) {
        markEvent(eventKey);
        events.push({
          type: 'retirement',
          driver: driver.name,
          driverSlug: driver.slug,
          team: driver.team,
          message: msgText,
          priority: driver.name === 'Hamilton' || driver.name === 'Verstappen' || driver.name === 'Norris' ? 'high' : 'medium'
        });
      }
    }
  }
}

// --- PIT STOP DETECTION ---
const newPits = pits.filter(p => !prevPits.some(pp => pp.date === p.date && pp.driver_number === p.driver_number));

for (const pit of newPits) {
  const driver = getDriver(pit.driver_number);
  const duration = pit.pit_duration;
  // Only tweet pit stops for top 5 drivers, or slow/fast stops
  const currentPos = currentPositions.find(p => p.driver_number === pit.driver_number);
  const isTopDriver = currentPos && currentPos.position <= 5;
  const isInteresting = duration > 5.0 || duration < 2.0; // Slow stop or incredibly fast
  
  if (isTopDriver || isInteresting) {
    const eventKey = `pit-${driver.name}-${pit.lap_number}`;
    if (!isDuplicate(eventKey)) {
      markEvent(eventKey);
      events.push({
        type: 'pit-stop',
        driver: driver.name,
        driverSlug: driver.slug,
        team: driver.team,
        lap: pit.lap_number,
        duration: duration,
        priority: isInteresting ? 'medium' : 'low'
      });
    }
  }
}

// --- STORE CURRENT STATE ---
staticData.lastPositions = currentPositions;
staticData.lastRaceControl = raceControl;
staticData.lastPits = pits;

// --- PRIORITY SORT + COOLDOWN FILTER ---
if (cooldownActive && events.length > 0) {
  // Only let through 'high' priority events during cooldown
  const highPriority = events.filter(e => e.priority === 'high');
  if (highPriority.length > 0) {
    // Pick the single highest-priority event
    return [{ json: highPriority[0] }];
  }
  // All events are medium/low and we're in cooldown — skip
  return [];
}

if (events.length === 0) return [];

// Sort: high > medium > low
const priorityOrder = { high: 0, medium: 1, low: 2 };
events.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

// Return only the top event (one tweet at a time)
return [{ json: events[0] }];
```

### Node 6: IF — Event Detected?
```
Condition: {{ $json.type }} is not empty
True → continue to Supabase
False → End
```

### Node 7: HTTP Request — Supabase Historical Context

**PREREQUISITE:** Create the `get_driver_context` RPC function in Supabase first (see SETUP section below).

```
Method: POST
URL: https://mezipswmplrcdbinwjwy.supabase.co/rest/v1/rpc/get_driver_context
Headers:
  apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg
  Content-Type: application/json
Body (JSON):
  { "p_slug": "{{ $json.driverSlug }}" }
```

Returns: `{ career_wins, career_podiums, career_starts, championships, season_wins, season_podiums, season_points, season_position }`

If event has no driverSlug (e.g., safety car), skip this node via an IF check.

### Node 8: HTTP Request — Ollama Tweet Generation

```
Method: POST
URL: http://localhost:11434/api/generate
Headers: Content-Type: application/json
Body:
{
  "model": "mistral",
  "prompt": "<<BUILT BY CODE NODE BELOW>>",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_predict": 100
  }
}
```

### Node 8a: Code Node — Build Ollama Prompt

```javascript
const event = $('Code - Event Detection').first().json;
const context = $('HTTP Request - Supabase Context').first()?.json || {};

let eventDetail = '';
switch (event.type) {
  case 'overtake':
    eventDetail = `${event.driver} overtakes ${event.overtakenDriver} for P${event.to} (was P${event.from})`;
    break;
  case 'lead-change':
    eventDetail = `${event.driver} takes the lead from ${event.previousLeader}`;
    break;
  case 'safety-car':
    eventDetail = `Safety car deployed: ${event.message}`;
    break;
  case 'red-flag':
    eventDetail = `RED FLAG: ${event.message}`;
    break;
  case 'vsc':
    eventDetail = `Virtual safety car: ${event.message}`;
    break;
  case 'retirement':
    eventDetail = `${event.driver} retires from the race: ${event.message}`;
    break;
  case 'pit-stop':
    eventDetail = `${event.driver} pits on lap ${event.lap} — ${event.duration}s stop`;
    break;
}

let contextStr = '';
if (context.career_wins !== undefined) {
  contextStr = `Career: ${context.career_wins} wins, ${context.career_podiums} podiums, ${context.championships} titles, ${context.career_starts} starts. `;
  if (context.season_wins !== undefined) {
    contextStr += `2026 season: ${context.season_wins} wins, ${context.season_points} pts (P${context.season_position}).`;
  }
}

const prompt = `You are @F1RecStats, the Twitter account for F1Rec — a Formula 1 statistics platform.

Generate a single tweet (max 280 characters) about this live F1 event.

RULES:
- Data-first. Lead with the specific stat or number.
- Use driver SURNAMES only (Antonelli not Kimi, Hamilton not Lewis).
- Slightly irreverent tone — like a knowledgeable mate, not a press release.
- Include historical context when provided.
- No hashtags.
- No emojis except 🏎️ or 🏆 and only if they genuinely add something.
- Never use: "incredible", "stunning", "game-changer", "what a race", "scenes".
- Never start with "Breaking:" or "JUST IN:".
- 2026 has Overtake Mode, NOT DRS. Never mention DRS.
- Max 280 characters. Count carefully.

EVENT TYPE: ${event.type}
DRIVER: ${event.driver} (${event.team})
DETAIL: ${eventDetail}
HISTORICAL CONTEXT: ${contextStr || 'None available'}

Generate the tweet (max 280 characters, no explanation, just the tweet text):`;

return [{ json: { prompt, event } }];
```

### Node 9: Code Node — Format + Validate Tweet

```javascript
const generated = $input.first().json.response;
const event = $input.first().json.event || $('Code - Build Prompt').first().json.event;

let tweet = generated
  .replace(/^["']|["']$/g, '')
  .replace(/\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Hard 280 char limit
if (tweet.length > 280) {
  tweet = tweet.substring(0, 277) + '...';
}

// Validation checks
const banned = ['incredible', 'stunning', 'game-changer', 'what a race', 'scenes', 'Breaking:', 'JUST IN:', 'DRS'];
const hasBanned = banned.some(word => tweet.toLowerCase().includes(word.toLowerCase()));

if (hasBanned) {
  // Log but don't post — skip to end
  return [{ json: { tweet, valid: false, reason: 'Contains banned word', eventType: event.type } }];
}

// Mark tweet time for cooldown
const staticData = $getWorkflowStaticData('global');
staticData.lastTweetTime = Date.now();

return [{
  json: {
    tweet,
    valid: true,
    eventType: event.type,
    priority: event.priority,
    driver: event.driver,
    driverSlug: event.driverSlug,
    timestamp: new Date().toISOString()
  }
}];
```

### Node 10: IF — Tweet Valid?
```
Condition: {{ $json.valid }} equals true
True → continue to approval
False → End
```

### Node 11: Wait — Manual Approval

```
Type: Wait
Resume: On webhook call
Webhook URL: auto-generated by n8n
Timeout: 5 minutes (auto-skip if not approved in time)
```

**Before the Wait node**, add a notification:
- Option A: HTTP Request to Telegram bot (recommended — fast on phone)
- Option B: HTTP Request to Discord webhook
- Option C: HTTP Request to Pushover

The notification should include:
- The tweet text
- The event type
- The approval webhook URL (so you can tap to approve)

### Node 12: X Create Tweet

Use the existing working "X Create Tweet" node from "My workflow 2". Same OAuth 1.0a credentials.

```
Text: {{ $json.tweet }}
```

### Node 13: HTTP Request — Log to tweets_log

```
Method: POST
URL: https://mezipswmplrcdbinwjwy.supabase.co/rest/v1/tweets_log
Headers:
  apikey: <<anon key>>
  Authorization: Bearer <<anon key>>
  Content-Type: application/json
  Prefer: return=minimal
Body:
{
  "tweet_text": "{{ $json.tweet }}",
  "event_type": "{{ $json.eventType }}",
  "session_type": "race",
  "driver_slugs": ["{{ $json.driverSlug }}"],
  "approved": true,
  "posted_at": "{{ $json.timestamp }}"
}
```

---

## TWEET GENERATION SYSTEM PROMPT

(Embedded in Node 8a above. Same as v1 but with 2026 vocabulary corrections.)

---

## EXAMPLE TWEETS

**Overtake for lead:**
"Antonelli past Leclerc for the lead at Miami. His 4th overtake on Charles this season — more than any other driver on the 2026 grid."

**Pit stop:**
"Hamilton pits on lap 18. That's 4 laps earlier than his average hard stint this season. Ferrari going aggressive on the undercut."

**Safety car:**
"Safety car at Miami. The race leader has won from a late SC at this circuit in 3 of the last 5 races. Advantage Russell."

**Leader change:**
"Russell leads. First time a Mercedes has led at Miami since 2023. 14 different leaders in the last 20 races at this circuit."

**Retirement:**
"Verstappen retires at Miami. 7 consecutive races without a win — longest drought since 2020. Red Bull's season going from bad to worse."

**Fast pit stop:**
"McLaren pit Norris in 1.9 seconds. That's the fastest stop of the 2026 season so far."

---

## SUPABASE SETUP (run before building workflow)

### 1. Create `get_driver_context` RPC function

```sql
CREATE OR REPLACE FUNCTION get_driver_context(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'career_wins', d.career_wins,
    'career_podiums', d.career_podiums,
    'career_starts', d.career_starts,
    'championships', d.championships,
    'full_name', d.full_name,
    'season_wins', COALESCE(dss.wins, 0),
    'season_podiums', COALESCE(dss.podiums, 0),
    'season_points', COALESCE(dss.points, 0),
    'season_position', COALESCE(dss.championship_position, 0)
  )
  FROM drivers d
  LEFT JOIN driver_season_stats dss ON dss.driver_id = d.id
  LEFT JOIN seasons s ON s.id = dss.season_id AND s.year = 2026
  WHERE d.slug = p_slug
  LIMIT 1;
$$;
```

### 2. Create `tweets_log` table

```sql
CREATE TABLE tweets_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_text text NOT NULL,
  tweet_id text,
  event_type text,
  session_type text,
  race_slug text,
  driver_slugs text[],
  approved boolean DEFAULT false,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: only service role can write (n8n uses anon key, so add INSERT policy)
ALTER TABLE tweets_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert" ON tweets_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select" ON tweets_log FOR SELECT TO anon USING (true);
```

---

## MIAMI GP SCHEDULE (BST = UTC+1)

| Session | Date | Time (BST) | Pipeline Mode |
|---|---|---|---|
| FP1 | Fri 1 May | 18:30–19:30 | **Silent test** — generate tweets, don't post. Review quality. |
| FP2 | Fri 1 May | 22:00–23:00 | Silent test round 2. Tune Ollama prompt. |
| FP3 | Sat 2 May | 17:30–18:30 | Optional — test if needed |
| Qualifying | Sat 2 May | 21:00–22:00 | **LIVE with manual approval.** Target: 5-8 tweets. |
| Race | Sun 3 May | 21:00–23:00 | **LIVE with manual approval.** Target: 10-15 tweets. |

**Silent mode:** Run the full pipeline but disconnect the X Create Tweet node. Review generated tweets in n8n execution logs.

---

## SETUP CHECKLIST

Before Miami GP weekend:

- [x] Twitter account @F1RecStats created
- [x] Twitter Developer API keys generated + connected to n8n
- [x] $5 API credits loaded
- [x] OpenF1 Sponsor tier active
- [x] Ollama/Mistral running on sim rig
- [ ] `tweets_log` table created in Supabase
- [ ] `get_driver_context()` function created in Supabase
- [ ] n8n workflow built with all nodes
- [ ] Driver number map verified (✅ done — this doc)
- [ ] Test OpenF1 endpoints return data during next live session
- [ ] Approval notification channel set up (Telegram recommended)
- [ ] Dry run with mock event data (manual trigger + fake position change)
- [ ] Silent test during FP1 (May 1)

---

## CHANGES FROM v1

| # | Change | Why |
|---|---|---|
| 1 | 8 driver numbers corrected | Norris=#1, Verstappen=#3, Piastri=#81, Bearman=#87, etc. |
| 2 | 30s → 15s polling | Catch events faster. Sponsor tier has headroom (6 req/s). |
| 3 | Session check at workflow start | Prevents wasted requests on off-days. |
| 4 | Supabase query → RPC function | PostgREST can't do subqueries. Single RPC call returns all context. |
| 5 | Dropped `f1rec.com` from tweet text | Saves 13 chars. URL is in bio + pinned tweet. |
| 6 | Added dedup guard | Prevents double-tweeting the same event. |
| 7 | Added pit stop detection | Was in overview but missing from code. |
| 8 | Added retirement detection | From race_control messages. |
| 9 | Added 2-min cooldown + priority queue | Prevents tweet spam during hectic moments. |
| 10 | Added `tweets_log` table | Post-race analysis of what was posted. |

---

## REFERENCE FILES ON DESKTOP

| File | Purpose |
|---|---|
| `f1rec-twitter-pipeline-v2.md` | **THIS FILE** — updated n8n build guide |
| `f1rec-twitter-pipeline-v1.md` | ARCHIVED — original spec |
| `f1rec-live-pipeline-spec-v1.md` | Full architecture (Twitter + Twitch + AI chat) |
| `f1rec-style-bible-v1.md` | Voice/tone rules |
| `f1rec-twitter-keys.txt` | X API credentials (keep secure) |

---
*Build in n8n on sim rig. Test during FP1 May 1st. Go live for Qualifying May 2nd.*
