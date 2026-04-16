import Anthropic from '@anthropic-ai/sdk';
import type { BlogProvider, FactSheet, ProviderResult } from './types';

export class AnthropicProvider implements BlogProvider {
  name = 'anthropic' as const;
  model = 'claude-sonnet-4-6';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }

  async generate(bible: string, factsheet: FactSheet): Promise<ProviderResult> {
    const start = Date.now();

    const completion = await this.client.messages.create({
      model: this.model,
      max_tokens: 3000,
      system: [
        {
          type: 'text',
          text: bible,
          cache_control: { type: 'ephemeral' } // 90% cost discount on the bible after first call
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Write a blog post for this race. Return ONLY the JSON object, with no markdown code fences, no preamble, no trailing commentary. The first character of your response must be { and the last character must be }.\n\nFact sheet:\n\n${JSON.stringify(factsheet, null, 2)}`
        }
      ]
    });

    const firstBlock = completion.content[0];
    const raw_text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

    // Strip common markdown wrappers Claude sometimes adds, even when asked not to
    const cleaned = raw_text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { error: 'invalid_json', details: 'Model returned non-JSON text even after stripping code fences' };
    }

    return {
      parsed,
      raw_text,
      input_tokens: completion.usage.input_tokens,
      output_tokens: completion.usage.output_tokens,
      generation_ms: Date.now() - start,
      model: this.model
    };
  }
}
