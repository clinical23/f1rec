import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STYLE_BIBLE_V2 } from '@/lib/blog/style-bible';
import { validatePost } from '@/lib/blog/validator';
import { getDefaultProvider } from '@/lib/blog/providers';
import { notify, esc, withCrashNotify } from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = withCrashNotify('POST /api/blog/generate', async (req: NextRequest) => {
  if (req.headers.get('x-pipeline-secret') !== process.env.BLOG_PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { race_slug } = await req.json();
  if (!race_slug) return NextResponse.json({ error: 'race_slug required' }, { status: 400 });

  const supabase = createAdminClient();
  const provider = getDefaultProvider();

  // 1. Fetch grounded fact sheet
  const { data: factsheet, error: factsheetError } = await supabase.rpc(
    'get_race_factsheet',
    { p_race_slug: race_slug }
  );
  if (factsheetError || !factsheet || factsheet.error) {
    return NextResponse.json(
      { error: 'Fact sheet lookup failed', details: factsheetError ?? factsheet },
      { status: 400 }
    );
  }

  // 2. Skip if a post already exists for this race
  const { data: existing } = await supabase.from('posts')
    .select('id').eq('related_race_slug', race_slug).limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Post already exists', id: existing[0].id }, { status: 409 });
  }

  // 3. Generate
  let result;
  try {
    result = await provider.generate(STYLE_BIBLE_V2, factsheet);
  } catch (e: any) {
    void notify({
      text: `🔥 *Blog pipeline crashed*\nRace: \`${esc(race_slug)}\`\nProvider: ${provider.name}\nError: \`${esc((e.message ?? 'unknown').slice(0, 200))}\``
    });
    await supabase.from('posts_rejected').insert({
      model: provider.model,
      topic: race_slug,
      raw_llm_response: e.message,
      fact_sheet_sent: factsheet,
      rejection_reasons: ['provider_threw:' + e.message]
    });
    return NextResponse.json({ status: 'rejected', reason: 'provider_error' }, { status: 500 });
  }

  // 4. LLM explicitly refused
  if ('error' in result.parsed) {
    await supabase.from('posts_rejected').insert({
      model: provider.model,
      topic: race_slug,
      raw_llm_response: result.raw_text,
      fact_sheet_sent: factsheet,
      rejection_reasons: [`llm_returned_error:${result.parsed.error}`]
    });
    void notify({
      text: [
        `⚠️ *LLM refused to generate*`,
        `Race: \`${esc(race_slug)}\``,
        `Reason: ${esc(result.parsed.error)}`
      ].join('\n'),
      silent: true
    });
    return NextResponse.json({ status: 'rejected_by_llm', reason: result.parsed.error });
  }

  // 5. Validate
  const { valid, reasons } = validatePost(result.parsed, factsheet);
  if (!valid) {
    await supabase.from('posts_rejected').insert({
      model: provider.model,
      topic: race_slug,
      proposed_title: result.parsed.title,
      proposed_slug: result.parsed.slug,
      proposed_category: result.parsed.category,
      proposed_related_race_slug: result.parsed.related_race_slug,
      proposed_related_driver_slug: result.parsed.related_driver_slug,
      proposed_content: result.parsed.content,
      raw_llm_response: result.raw_text,
      fact_sheet_sent: factsheet,
      rejection_reasons: reasons
    });
    void notify({
      text: [
        `⚠️ *Blog draft rejected*`,
        ``,
        `Race: \`${esc(race_slug)}\``,
        `Title: ${esc(result.parsed.title ?? '(no title)')}`,
        `Reasons: ${reasons.slice(0, 5).map((r: string) => `\`${esc(r)}\``).join(', ')}`,
      ].join('\n')
    });
    return NextResponse.json({ status: 'rejected', reasons });
  }

  // 6. Publish
  const o = result.parsed;
  const { data: post, error } = await supabase.from('posts').insert({
    title: o.title,
    slug: o.slug,
    excerpt: o.excerpt,
    meta_description: o.meta_description,
    category: o.category,
    related_race_slug: o.related_race_slug,
    related_driver_slug: o.related_driver_slug,
    content: o.content,
    author: 'F1Rec Editorial',
    is_published: true,
    published_at: new Date().toISOString(),
    reading_time_minutes: Math.ceil(o.content.length / 1000)
  }).select().single();

  if (error) return NextResponse.json({ error: 'Insert failed', details: error }, { status: 500 });
  void notify({
    text: [
      `✅ *Blog published*`,
      ``,
      `*${esc(o.title)}*`,
      `_${esc(o.category)}_ · ${o.content.length} chars · ${provider.model}`,
      ``,
      `[View on site](https://f1rec.com/blog/${o.slug})`
    ].join('\n')
  });
  return NextResponse.json({ status: 'published', post });
});
