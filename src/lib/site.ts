// One place for the site's name and address. NEXT_PUBLIC_SITE_URL (Vercel) wins; the fallback is the new home.
export const SITE_NAME = 'Sunday Grid'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sundaygrid.co.uk').replace(/\/$/, '')

/** Links to Lap Doctor, tagged so its analytics can see they came from Sunday Grid. */
export const lapDoctor = (path: string) => `https://lapdoctor.gg${path}${path.includes('?') ? '&' : '?'}from=sundaygrid`
