import type { BlogProvider, FactSheet, ProviderResult } from './types';

/**
 * Perplexity provider — STUBBED.
 *
 * To enable later:
 * 1. Add PERPLEXITY_API_KEY env var
 * 2. Uncomment the implementation below, remove the throw
 *
 * Notes:
 * - Use sonar-reasoning-pro (no live search) — we want grounded writing from our DB
 * - DO NOT use sonar-pro (live search) — facts must come from our fact sheet only
 */
export class PerplexityProvider implements BlogProvider {
  name = 'perplexity' as const;
  model = 'sonar-reasoning-pro';

  async generate(_bible: string, _factsheet: FactSheet): Promise<ProviderResult> {
    throw new Error(
      'PerplexityProvider is stubbed. Fill in perplexity.ts and set PERPLEXITY_API_KEY to enable.'
    );
  }
}
