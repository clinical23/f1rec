# F1REC TWITTER PIPELINE — n8n Workflow Build Guide
# Target: Miami GP, May 1-3 2026
# Version: 1.0 — Manual approval mode
# Save to desktop. Import into n8n.

---

## OVERVIEW

This is the Phase 1 (manual approval) Twitter pipeline. During a race session, it:
1. Polls OpenF1 for live position/timing data every 30 seconds
2. Detects events (overtakes, pit stops, safety cars, milestones)
3. Queries F1Rec Supabase for historical context
4. Generates a tweet via Ollama/Mistral
5. Sends the tweet to a manual approval queue
6. You approve → it posts to @F1RecStats

```
Schedule Trigger (30s)
    → HTTP Request: OpenF1 /position
    → Code Node: Compare to last state, detect events
    → IF: Event detected?
        → YES → HTTP Request: Supabase historical query
               → HTTP Request: Ollama generate tweet
               → Send to approval (Slack/Discord/webhook)
               → Wait for approval
               → HTTP Request: Twitter API v2 POST
        → NO → End
```

---

## NODE-BY-NODE SPEC

### 1. Schedule Trigger
- Type: Schedule Trigger
- Interval: Every 30 seconds
- Active: Only enable manually during race sessions (FP1/FP2/FP3/Quali/Race)
- **IMPORTANT:** Disable this between sessions or you'll burn OpenF1 rate limits

### 2. HTTP Request — OpenF1 Positions
```
Method: GET
URL: https://api.openf1.org/v1/position?session_key=latest
Headers: none needed (no auth)
Response: JSON array of driver positions
```

Response shape:
```json
[
  {
    "driver_number": 63,
    "position": 1,
    "date": "2026-05-03T19:30:15.123Z",
    "session_key": 9876,
    "meeting_key": 1234
  }
]
```

### 3. HTTP Request — OpenF1 Race Control (parallel)
```
Method: GET
URL: https://api.openf1.org/v1/race_control?session_key=latest
Response: Safety car, red flag, VSC events
```

### 4. Code Node — Event Detection

This is the brain. It compares current positions to the previous poll's positions (stored in n8n static data) and emits events.

```javascript
// Get current positions from OpenF1 response
const currentPositions = $input.all().map(item => item.json);

// Get previous positions from static data
const prevPositions = $getWorkflowStaticData('global').lastPositions || [];
const prevRaceControl = $getWorkflowStaticData('global').lastRaceControl || [];

// Get race control messages
const raceControl = $('HTTP Request - Race Control').all().map(item => item.json);

const events = [];

// --- DRIVER NUMBER → NAME MAPPING ---
const driverMap = {
  1: { name: 'Verstappen', team: 'Red Bull', slug: 'max_verstappen' },
  4: { name: 'Norris', team: 'McLaren', slug: 'norris' },
  7: { name: 'Piastri', team: 'McLaren', slug: 'piastri' },
  10: { name: 'Gasly', team: 'Alpine', slug: 'gasly' },
  12: { name: 'Antonelli', team: 'Mercedes', slug: 'antonelli' },
  14: { name: 'Alonso', team: 'Aston Martin', slug: 'alonso' },
  16: { name: 'Leclerc', team: 'Ferrari', slug: 'leclerc' },
  18: { name: 'Stroll', team: 'Aston Martin', slug: 'stroll' },
  20: { name: 'Bearman', team: 'Haas', slug: 'bearman' },
  22: { name: 'Lawson', team: 'Racing Bulls', slug: 'lawson' },
  23: { name: 'Albon', team: 'Williams', slug: 'albon' },
  27: { name: 'Hulkenberg', team: 'Audi', slug: 'hulkenberg' },
  31: { name: 'Ocon', team: 'Haas', slug: 'ocon' },
  33: { name: 'Hadjar', team: 'Red Bull', slug: 'hadjar' },
  38: { name: 'Bortoleto', team: 'Audi', slug: 'bortoleto' },
  39: { name: 'Colapinto', team: 'Alpine', slug: 'colapinto' },
  43: { name: 'Lindblad', team: 'Racing Bulls', slug: 'lindblad' },
  44: { name: 'Hamilton', team: 'Ferrari', slug: 'hamilton' },
  55: { name: 'Sainz', team: 'Williams', slug: 'sainz' },
  63: { name: 'Russell', team: 'Mercedes', slug: 'russell' },
  77: { name: 'Bottas', team: 'Cadillac', slug: 'bottas' },
  11: { name: 'Perez', team: 'Cadillac', slug: 'perez' },
};

const getDriver = (num) => driverMap[num] || { name: `#${num}`, team: 'Unknown', slug: '' };

