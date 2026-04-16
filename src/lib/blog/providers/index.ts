import type { BlogProvider, BlogProviderName } from './types';
import { AnthropicProvider } from './anthropic';
import { PerplexityProvider } from './perplexity';

export function getProvider(name: BlogProviderName): BlogProvider {
  switch (name) {
    case 'anthropic': return new AnthropicProvider();
    case 'perplexity': return new PerplexityProvider();
    default: throw new Error(`Unknown provider: ${name}`);
  }
}

export function getDefaultProvider(): BlogProvider {
  const name = (process.env.BLOG_LLM_PROVIDER ?? 'anthropic') as BlogProviderName;
  return getProvider(name);
}
