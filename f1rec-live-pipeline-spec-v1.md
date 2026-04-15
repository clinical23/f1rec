# F1REC LIVE PIPELINE — Architecture Spec v1.0
# Real-time F1 stats → Twitter + Twitch overlay
# Hardware: Ryzen 9 9800X3D / RTX 5090 / 128GB DDR5 / 10GbE NAS
# Updated: 14 April 2026

---

## OVERVIEW

A real-time pipeline that monitors live F1 timing data during races, queries the F1Rec Supabase database for historical context, generates natural-language stat insights via a local LLM, and publishes them to Twitter/X and a Twitch stream overlay.

```
Live Timing API → n8n Trigger → Supabase Query → Local LLM → Approval Gate → Twitter API + OBS Overlay
```

## HARDWARE REQUIREMENTS

| Component | What It Does | Your Spec |
|---|---|---|
| CPU | n8n orchestration, OBS encoding | Ryzen 9 9800X3D ✅ (overkill) |
| GPU | LLM inference (Mistral 8B Q5) | RTX 5090 32GB ✅ (needs ~8GB VRAM) |
| RAM | n8n + Ollama + OBS + browser | 128GB DDR5 ✅ (needs ~16GB) |
| Network | Live timing API polling | 10GbE ✅ (needs ~1Mbps) |
| Storage | Stream recording + replays | 8TB NAS ✅ (1hr 4K = ~30GB) |

**Verdict: Your sim rig runs this comfortably alongside iRacing/ACC at the same time.** The pipeline uses <10% of available resources.

---

## COMPONENT 1: LIVE TIMING DATA SOURCE

### Option A: Jolpica F1 API (free, delayed)
- Base: `https://api.jolpi.ca/ergast/f1/`
- Limitation: Data updates after sessions complete, NOT real-time during races
- Use for: Post-qualifying, post-race stat generation (non-live)

### Option B: OpenF1 API (free, near-real-time)
- Base: `https://api.openf1.org/v1/`
- Endpoints: `/position`, `/car_data`, `/intervals`, `/pit`, `/race_control`, `/stints`
- Latency: ~5-15 seconds behind live TV
- Rate limit: Generous, community-maintained
- **This is the one for live race coverage**

### Option C: F1 Live Timing (unofficial scrape)
- The official F1 live timing websocket at `livetiming.formula1.com`
- Libraries exist: `f1-livedata` (Python), `FastF1` (Python)
- Most granular data but legally grey for commercial use
- Use FastF1 for post-race analysis, OpenF1 for live

### Recommended: OpenF1 for live race → Jolpica for historical cross-reference

---

## COMPONENT 2: N8N WORKFLOW — "F1REC RACE BRAIN"

### Workflow Architecture

```
┌─────────────────┐
│  Schedule Trigger │ ← Every 10 seconds during race window
│  (or Webhook)     │
└────────┬──────────┘
         │
┌────────▼──────────┐
│  HTTP Request:     │ ← OpenF1 /position endpoint
│  Get Live Positions│
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Compare to Last   │ ← Detect events: position change, pit stop, gap change
│  Known State       │
│  (n8n static data) │
└────────┬──────────┘
         │ (if event detected)
         │
┌────────▼──────────┐
│  Classify Event    │ ← overtake / pit-stop / safety-car / retirement / milestone
│  (Code node)       │
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Supabase Query    │ ← Historical context from F1Rec database
│  (HTTP Request to  │   "How many times has Driver X overtaken Driver Y?"
│   Supabase REST)   │   "What's the last time a rookie led at this circuit?"
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Ollama/Mistral    │ ← Generate natural language stat
│  (HTTP Request to  │   Input: event type + raw stat + F1Rec style bible
│   localhost:11434) │   Output: Tweet-length insight (max 280 chars)
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Approval Gate     │ ← v1: Manual approval via n8n form/webhook
│  (Wait node or     │   v2: Auto-approve low-risk categories
│   manual trigger)  │   v3: Full auto with confidence scoring
└────────┬──────────┘
         │
    ┌────┴─────┐
    │          │
┌───▼───┐ ┌───▼────┐
│Twitter│ │ OBS    │
│ API   │ │Overlay │
│ Post  │ │WebSocket│
└───────┘ └────────┘
```

### Event Detection Logic (Code Node)

```javascript
// Compare current positions to previous poll
const events = [];
for (const driver of currentPositions) {
  const prev = previousPositions.find(p => p.driver_number === driver.driver_number);
  if (!prev) continue;
  
  // Overtake detected
  if (driver.position < prev.position) {
    events.push({
      type: 'overtake',
      driver: driver.driver_number,
      from: prev.position,
      to: driver.position,
      overtaken: currentPositions.find(p => p.position === prev.position)
    });
  }
  
  // Pit stop detected (position drops + pit flag)
  if (driver.position > prev.position + 3) {
    events.push({ type: 'pit-stop', driver: driver.driver_number });
  }
}

// Milestone detection
const leader = currentPositions[0];
if (leader.laps_completed === Math.floor(totalLaps * 0.5)) {
  events.push({ type: 'half-distance', leader: leader.driver_number });
}

return events;
```

