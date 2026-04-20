// ── Web Audio sound engine ────────────────────────────────────────────────────

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch { return null }
}
let _audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = getAudioCtx()
  return _audioCtx
}
function resumeCtx() {
  const c = ctx(); if (c && c.state === 'suspended') c.resume()
}

export const SFX = {
  // Click generico — breve burst di rumore bianco filtrato
  click() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.8
    const g = c.createGain(); g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04)
    src.connect(f); f.connect(g); g.connect(c.destination)
    src.start(); src.stop(c.currentTime + 0.04)
  },

  // Tick roulette — click metallico secco
  tick() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const osc = c.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(900, c.currentTime); osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.02)
    const g = c.createGain(); g.gain.setValueAtTime(0.12, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.02)
    osc.connect(g); g.connect(c.destination)
    osc.start(); osc.stop(c.currentTime + 0.02)
  },

  // Slot settle — clack pesante quando si ferma
  settle() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, c.currentTime); osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.12)
    const g = c.createGain(); g.gain.setValueAtTime(0.35, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400
    osc.connect(f); f.connect(g); g.connect(c.destination)
    osc.start(); osc.stop(c.currentTime + 0.12)
  },

  // Dado — roll (rumore)
  diceRoll() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5) * 0.4
    const src = c.createBufferSource(); src.buffer = buf
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 1.5
    const g = c.createGain(); g.gain.value = 1
    src.connect(f); f.connect(g); g.connect(c.destination)
    src.start(); src.stop(c.currentTime + 0.3)
  },

  // Dado — thud (basso)
  diceThud() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(80, c.currentTime); osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.18)
    const g = c.createGain(); g.gain.setValueAtTime(0.5, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
    osc.connect(g); g.connect(c.destination)
    osc.start(); osc.stop(c.currentTime + 0.18)
  },

  // Round banner — gong impattante
  roundGong() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(220, c.currentTime); osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 1.2)
    const osc2 = c.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(330, c.currentTime); osc2.frequency.exponentialRampToValueAtTime(270, c.currentTime + 1.2)
    const g = c.createGain(); g.gain.setValueAtTime(0.0, c.currentTime); g.gain.linearRampToValueAtTime(0.45, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8)
    osc.connect(g); osc2.connect(g); g.connect(c.destination)
    osc.start(); osc2.start(); osc.stop(c.currentTime + 1.8); osc2.stop(c.currentTime + 1.8)
  },

  // Punto A — ding vittoria blu
  pointA() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const freqs = [523, 659, 784]
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq
      const g = c.createGain(); const t = c.currentTime + i * 0.1
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.connect(g); g.connect(c.destination)
      osc.start(t); osc.stop(t + 0.4)
    })
  },

  // Punto B — buzz sconfitta rosso
  pointB() {
    const c = ctx(); if (!c) return
    resumeCtx()
    const freqs = [784, 659, 523]
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq
      const g = c.createGain(); const t = c.currentTime + i * 0.1
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.connect(g); g.connect(c.destination)
      osc.start(t); osc.stop(t + 0.4)
    })
  },
}
