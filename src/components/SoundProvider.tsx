'use client'
import { createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode } from 'react'

interface SoundContextType {
  soundEnabled: boolean
  toggleSound: () => void
  playSound: (id: string) => void
}

const SoundContext = createContext<SoundContextType>({
  soundEnabled: false,
  toggleSound: () => {},
  playSound: () => {},
})

export const useSound = () => useContext(SoundContext)

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    const saved = localStorage.getItem('f1rec-sound')
    if (saved === 'true') setSoundEnabled(true)
  }, [])

  useEffect(() => {
    const sounds = [
      'home', 'drivers', 'teams', 'races', 'seasons', 'compare',
      'leaderboards', 'community', 'sim-racing', 'memes', 'wheel-gun', 'click'
    ]
    sounds.forEach(id => {
      const audio = new Audio(`/sounds/${id}.mp3`)
      audio.preload = 'auto'
      audio.volume = 0.3
      audioCache.current.set(id, audio)
    })
  }, [])

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      localStorage.setItem('f1rec-sound', String(next))
      if (next) getCtx() // init audio context on first enable
      return next
    })
  }, [getCtx])

  const playSound = useCallback((id: string) => {
    if (!soundEnabled) return
    const audio = audioCache.current.get(id)
    if (audio) {
      audio.currentTime = 0
      audio.volume = 0.3
      audio.play().catch(() => {})
    }
  }, [soundEnabled])

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  )
}
