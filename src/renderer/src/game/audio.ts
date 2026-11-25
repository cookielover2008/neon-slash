let audioCtx: AudioContext | null = null
let master: GainNode | null = null

export function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    const comp = audioCtx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 24
    comp.ratio.value = 6
    comp.attack.value = 0.003
    comp.release.value = 0.25
    master = audioCtx.createGain()
    master.gain.value = 0.9
    master.connect(comp)
    comp.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

export function playTone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  freqEnd?: number,
  at = 0
): void {
  if (!audioCtx || !master) return
  const t = audioCtx.currentTime + at
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
  }
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + dur)
}

export function playNoise(dur: number, vol: number, fStart: number, fEnd: number): void {
  if (!audioCtx || !master) return
  const t = audioCtx.currentTime
  const len = Math.floor(audioCtx.sampleRate * dur)
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = audioCtx.createBufferSource()
  src.buffer = buf
  const flt = audioCtx.createBiquadFilter()
  flt.type = 'lowpass'
  flt.frequency.setValueAtTime(fStart, t)
  flt.frequency.exponentialRampToValueAtTime(fEnd, t + dur)
  const gain = audioCtx.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(flt).connect(gain).connect(master)
  src.start(t)
} 