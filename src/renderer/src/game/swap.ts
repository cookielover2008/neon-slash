import { CFG } from './config'
import { activeHeroIndex, heroes, hero, moveInput, player, setActiveHeroIndex } from './state'
import { burst, makeRing } from './vfx'
import { playNoise, playTone } from './audio'
import { flashVig, heroLabel, swapVig, updateHpBar } from './hud'
import { playLoco } from './anims'

const swapRingFx = makeRing('#7df3ff', 0.5, 0.72)
let swapRingT = 0

export function trySwapTo(index: number): void {
  if (index !== 0 && index !== 1) return
  if (index === activeHeroIndex()) return
  if (player.state !== 'loco' && player.state !== 'attack') return
  if (player.swapPopT > 0) return
  const next = heroes[index]
  if (!next.root) {
    console.log('Свап: герой ' + (index + 1) + ' ещё не загрузился')
    return
  }
  if (player.state === 'attack') {
    player.curOneshot = null
    player.comboIndex = 0
    player.comboQueued = false
    player.chainWindowT = 0
  }
  const old = hero()
  old.currentAction?.fadeOut(0.08)
  old.currentAction = null
  if (old.root) old.root.visible = false
  setActiveHeroIndex(index)
  next.hairReset = true
  next.root.visible = true
  next.root.scale.setScalar(0.75)
  player.curOneshot = null
  player.state = 'loco'
  player.aiming = false
  player.swapT = CFG.swapInvuln
  player.swapPopT = CFG.swapPop
  {
    const inp = moveInput()
    let dx = inp.x
    let dz = inp.z
    const l = Math.hypot(dx, dz)
    if (l > 0.001) {
      dx /= l
      dz /= l
    } else {
      dx = -Math.sin(player.yaw)
      dz = -Math.cos(player.yaw)
    }
    const bX = CFG.arenaHalfX - 0.5
    const bZ = CFG.arenaHalfZ - 0.5
    player.x = Math.max(-bX, Math.min(bX, player.x + dx * 0.7))
    player.z = Math.max(-bZ, Math.min(bZ, player.z + dz * 0.7))
    player.facing = Math.atan2(dx, dz)
  }
  swapRingFx.mesh.position.set(player.x, 0.07, player.z)
  swapRingFx.mat.color.set(next.accent)
  swapRingFx.mesh.visible = true
  swapRingT = 0.35
  flashVig(swapVig, 0.6)
  burst(player.x, 1.0, player.z, 18, 3.2, 1.8, old.accentRGB[0], old.accentRGB[1], old.accentRGB[2], 5)
  burst(player.x, 1.0, player.z, 18, 3.2, 1.8, next.accentRGB[0], next.accentRGB[1], next.accentRGB[2], 5)
  playTone(520, 0.12, 'sine', 0.1, 1040)
  playTone(780, 0.2, 'sine', 0.08, undefined, 0.06)
  playNoise(0.18, 0.09, 1800, 300)
  heroLabel.textContent = next.name
  heroLabel.style.color = next.accent
  updateHpBar()
  playLoco(0.05)
}

export function updateSwapRing(dt: number): void {
  if (swapRingT > 0) {
    swapRingT -= dt
    const k = Math.max(swapRingT / 0.35, 0)
    swapRingFx.mesh.scale.setScalar(0.6 + (1 - k) * 3.4)
    swapRingFx.mat.opacity = k * 0.85
    if (swapRingT <= 0) swapRingFx.mesh.visible = false
  }
} 