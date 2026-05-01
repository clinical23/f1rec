import { NextRequest, NextResponse } from 'next/server';
import { withCrashNotify } from '@/lib/telegram';
import { syncSession } from '@/lib/jolpica/session-sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withCrashNotify('POST /api/sync/session', async (req: NextRequest) => {
  if (req.headers.get('x-pipeline-secret') !== process.env.BLOG_PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.season !== 'number' ||
    typeof body.round !== 'number' ||
    typeof body.session_type !== 'string'
  ) {
    return NextResponse.json(
      {
        error: 'bad_request',
        expected: { season: 'number', round: 'number', session_type: 'string' },
      },
      { status: 400 }
    );
  }

  const result = await syncSession(body);
  return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 500 });
});
