'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type SoundContextValue = {
  soundEnabled: boolean
  toggleSound: () => void
  playSound: (id: string) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)
const STORAGE_KEY = 'f1rec-sound'
const GLOBAL_VOLUME = 0.3

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setSoundEnabled(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(soundEnabled))
  }, [soundEnabled])

  const ensureCtx = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }, [])

  const resumeCtx = useCallback(async () => {
    const ctx = ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
  }, [ensureCtx])

  const createMaster = useCallback((ctx: AudioContext, start = ctx.currentTime) => {
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(GLOBAL_VOLUME, start)
    gain.connect(ctx.destination)
    return gain
  }, [])

  const playTone = useCallback((ctx: AudioContext, opts: {
    type?: OscillatorType
    freq: number
    start: number
    duration: number
    volume?: number
    endFreq?: number
    vibrato?: boolean
  }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = opts.type || 'sine'
    osc.frequency.setValueAtTime(opts.freq, opts.start)
    if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), opts.start + opts.duration)
    if (opts.vibrato) {
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 8
      lfoGain.gain.value = 18
      lfo.connect(lfoGain).connect(osc.frequency)
      lfo.start(opts.start)
      lfo.stop(opts.start + opts.duration)
    }
    const volume = opts.volume ?? 1
    gain.gain.setValueAtTime(0.001, opts.start)
    gain.gain.exponentialRampToValueAtTime(0.001 + volume, opts.start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, opts.start + opts.duration)
    osc.connect(gain)
    osc.start(opts.start)
    osc.stop(opts.start + opts.duration + 0.02)
    return gain
  }, [])

  const playNoiseBurst = useCallback((ctx: AudioContext, opts: {
    start: number
    duration: number
    volume?: number
    filterType?: BiquadFilterType
    filterFreq?: number
    q?: number
    highPass?: number
  }) => {
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * opts.duration))
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < sampleCount; i += 1) channel[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, opts.start)
    gain.gain.exponentialRampToValueAtTime((opts.volume ?? 1) + 0.001, opts.start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, opts.start + opts.duration)

    let tail: AudioNode = gain
    if (opts.filterType) {
      const filter = ctx.createBiquadFilter()
      filter.type = opts.filterType
      filter.frequency.value = opts.filterFreq ?? 1200
      filter.Q.value = opts.q ?? 1
      source.connect(filter)
      filter.connect(gain)
      tail = gain
    } else {
      source.connect(gain)
    }

    if (opts.highPass) {
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = opts.highPass
      tail.connect(hp)
      tail = hp
    }

    source.start(opts.start)
    source.stop(opts.start + opts.duration + 0.02)
    return tail
  }, [])

  const playSound = useCallback((id: string) => {
    if (!soundEnabled) return
    const ctx = ensureCtx()
    if (!ctx) return
    void resumeCtx()
    const start = ctx.currentTime + 0.005
    const master = createMaster(ctx, start)

    if (id === 'home') {
      for (let i = 0; i < 5; i += 1) {
        playTone(ctx, { type: 'square', freq: 1200, start: start + i * 0.11, duration: 0.08, volume: 0.4 }).connect(master)
      }
      playTone(ctx, { type: 'sawtooth', freq: 420, start: start + 0.6, duration: 0.35, volume: 0.45 }).connect(master)
      return
    }
    if (id === 'drivers') {
      playNoiseBurst(ctx, { start, duration: 0.22, volume: 0.35, filterType: 'bandpass', filterFreq: 1400, q: 3 }).connect(master)
      playTone(ctx, { type: 'sine', freq: 900, start: start + 0.03, duration: 0.09, volume: 0.3 }).connect(master)
      return
    }
    if (id === 'teams') {
      playTone(ctx, { type: 'sine', freq: 80, start, duration: 0.34, volume: 0.5, endFreq: 58 }).connect(master)
      return
    }
    if (id === 'races') {
      playTone(ctx, { type: 'sawtooth', freq: 200, endFreq: 8000, start, duration: 1, volume: 0.45, vibrato: true }).connect(master)
      return
    }
    if (id === 'seasons') {
      playTone(ctx, { type: 'triangle', freq: 523, start, duration: 0.15, volume: 0.35 }).connect(master)
      playTone(ctx, { type: 'triangle', freq: 659, start: start + 0.17, duration: 0.15, volume: 0.35 }).connect(master)
      return
    }
    if (id === 'compare') {
      playTone(ctx, { type: 'sine', freq: 2000, start, duration: 0.38, volume: 0.35 }).connect(master)
      playTone(ctx, { type: 'sine', freq: 1900, start: start + 0.22, duration: 0.38, volume: 0.32 }).connect(master)
      return
    }
    if (id === 'leaderboards') {
      playNoiseBurst(ctx, { start, duration: 0.02, volume: 0.5 }).connect(master)
      playNoiseBurst(ctx, { start: start + 0.02, duration: 0.5, volume: 0.3, filterType: 'highpass', filterFreq: 2500 }).connect(master)
      return
    }
    if (id === 'community') {
      playNoiseBurst(ctx, { start, duration: 0.4, volume: 0.35, filterType: 'bandpass', filterFreq: 1200, q: 0.8 }).connect(master)
      return
    }
    if (id === 'sim-racing') {
      playTone(ctx, { type: 'sawtooth', freq: 400, endFreq: 600, start, duration: 0.8, volume: 0.35, vibrato: true }).connect(master)
      return
    }
    if (id === 'memes') {
      playTone(ctx, { type: 'triangle', freq: 1000, endFreq: 200, start, duration: 0.4, volume: 0.35 }).connect(master)
      return
    }
    if (id === 'wheel-gun') {
      const duration = 0.5
      const clickRate = 36
      for (let i = 0; i < duration * clickRate; i += 1) {
        const t = start + i / clickRate
        playNoiseBurst(ctx, { start: t, duration: 0.009, volume: 0.3, filterType: 'bandpass', filterFreq: 2000, q: 5 }).connect(master)
      }
      return
    }

    // default click
    playTone(ctx, { type: 'square', freq: 920, start, duration: 0.05, volume: 0.2 }).connect(master)
  }, [createMaster, ensureCtx, playNoiseBurst, playTone, resumeCtx, soundEnabled])

  const toggleSound = useCallback(() => {
    if (!soundEnabled) void resumeCtx()
    setSoundEnabled((v) => !v)
  }, [resumeCtx, soundEnabled])

  const value = useMemo(() => ({
    soundEnabled,
    toggleSound,
    playSound,
  }), [soundEnabled, toggleSound, playSound])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) {
    throw new Error('useSound must be used inside SoundProvider')
  }
  return ctx
}