### Supabase Context Queries (per event type)

```sql
-- Overtake: How often has this matchup happened?
SELECT count(*) FROM results r1
JOIN results r2 ON r1.race_id = r2.race_id
WHERE r1.driver_slug = $overtaker AND r2.driver_slug = $overtaken
AND r1.position < r2.position;

-- Pit stop: Driver's average stint length this season
SELECT avg(stint_laps) FROM ... -- derived from results

-- Leader at half distance: How often does the half-distance leader win?
-- (pre-compute this stat and store in random_stats)

-- Rookie milestone: Last rookie to lead at this circuit
SELECT d.full_name, rc.season_year FROM results r
JOIN drivers d ON d.slug = r.driver_slug
JOIN races rc ON rc.id = r.race_id
WHERE r.position = 1 AND rc.circuit_slug = $circuit
AND d.first_season = rc.season_year
ORDER BY rc.season_year DESC LIMIT 1;
```

### LLM Prompt Template

```
You are the F1Rec stats bot. Generate a single tweet (max 280 characters) about this F1 event.

STYLE RULES:
- Data-first, slightly irreverent
- No AI clichés (no "incredible", "stunning", "game-changer")
- Include the specific stat number
- Use driver surnames only (Antonelli not Kimi, Hamilton not Lewis)
- End with a stat that adds context, not just the event description
- No hashtags (they look desperate)
- No emojis except 🏎️ or 🏆 sparingly

EVENT: {event_type}
DRIVER: {driver_name}
DETAIL: {event_detail}
HISTORICAL CONTEXT: {supabase_query_result}

Generate the tweet:
```

### Example Outputs

Event: Antonelli overtakes Leclerc for P1
Context: 4th overtake on Leclerc this season, only 3 rookies have led more laps at this circuit
→ **"Antonelli past Leclerc for the lead. That's his 4th overtake on Charles this season. Only Villeneuve (1996) and Hamilton (2007) led more laps as a rookie at this circuit."**

Event: Hamilton pits from P4, lap 22
Context: Average hard tyre stint this season is 26 laps, Hamilton pitting 4 laps early
→ **"Hamilton pits on lap 22 — 4 laps earlier than his season average on hards. Ferrari going aggressive. The undercut has worked for him at 3 of the last 5 circuits."**

Event: Safety car deployed
Context: 3rd safety car at this circuit in 5 years, leader wins from SC 62% of the time
→ **"Safety car. The leader at this circuit has won from a late SC 62% of the time across the last decade. Advantage Antonelli."**

---

## COMPONENT 3: TWITTER/X INTEGRATION

### Setup
1. Create `@F1RecStats` Twitter account
2. Apply for Twitter API v2 access (Free tier allows 1,500 tweets/month — more than enough)
3. Generate Bearer Token + API keys
4. Store in n8n credentials

### n8n Twitter Node
```
Node: Twitter v2
Action: Create Tweet
Text: {{ $json.generated_tweet }}
```

### Approval Modes

**v1 — Manual (Miami GP test):**
- n8n sends tweet to a Slack/Discord channel or a simple web dashboard
- You click "Approve" or "Reject"
- Approved tweets post immediately
- Target: ~10-15 tweets per race (major events only)

**v2 — Semi-auto (after 3 races of v1):**
- Low-risk categories auto-post: position stats, lap counts, pit stop facts
- High-risk categories (opinions, comparisons, predictions) need manual approval
- Confidence score from LLM: >0.9 = auto-post, <0.9 = manual

**v3 — Full auto (after full season confidence):**
- All categories auto-post
- Rate limit: max 1 tweet per 90 seconds to avoid spam
- Kill switch: you can pause all posting from your phone

---

## COMPONENT 4: OBS/TWITCH OVERLAY

### Architecture
- **OBS Studio** on the sim rig captures the overlay
- **Browser source** in OBS points to a local HTML page: `http://localhost:3001/overlay`
- The overlay page is a **Next.js app** (or standalone HTML) that:
  - Connects to a local WebSocket server
  - Receives stat events from n8n (same pipeline, different output)
  - Renders animated stat cards that appear and disappear

