import type { LLMOutput, FactSheet } from './providers/types';

const BANNED_PHRASES = [
  'in the world of', 'when it comes to', "it's no secret", 'fast-paced', 'buckle up',
  "let's dive in", 'strap in', 'delve', 'unleash', 'game-changing', 'revolutionary',
  'at its core', 'embark', 'tapestry', 'testament to', 'thrilling', 'nail-biting',
  'edge-of-your-seat', 'rollercoaster', 'sensational', 'premier destination',
  'one-stop shop', 'top-of-the-line', 'cutting-edge'
];

const TITLE_PREFIX_REGEX = /^(title|post|article|draft|#|\*)\s*[:.]?/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_LINK_REGEX = /\[[^\]]+\]\(\/(drivers|teams|seasons|compare)[^)]*\)/g;
const ALLOWED_CATEGORIES = ['race-review', 'driver-analysis', 'season-preview', 'history', 'tech'];

export function validatePost(o: any, factsheet: FactSheet): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!o || typeof o !== 'object') return { valid: false, reasons: ['not_an_object'] };

  // 1. Required fields
  for (const f of ['title', 'slug', 'excerpt', 'meta_description', 'category', 'content']) {
    if (!o[f] || typeof o[f] !== 'string') reasons.push(`missing_or_invalid_field:${f}`);
  }
  if (reasons.length > 0) return { valid: false, reasons };

  const post = o as LLMOutput;

  // 2. Title prefix
  if (TITLE_PREFIX_REGEX.test(post.title)) reasons.push('title_has_banned_prefix');

  // 3. Title length
  if (post.title.length < 40 || post.title.length > 80) {
    reasons.push(`title_length_out_of_range:${post.title.length}`);
  }

  // 4. Slug format + length + word boundary
  if (!SLUG_REGEX.test(post.slug)) reasons.push('slug_format_invalid');
  if (post.slug.length > 80) reasons.push(`slug_too_long:${post.slug.length}`);
  const lastSegment = post.slug.split('-').pop() ?? '';
  if (lastSegment.length < 3) reasons.push(`slug_truncated_mid_word:${lastSegment}`);

  // 5. Category
  if (!ALLOWED_CATEGORIES.includes(post.category)) {
    reasons.push(`category_invalid:${post.category}`);
  }

  // 6. Excerpt length
  if (post.excerpt.length < 140 || post.excerpt.length > 200) {
    reasons.push(`excerpt_length_out_of_range:${post.excerpt.length}`);
  }

  // 7. Meta description length
  if (post.meta_description.length < 140 || post.meta_description.length > 160) {
    reasons.push(`meta_description_length_out_of_range:${post.meta_description.length}`);
  }

  // 8. Content length (3000-5500 chars; 5000 was too tight, Sonnet regularly landed in 5000-5200 range)
  if (post.content.length < 3000 || post.content.length > 5500) {
    reasons.push(`content_length_out_of_range:${post.content.length}`);
  }

  // 9. related_race_slug must match factsheet
  if (post.related_race_slug && factsheet?.race?.slug) {
    if (post.related_race_slug !== factsheet.race.slug) {
      reasons.push(`related_race_slug_mismatch:claimed=${post.related_race_slug},factsheet=${factsheet.race.slug}`);
    }
  }

  // 10. related_driver_slug must be a slug present in the fact sheet
  if (post.related_driver_slug && factsheet?.race) {
    const knownSlugs = new Set<string>();
    if (factsheet.race.winner_slug) knownSlugs.add(factsheet.race.winner_slug);
    if (factsheet.race.pole_slug) knownSlugs.add(factsheet.race.pole_slug);
    if (factsheet.race.fastest_lap_slug) knownSlugs.add(factsheet.race.fastest_lap_slug);
    for (const r of (factsheet.top_10_results ?? [])) {
      if (r.driver_slug) knownSlugs.add(r.driver_slug);
    }
    if (!knownSlugs.has(post.related_driver_slug)) {
      reasons.push(`related_driver_slug_not_in_factsheet:${post.related_driver_slug}`);
    }
  }

  // 11. At least 4 internal links
  const linkCount = (post.content.match(INTERNAL_LINK_REGEX) ?? []).length;
  if (linkCount < 4) reasons.push(`too_few_internal_links:${linkCount}`);

  // 12. Banned phrases
  const contentLower = post.content.toLowerCase();
  const hits = BANNED_PHRASES.filter(p => contentLower.includes(p));
  if (hits.length > 0) reasons.push(`banned_phrases:${hits.join('|')}`);

  return { valid: reasons.length === 0, reasons };
}
