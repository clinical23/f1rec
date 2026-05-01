import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { notify } from '@/lib/telegram';
import { TWEET_BIBLE } from '@/lib/sessions/tweet-bible';

const DEFAULT_WEBHOOK_URL = 'https://n8n.f1rec.com/webhook/tweet-approval-request';
const BANNED_PHRASES = [
  'thrilling',
  'stunning',
  'incredible',
  'masterclass',
  'dramatic',
  'sensational',
  'nail-biting',
  'edge-of-your-seat',
  'rollercoaster',
  'unleash',
  'delve',
  'game-changing',
  'revolutionary',
];
const EMOJI_REGEX = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u;

export type GenerateInput = {
  race_slug: string;
  session_type: 'race' | 'sprint' | 'qualifying';
};

export type GenerateResult =
  | { status: 'queued'; tweet_text: string; rationale: string; approval_id: string }
  | { status: 'rejected'; tweet_text: string; rationale: string; rejection_reasons: string[] }
  | { status: 'dry_run'; tweet_text: string; rationale: string }
  | { status: 'error'; errors: string[] };

type SessionResultRow = {
  position?: number | string | null;
  driver_name?: string | null;
};

type SessionFactsheet = {
  error?: string;
  race?: { name?: string | null; season_year?: number | null };
  session_results?: SessionResultRow[];
};

type TweetJson = {
  tweet?: unknown;
  rationale?: unknown;
  error?: unknown;
  details?: unknown;
};

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function parsePosition(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWinnerLastName(results: SessionResultRow[]): string | null {
  const winner = [...results]
    .sort((a, b) => (parsePosition(a.position) ?? 9999) - (parsePosition(b.position) ?? 9999))
    .find((row) => parsePosition(row.position) === 1);
  if (!winner?.driver_name) return null;
  const chunks = winner.driver_name.trim().split(/\s+/).filter(Boolean);
  return chunks[chunks.length - 1] ?? null;
}

function validateTweet(tweet: string, factsheet: SessionFactsheet): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const text = tweet.trim();

  if (text.length < 1 || text.length > 270) reasons.push(`tweet_length_out_of_range:${text.length}`);
  if (text.includes('#')) reasons.push('contains_hashtag');
  if (text.includes('@')) reasons.push('contains_mention');
  if (EMOJI_REGEX.test(text)) reasons.push('contains_emoji');
  if (text.includes('http://') || text.includes('https://')) reasons.push('contains_url');

  const lowered = text.toLowerCase();
  const phraseHits = BANNED_PHRASES.filter((phrase) => lowered.includes(phrase));
  if (phraseHits.length > 0) reasons.push(`contains_banned_phrase:${phraseHits.join('|')}`);

  const winnerLastName = getWinnerLastName(factsheet.session_results ?? []);
  if (winnerLastName && !new RegExp(`\\b${winnerLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
    reasons.push(`winner_not_mentioned:${winnerLastName}`);
  }

  return { ok: reasons.length === 0, reasons };
}

function sessionTypeLabel(sessionType: GenerateInput['session_type']): 'Race' | 'Sprint' | 'Qualifying' {
  if (sessionType === 'race') return 'Race';
  if (sessionType === 'sprint') return 'Sprint';
  return 'Qualifying';
}

export async function generateAndQueueTweet(
  input: GenerateInput,
  opts?: { dry_run?: boolean }
): Promise<GenerateResult> {
  const supabase = createAdminClient();
  const { data: factsheet, error: factsheetError } = await supabase.rpc('get_session_factsheet', {
    p_race_slug: input.race_slug,
    p_session_type: input.session_type,
  });

  const safeFactsheet = (factsheet ?? null) as SessionFactsheet | null;
  if (factsheetError || !safeFactsheet || safeFactsheet.error) {
    return {
      status: 'error',
      errors: [
        'factsheet_lookup_failed',
        factsheetError?.message ?? (typeof safeFactsheet?.error === 'string' ? safeFactsheet.error : 'unknown'),
      ],
    };
  }

  if (!Array.isArray(safeFactsheet.session_results) || safeFactsheet.session_results.length === 0) {
    return { status: 'error', errors: ['empty_session_results'] };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  let rawText = '';
  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: [{ type: 'text', text: TWEET_BIBLE, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(safeFactsheet) }],
    });
    const firstBlock = completion.content[0];
    rawText = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await notify(`⚠️ Tweet generation failed for ${input.race_slug}/${input.session_type}: ${message.slice(0, 300)}`);
    return { status: 'error', errors: ['anthropic_request_failed', message] };
  }

  const cleaned = stripMarkdownFences(rawText);
  let parsed: TweetJson;
  try {
    parsed = JSON.parse(cleaned) as TweetJson;
  } catch {
    return {
      status: 'error',
      errors: ['invalid_json', `raw: ${cleaned.slice(0, 200)}`],
    };
  }

  if (parsed.error) {
    return {
      status: 'error',
      errors: [String(parsed.error), typeof parsed.details === 'string' ? parsed.details : ''],
    };
  }

  if (typeof parsed.tweet !== 'string' || typeof parsed.rationale !== 'string') {
    return {
      status: 'error',
      errors: ['invalid_shape', `raw: ${cleaned.slice(0, 200)}`],
    };
  }

  const tweetText = parsed.tweet.trim();
  const rationale = parsed.rationale.trim();
  const { ok, reasons } = validateTweet(tweetText, safeFactsheet);
  if (!ok) {
    return {
      status: 'rejected',
      tweet_text: tweetText,
      rationale,
      rejection_reasons: reasons,
    };
  }

  if (opts?.dry_run === true) {
    return { status: 'dry_run', tweet_text: tweetText, rationale };
  }

  const webhookUrl = process.env.TWEET_APPROVAL_WEBHOOK_URL ?? DEFAULT_WEBHOOK_URL;
  const raceName = safeFactsheet.race?.name ?? input.race_slug;
  const raceYear = safeFactsheet.race?.season_year ? ` ${safeFactsheet.race.season_year}` : '';
  const sessionLabel = sessionTypeLabel(input.session_type);

  let webhookResponse: Response;
  try {
    webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweet_text: tweetText,
        context: {
          race_name: `${raceName}${raceYear} — ${sessionLabel}`,
          session_type: input.session_type,
          race_slug: input.race_slug,
          priority: 'medium',
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await notify(`⚠️ Tweet webhook call failed for ${input.race_slug}/${input.session_type}: ${message.slice(0, 300)}`);
    return { status: 'error', errors: ['webhook_failed', message] };
  }

  if (!webhookResponse.ok) {
    const bodyText = await webhookResponse.text().catch(() => '');
    return { status: 'error', errors: ['webhook_failed', `http_${webhookResponse.status}`, bodyText.slice(0, 300)] };
  }

  const webhookBody = (await webhookResponse.json().catch(() => null)) as
    | { status?: string; approval_id?: string }
    | null;

  if (!webhookBody || webhookBody.status !== 'pending_approval' || typeof webhookBody.approval_id !== 'string') {
    return { status: 'error', errors: ['webhook_failed', 'invalid_webhook_response_shape'] };
  }

  return {
    status: 'queued',
    tweet_text: tweetText,
    rationale,
    approval_id: webhookBody.approval_id,
  };
}
