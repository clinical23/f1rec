// Which parts of the site are switched on. A section that's off disappears from the menu, footer, home
// page and sitemap, and its pages return 404. Turning one back on is a one-word change here.
//
// Sim racing is off for launch (T, 9 Nov 2026): its product "reviews" were written as hands-on tests that
// didn't happen, and the affiliate links carry no tracking yet. Products, setups and the rig builder come
// back with it once the reviews are rewritten or actually tested.
export const SECTIONS = {
  simRacing: false,
  live: true,
  community: true,
  paddock: true,
  memes: true,
  random: true,
  blog: true,
} as const;

export type SectionKey = keyof typeof SECTIONS;

const PATH_SECTION: [prefix: string, key: SectionKey][] = [
  ['/sim-racing', 'simRacing'],
  ['/live', 'live'],
  ['/community', 'community'],
  ['/paddock', 'paddock'],
  ['/memes', 'memes'],
  ['/random', 'random'],
  ['/blog', 'blog'],
];

/** Is the page at this path switched on? Paths outside the listed sections always are. */
export function pathEnabled(path: string): boolean {
  for (const [prefix, key] of PATH_SECTION) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return SECTIONS[key];
  }
  return true;
}
