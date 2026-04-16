import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notify, esc } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically when CRON_SECRET env var is set
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: posts_published },
    { count: posts_rejected },
    { count: new_subscribers },
    { count: total_subscribers },
    { count: tweets_posted },
    { count: tweets_pending }
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('published_at', since),
    supabase.from('posts_rejected').select('*', { count: 'exact', head: true }).gte('attempted_at', since),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).gte('subscribed_at', since).eq('is_active', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tweet_approvals').select('*', { count: 'exact', head: true }).eq('status', 'posted').gte('resolved_at', since),
    supabase.from('tweet_approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const lines = [
    `📊 *F1Rec Daily Digest* — ${esc(today)}`,
    ``,
    `*Blog:* ${posts_published ?? 0} published, ${posts_rejected ?? 0} rejected`,
    `*Subscribers:* +${new_subscribers ?? 0} (total ${total_subscribers ?? 0})`,
    `*Tweets:* ${tweets_posted ?? 0} posted, ${tweets_pending ?? 0} pending approval`
  ];

  if ((posts_rejected ?? 0) > 0) {
    lines.push('', `⚠️ Review rejected posts in Supabase Studio`);
  }

  await notify({ text: lines.join('\n'), silent: true });

  return NextResponse.json({ status: 'digest_sent' });
}
