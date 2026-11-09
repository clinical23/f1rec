import { notFound } from 'next/navigation'
import { SECTIONS } from '@/lib/features'

// Sim racing is switched off for launch (src/lib/features.ts): every page under /sim-racing is a 404.
export default function SimRacingLayout({ children }: { children: React.ReactNode }) {
  if (!SECTIONS.simRacing) notFound()
  return children
}
