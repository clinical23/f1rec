import { NextRequest, NextResponse } from 'next/server';
import { seasonCatchup } from '@/lib/jolpica/season-catchup';
import { notify, esc } from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Hourly (vercel.json). Brings the current season's calendar, results and standings up to date from
// Jolpica; does nothing once everything is current. See src/lib/jolpica/season-catchup.ts.
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get('authorization') === `Bearer ${secret}`;
  // Without CRON_SECRET, accept only Vercel's own scheduler. The job only copies public results from
  // Jolpica, so the worst a spoofed call can do is run it early.
  return (req.headers.get('user-agent') ?? '').startsWith('vercel-cron/');
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const season = new Date().getUTCFullYear();
  try {
    const report = await seasonCatchup(season);
    const changed =
      report.calendar.updated.length + report.calendar.inserted.length + report.drivers_added.length +
      report.sessions.filter((s) => s.status === 'ok').length;
    console.log(`[season-catchup] ${JSON.stringify(report)}`);
    if (changed || report.errors.length || report.calendar.refused.length) {
      const ok = report.sessions.filter((s) => s.status === 'ok');
      await notify({
        text:
          `<b>F1Rec season catch-up ${season}</b>\n` +
          `Calendar: ${report.calendar.updated.length} moved, ${report.calendar.inserted.length} added` +
          (report.calendar.not_on_calendar.length ? `, not on the official calendar: ${esc(report.calendar.not_on_calendar.join(', '))}` : '') +
          `\nSessions imported: ${ok.length} (${ok.reduce((n, s) => n + s.rows, 0)} rows)` +
          (report.drivers_added.length ? `\nDrivers added: ${esc(report.drivers_added.join(', '))}` : '') +
          (report.standings ? `\nStandings: ${report.standings.drivers} drivers, ${report.standings.teams} teams` : '') +
          (report.calendar.refused.length ? `\nLeft alone: ${esc(report.calendar.refused.join('; '))}` : '') +
          (report.errors.length ? `\nErrors: ${esc(report.errors.slice(0, 5).join('; '))}` : '') +
          (report.stopped_early ? '\n(More to do: continues next hour.)' : ''),
        parseMode: 'HTML',
        silent: true,
      });
    }
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[season-catchup] failed: ${msg}`);
    await notify({ text: `<b>F1Rec season catch-up failed</b>\n${esc(msg)}`, parseMode: 'HTML' });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
