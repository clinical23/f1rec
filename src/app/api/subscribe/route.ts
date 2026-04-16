import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notify, esc, redactEmail, withCrashNotify } from '@/lib/telegram';

export const runtime = 'nodejs';

export const POST = withCrashNotify('POST /api/subscribe', async (req: NextRequest) => {
  const { email } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('subscribers').insert({ email });

  if (error) {
    // Unique violation = already subscribed, silent success
    if (error.code === '23505') {
      return NextResponse.json({ status: 'already_subscribed' });
    }
    return NextResponse.json({ error: 'insert_failed', details: error.message }, { status: 500 });
  }

  // Get total active subscriber count
  const { count } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Fire-and-forget Telegram notification (silent — don't buzz for every signup)
  void notify({
    text: [
      `👤 *New subscriber*`,
      ``,
      `${esc(redactEmail(email))}`,
      `Total active subscribers: *${count ?? '?'}*`
    ].join('\n'),
    silent: true
  });

  return NextResponse.json({ status: 'subscribed' });
});
