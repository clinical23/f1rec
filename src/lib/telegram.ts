/**
 * Telegram notification helper.
 * Import notify() anywhere in the server codebase.
 * Never call from client components — leaks bot token.
 */

type NotifyOptions = {
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  silent?: boolean;
};

export async function notify(opts: NotifyOptions | string): Promise<void> {
  const options: NotifyOptions = typeof opts === 'string' ? { text: opts } : opts;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[telegram] skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.text,
        parse_mode: options.parseMode ?? 'Markdown',
        disable_notification: options.silent ?? false,
        disable_web_page_preview: false
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[telegram] send failed: ${res.status} ${body}`);
    }
  } catch (e: any) {
    console.error('[telegram] exception:', e.message);
  }
}

/** Redact an email for privacy (j***@d***.com) */
export function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const redactedLocal = local[0] + '***';
  const [domainName, ...tld] = domain.split('.');
  const redactedDomain = domainName[0] + '***.' + tld.join('.');
  return `${redactedLocal}@${redactedDomain}`;
}

/** Markdown-safe escaper for dynamic content */
export function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/** Wraps an async route handler — notifies on unhandled exceptions, then rethrows */
export function withCrashNotify<T extends (...args: any[]) => Promise<any>>(
  name: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (e: any) {
      await notify({
        text: [
          `🔥 *Unhandled exception*`,
          `Route: \`${esc(name)}\``,
          `Error: \`${esc(e.message?.slice(0, 500) ?? 'unknown')}\``
        ].join('\n')
      });
      throw e;
    }
  }) as T;
}