### Overlay Visual Design
```
┌──────────────────────────────────────────────┐
│                                              │
│  [F1REC watermark top-left]                  │
│                                              │
│                                              │
│           (main content area —               │
│            race footage or blank)             │
│                                              │
│                                              │
│  ┌────────────────────────────────────┐      │
│  │ 🏎️ STAT: Antonelli's 4th overtake │      │  ← slides in from bottom
│  │ on Leclerc this season. Only       │      │     stays 8 seconds
│  │ Villeneuve led more rookie laps    │      │     then slides out
│  │ at this circuit.                   │      │
│  └────────────────────────────────────┘      │
│                                              │
│  [Live standings ticker — bottom bar]        │
│  P1 ANT 68pts | P2 RUS 55 | P3 LEC 42      │
└──────────────────────────────────────────────┘
```

### WebSocket Server (Node.js)
```javascript
// Simple WebSocket server that n8n pushes stat events to
const wss = new WebSocketServer({ port: 3002 });
// n8n HTTP Request node POSTs to localhost:3002/stat
// Server broadcasts to all connected overlay clients
```

### Overlay Tech Stack
- HTML + CSS + vanilla JS (keep it simple for OBS browser source)
- CSS animations for slide-in/slide-out
- Transparent background (OBS captures it as overlay)
- F1Rec design system colours and fonts
- Auto-dismiss after 8 seconds

---

## COMPONENT 5: LIVE STANDINGS TICKER

A permanent bottom bar on the overlay showing:
- Current race positions (from OpenF1 polling)
- WDC standings (from Supabase)
- Gap to leader
- Tyre compound + stint length

This runs independently of the stat events — it updates every 10 seconds from the live timing data.

---

## DEPLOYMENT SEQUENCE

### Phase 1: Twitter Bot (test at Miami GP, May 1-3)
1. Create @F1RecStats account
2. Get Twitter API keys
3. Build n8n workflow: OpenF1 → event detection → Supabase → Ollama → manual approval → Twitter
4. Run during Miami FP1 as a test (low stakes)
5. Go live for qualifying + race with manual approval

### Phase 2: Twitch Overlay (test at Imola GP, May 17)
1. Build overlay HTML page with WebSocket listener
2. Add OBS browser source
3. Build n8n branch that pushes stats to WebSocket AND Twitter
4. Stream the overlay on Twitch with race audio (check F1 audio rights)
5. Interact via text in Twitch chat

### Phase 3: AI Chat Assistant (test at Monaco GP, May 24)
1. Add a Twitch chatbot that responds to viewer questions
2. "!stat hamilton" → queries Supabase → returns career stats
3. "!compare hamilton verstappen" → returns head-to-head summary
4. "!predict" → LLM generates a prediction based on current race state
5. Rate limit: 1 response per 30 seconds to avoid spam

### Phase 4: Community Voice Integration (after 5+ races)
1. Invite a content creator to provide voice commentary
2. They see the overlay + stats feed on a shared screen
3. They talk, you produce, the AI feeds both of you context
4. Revenue split via Twitch's co-streaming features

---

## AUDIO RIGHTS NOTE

**You cannot rebroadcast F1 race audio or footage on Twitch/Kick.** F1 Management (FOM) actively DMCA streams that include race footage or commentary.

**Legal alternatives:**
- Your own commentary/analysis (no race feed audio)
- Stats overlay only — no race visuals
- "Watch along" format where viewers sync their own F1 TV/Sky feed with your overlay stream
- Use the OpenF1 timing data to CREATE your own visuals (track position map, gap charts) rather than showing the race

The safest model: **F1Rec Live is a second screen. Viewers watch the race on their TV/F1TV and have the F1Rec Twitch stream on a second monitor/phone for live stats.**

---

## N8N WORKFLOW FILES NEEDED

1. `f1rec-race-brain.json` — Main race event detection + stat generation workflow
2. `f1rec-twitter-poster.json` — Twitter publishing with approval gate
3. `f1rec-overlay-pusher.json` — WebSocket push for OBS overlay
4. `f1rec-timing-poller.json` — OpenF1 API polling every 10 seconds

These will be built in n8n's visual editor on the sim rig.

---

## ESTIMATED BUILD TIME

| Component | Time | Dependencies |
|---|---|---|
| Twitter account + API keys | 30 min | None |
| n8n OpenF1 polling workflow | 2 hrs | n8n running locally |
| Supabase context queries | 1 hr | Already have the database |
| Ollama/Mistral tweet generation | 1 hr | Ollama already installed |
| Manual approval dashboard | 1 hr | n8n webhook + form |
| Twitter posting integration | 30 min | API keys |
| OBS overlay HTML page | 3 hrs | Design + animations |
| WebSocket server | 1 hr | Node.js |
| Twitch chatbot | 2 hrs | Twitch API |
| **Total Phase 1 (Twitter)** | **~6 hrs** | |
| **Total Phase 2 (Overlay)** | **~4 hrs additional** | |

**Target: Phase 1 ready for Miami GP (May 1-3). Phase 2 ready for Imola (May 17).**

---

*This spec is the blueprint for F1Rec Live. Save alongside the brain doc. Reference during n8n build sessions.*
