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
          content: `Write a blog post for this race. Fact sheet:\n\n${JSON.stringify(factsheet, null, 2)}`
        },
        {
          role: 'assistant',
          content: '{'
        }
      ]
    });

    const firstBlock = completion.content[0];
    const modelText = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
    // We prefilled the assistant turn with '{', so prepend it back to reconstruct the full JSON
    const raw_text = '{' + modelText;

    // Strip common markdown wrappers Claude sometimes adds
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
