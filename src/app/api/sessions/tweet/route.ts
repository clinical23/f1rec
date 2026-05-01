import { NextRequest, NextResponse } from 'next/server';
import { withCrashNotify } from '@/lib/telegram';
import { generateAndQueueTweet } from '@/lib/sessions/tweet-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withCrashNotify('POST /api/sessions/tweet', async (req: NextRequest) => {
  if (req.headers.get('x-pipeline-secret') !== process.env.BLOG_PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.race_slug !== 'string' ||
    typeof body.session_type !== 'string' ||
    !['race', 'sprint', 'qualifying'].includes(body.session_type)
  ) {
    return NextResponse.json(
      { error: 'bad_request', expected: { race_slug: 'string', session_type: 'race | sprint | qualifying' } },
      { status: 400 }
    );
  }

  const result = await generateAndQueueTweet(
    { race_slug: body.race_slug, session_type: body.session_type },
    { dry_run: body.dry_run === true }
  );

  const httpStatus =
    result.status === 'queued' || result.status === 'dry_run' ? 200 : result.status === 'rejected' ? 422 : 500;

  return NextResponse.json(result, { status: httpStatus });
});
