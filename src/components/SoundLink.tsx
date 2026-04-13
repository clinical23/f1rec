'use client'

import Link from 'next/link'
import { useSound } from '@/components/SoundProvider'

type Props = {
  href: string
  soundId?: string
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export default function SoundLink({ href, soundId = 'click', children, style, className }: Props) {
  const { playSound } = useSound()

  return (
    <Link href={href} className={className} style={style} onClick={() => playSound(soundId)}>
      {children}
    </Link>
  )
}
