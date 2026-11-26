// Which parts of the site are switched on. A section that's off disappears from the menu, footer, home
// page and sitemap, and its pages return 404. Turning one back on is a one-word change here.
//
// Retired for the Sunday Grid relaunch (Nov 2026): the blog, memes, paddock and the old sim racing section
// (its product "reviews" were never hands-on tests). Their addresses redirect in next.config.ts; sim racing now
// lives on /sim (Sim Race Week) and Lap Doctor.
export const SECTIONS = {
  live: true,
  community: true,
  random: true,
} as const;

export type SectionKey = keyof typeof SECTIONS;

const PATH_SECTION: [prefix: string, key: SectionKey][] = [
  ['/live', 'live'],
  ['/community', 'community'],
  ['/random', 'random'],
];

/** Is the page at this path switched on? Paths outside the listed sections always are. */
export function pathEnabled(path: string): boolean {
  for (const [prefix, key] of PATH_SECTION) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return SECTIONS[key];
  }
  return true;
}
