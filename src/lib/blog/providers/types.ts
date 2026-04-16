export type BlogProviderName = 'anthropic' | 'perplexity';

export type FactSheet = Record<string, any>;

export interface LLMOutput {
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  category: string;
  related_race_slug: string | null;
  related_driver_slug: string | null;
  content: string;
}

export interface LLMErrorOutput {
  error: string;
  details?: string;
}

export interface ProviderResult {
  parsed: LLMOutput | LLMErrorOutput;
  raw_text: string;
  input_tokens: number;
  output_tokens: number;
  generation_ms: number;
  model: string;
}

export interface BlogProvider {
  name: BlogProviderName;
  model: string;
  generate(bible: string, factsheet: FactSheet): Promise<ProviderResult>;
}