// --- OVERTAKE DETECTION ---
for (const curr of currentPositions) {
  const prev = prevPositions.find(p => p.driver_number === curr.driver_number);
  if (!prev) continue;
  
  // Position improved (lower number = better)
  if (curr.position < prev.position) {
    const gained = prev.position - curr.position;
    // Only report significant moves (gained 1+ positions for top 10, 3+ outside)
    if (curr.position <= 10 || gained >= 3) {
      const driver = getDriver(curr.driver_number);
      // Find who they overtook
      const overtaken = currentPositions.find(p => p.position === prev.position);
      const overtakenDriver = overtaken ? getDriver(overtaken.driver_number) : null;
      
      events.push({
        type: 'overtake',
        driver: driver.name,
        driverSlug: driver.slug,
        team: driver.team,
        from: prev.position,
        to: curr.position,
        gained: gained,
        overtakenDriver: overtakenDriver?.name || 'unknown',
        overtakenSlug: overtakenDriver?.slug || '',
        priority: curr.position <= 3 ? 'high' : 'medium'
      });
    }
  }
}

// --- SAFETY CAR / RED FLAG DETECTION ---
const newRCMessages = raceControl.filter(msg => {
  return !prevRaceControl.some(prev => prev.date === msg.date);
});

for (const msg of newRCMessages) {
  if (msg.category === 'SafetyCar' || msg.message?.includes('SAFETY CAR')) {
    events.push({ type: 'safety-car', message: msg.message, priority: 'high' });
  }
  if (msg.category === 'Flag' && msg.flag === 'RED') {
    events.push({ type: 'red-flag', message: msg.message, priority: 'high' });
  }
  if (msg.message?.includes('VIRTUAL SAFETY CAR')) {
    events.push({ type: 'vsc', message: msg.message, priority: 'medium' });
  }
}

// --- LEADER CHANGE DETECTION ---
const currentLeader = currentPositions.find(p => p.position === 1);
const prevLeader = prevPositions.find(p => p.position === 1);
if (currentLeader && prevLeader && currentLeader.driver_number !== prevLeader.driver_number) {
  const newLeader = getDriver(currentLeader.driver_number);
  const oldLeader = getDriver(prevLeader.driver_number);
  events.push({
    type: 'lead-change',
    driver: newLeader.name,
    driverSlug: newLeader.slug,
    team: newLeader.team,
    previousLeader: oldLeader.name,
    priority: 'high'
  });
}

// --- STORE CURRENT STATE FOR NEXT POLL ---
const staticData = $getWorkflowStaticData('global');
staticData.lastPositions = currentPositions;
staticData.lastRaceControl = raceControl;

// Return events (empty array = no events = workflow ends)
return events.map(e => ({ json: e }));
```

### 5. IF Node — Event Detected?
- Condition: `{{ $json.type }}` is not empty
- True → continue to Supabase query
- False → end

### 6. HTTP Request — Supabase Historical Context

Query depends on event type. Use a Code node to build the right query:

```javascript
const event = $input.first().json;
const supabaseUrl = 'https://mezipswmplrcdbinwjwy.supabase.co/rest/v1';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg';

let query = '';
let context = '';

if (event.type === 'overtake' && event.driverSlug) {
  // How many wins does this driver have?
  query = `${supabaseUrl}/drivers?slug=eq.${event.driverSlug}&select=career_wins,career_podiums,championships`;
} else if (event.type === 'lead-change' && event.driverSlug) {
  // Driver's career stats + season stats
  query = `${supabaseUrl}/driver_season_stats?driver_id=eq.(select id from drivers where slug='${event.driverSlug}')&season_id=eq.(select id from seasons where year=2026)&select=wins,podiums,points`;
}

return [{
  json: {
    ...event,
    supabaseQuery: query,
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  }
}];
```

Then make the HTTP request and merge the context into the event.

### 7. HTTP Request — Ollama Tweet Generation

```
Method: POST
URL: http://localhost:11434/api/generate
Headers: Content-Type: application/json
Body:
{
  "model": "mistral",
  "prompt": "<<SEE SYSTEM PROMPT BELOW>>",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_predict": 100
  }
}
```

### 8. Code Node — Format Tweet

Extract the generated text, enforce 280 char limit, strip any AI artifacts:

```javascript
const generated = $input.first().json.response;
const event = $('Code - Event Detection').first().json;

