import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withCrashNotify } from '@/lib/telegram';

export const runtime = 'nodejs';

export const POST = withCrashNotify('POST /api/admin/mark-reviewed', async (req: NextRequest) => {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('posts_rejected').update({ reviewed: true }).eq('id', id);
  if (error) return NextResponse.json({ error: 'update failed', details: error }, { status: 500 });
  return NextResponse.json({ status: 'marked_reviewed' });
});
