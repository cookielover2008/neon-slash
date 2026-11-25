import * as THREE from 'three'
import type { HairBone } from './hair'

export const game = {
  kills: 0,
  hitStopT: 0,
  spawnTimer: 3
}

export type State = 'loco' | 'attack' | 'charge' | 'release' | 'dodge' | 'dead'

export const player = {
  x: 0,
  z: 0,
  facing: 0,
  rot: 0,
  yaw: 0,
  pitch: 0.3,
  hp: 100,
  hurtCd: 0,
  state: 'loco' as State,
  comboIndex: 0,
  comboQueued: false,
  chainWindowT: 0,
  comboCd: 0,
  attackCd: 0,
  attackT: 0,
  attackHitDone: false,
  curOneshot: null as THREE.AnimationAction | null,
  attackHeld: false,
  attackHeldT: 0,
  dodgeT: 0,
  dodgeCdT: 0,
  dodgeDir: { x: 0, z: 0 },
  shakeAmp: 0,
  deathT: 0,
  fovBump: 0,
  stepT: 0,
  slashTimer: 0,
  shockT: 0,
  swapT: 0,
  swapPopT: 0,
  aiming: false,
  fireCd: 0,
  fireFlash: 0,
  aimBlend: 0
}


export const keys: Record<string, boolean> = {}

export type Hero = {
  name: string
  accent: string
  accentRGB: [number, number, number]
  grad: string
  root: THREE.Group | null
  model: THREE.Group | null
  mixer: THREE.AnimationMixer | null
  clips: Record<string, THREE.AnimationClip>
  ownClips: Set<string>
  boneRest: Map<string, THREE.Quaternion>
  hairBones: HairBone[]
  hairReset: boolean
  currentAction: THREE.AnimationAction | null
  currentIsLoop: boolean
}

export const heroes: Hero[] = [
  {
    name: 'ГЕРОЙ 1',
    accent: '#7df3ff',
    accentRGB: [0.5, 0.95, 1],
    grad: 'linear-gradient(90deg,#2fd4ff,#7dffcf)',
    root: null,
    model: null,
    mixer: null,
    clips: {},
    ownClips: new Set<string>(),
    boneRest: new Map<string, THREE.Quaternion>(),
    hairBones: [],
    hairReset: true,
    currentAction: null,
    currentIsLoop: true
  },
  {
    name: 'ГЕРОЙ 2',
    accent: '#ff9de2',
    accentRGB: [1, 0.62, 0.9],
    grad: 'linear-gradient(90deg,#ff8de0,#ffb3f7)',
    root: null,
    model: null,
    mixer: null,
    clips: {},
    ownClips: new Set<string>(),
    boneRest: new Map<string, THREE.Quaternion>(),
    hairBones: [],
    hairReset: true,
    currentAction: null,
    currentIsLoop: true
  }
]

let heroIdx = 0

export function hero(): Hero {
  return heroes[heroIdx]
}

export function activeHeroIndex(): number {
  return heroIdx
}

export function setActiveHeroIndex(i: number): void {
  heroIdx = i
}

export function moveInput(): { x: number; z: number } {
  const fx = -Math.sin(player.yaw)
  const fz = -Math.cos(player.yaw)
  const rx = -fz
  const rz = fx
  let mx = 0
  let mz = 0
  if (keys['KeyW']) { mx += fx; mz += fz }
  if (keys['KeyS']) { mx -= fx; mz -= fz }
  if (keys['KeyA']) { mx -= rx; mz -= rz }
  if (keys['KeyD']) { mx += rx; mz += rz }
  return { x: mx, z: mz }
}

export const hooks = {
  onOneshotFinished: null as ((action: THREE.AnimationAction) => void) | null
}