// Clean up the tweet
let tweet = generated
  .replace(/^["']|["']$/g, '')  // Remove wrapping quotes
  .replace(/\n/g, ' ')          // Single line
  .replace(/\s+/g, ' ')         // Collapse whitespace
  .trim();

// Enforce 280 char limit
if (tweet.length > 280) {
  tweet = tweet.substring(0, 277) + '...';
}

// Add source attribution (optional, remove if too long)
const withAttribution = tweet + '\n\nf1rec.com';
const finalTweet = withAttribution.length <= 280 ? withAttribution : tweet;

return [{
  json: {
    tweet: finalTweet,
    eventType: event.type,
    priority: event.priority,
    driver: event.driver,
    timestamp: new Date().toISOString()
  }
}];
```

### 9. Approval Gate — Manual Review

**Option A: n8n Form Trigger (simplest)**
Use a "Wait" node that pauses until you visit a URL and click approve.

**Option B: Discord webhook**
POST the tweet to a Discord channel. You react with ✅ to approve, ❌ to reject.

**Option C: Simple webhook dashboard**
n8n serves a simple HTML page listing pending tweets with Approve/Reject buttons.

**For Miami GP, use Option A — n8n Wait node:**
```
Type: Wait
Resume: On webhook call
Webhook URL: auto-generated by n8n
Timeout: 5 minutes (auto-reject if not approved)
```

Before the Wait node, add an HTTP Request that sends the tweet text to your phone (via Pushover, Telegram, or just email) with the approval webhook URL.

### 10. HTTP Request — Twitter API v2 Post

```
Method: POST
URL: https://api.twitter.com/2/tweets
Authentication: OAuth 1.0a
  - Consumer Key: {{ $env.TWITTER_API_KEY }}
  - Consumer Secret: {{ $env.TWITTER_API_SECRET }}
  - Access Token: {{ $env.TWITTER_ACCESS_TOKEN }}
  - Access Token Secret: {{ $env.TWITTER_ACCESS_TOKEN_SECRET }}
Headers:
  Content-Type: application/json
Body:
{
  "text": "{{ $json.tweet }}"
}
```

---

## TWEET GENERATION SYSTEM PROMPT (for Ollama/Mistral)

```
You are @F1RecStats, the Twitter account for F1Rec — a Formula 1 statistics platform.

Generate a single tweet (max 280 characters) about this live F1 event.

RULES:
- Data-first. Lead with the specific stat or number.
- Use driver SURNAMES only (Antonelli not Kimi, Hamilton not Lewis).
- Slightly irreverent tone — like a knowledgeable mate, not a press release.
- Include historical context when provided.
- No hashtags (they look desperate on a stats account).
- No emojis except 🏎️ or 🏆 and only if they genuinely add something.
- Never use: "incredible", "stunning", "game-changer", "what a race", "scenes".
- Never start with "Breaking:" or "JUST IN:".
- End with a stat that adds context, not just the event description.
- Max 280 characters. This is critical. Count carefully.

EVENT TYPE: {event_type}
DRIVER: {driver_name} ({team})
DETAIL: {event_detail}
HISTORICAL CONTEXT: {supabase_context}
CURRENT LAP/POSITION: {position_data}

Generate the tweet (max 280 characters, no explanation, just the tweet text):
```

---

## EXAMPLE TWEETS THE PIPELINE SHOULD PRODUCE

**Overtake for lead:**
"Antonelli past Leclerc for the lead at Miami. His 4th overtake on Charles this season — more than any other driver on the 2026 grid."

**Pit stop:**
"Hamilton pits on lap 18. That's 4 laps earlier than his average hard stint this season. Ferrari going aggressive on the undercut."

**Safety car:**
"Safety car at Miami. The race leader has won from a late SC at this circuit in 3 of the last 5 races. Advantage Russell."

**Leader change:**
"Russell leads. First time a Mercedes has led at Miami since 2023. 14 different leaders in the last 20 races at this circuit."

**Milestone:**
"Verstappen finishes P4. That's 7 consecutive races without a win — his longest drought since 2020."

---

## RACE WEEKEND SCHEDULE — MIAMI GP

All times BST (UTC+1):

| Session | Date | Time (BST) | Pipeline Active? |
|---|---|---|---|
| FP1 | Fri 1 May | 18:30–19:30 | Optional (test) |
| FP2 | Fri 1 May | 22:00–23:00 | Optional (test) |
| FP3 | Sat 2 May | 17:30–18:30 | No |
| Qualifying | Sat 2 May | 21:00–22:00 | Yes |
| Race | Sun 3 May | 21:00–23:00 | Yes (full) |

**Plan:**
- FP1: Run pipeline in silent mode (generate tweets but don't post). Check quality.
- FP2: Same. Tune the Ollama prompt if tweets are bad.
- Qualifying: Go live with manual approval. Target 5-8 tweets.
- Race: Go live with manual approval. Target 10-15 tweets.

---

## SETUP CHECKLIST

Before Miami GP weekend:

- [ ] Twitter account @F1RecStats created
- [ ] Twitter Developer account approved + API keys generated
- [ ] n8n workflow imported and tested with mock data
- [ ] Ollama running with Mistral model loaded
- [ ] OpenF1 API tested (hit /position endpoint during a practice session)
- [ ] Supabase context queries tested
- [ ] Approval notification channel set up (Telegram/Discord/email)
- [ ] Driver number mapping verified for 2026 grid
- [ ] Dry run: manually trigger workflow with fake event data

---

## FILES ON DESKTOP

| File | Purpose |
|---|---|
| `f1rec-twitter-pipeline-v1.md` | This file — n8n build guide |
| `f1rec-live-pipeline-spec-v1.md` | Full architecture (Twitter + Twitch + AI chat) |
| `f1rec-style-bible-v1.md` | Voice/tone rules for tweet generation |

---

*Build this workflow in n8n's visual editor on the sim rig. Test during FP1 on May 1st. Go live for Qualifying on May 2nd.*
