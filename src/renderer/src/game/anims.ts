import * as THREE from 'three'
import { CFG } from './config'
import { adaptClip } from './retarget'
import { loadFbxAny } from './loader'
import { hero, heroes, keys, player } from './state'

export const rawClips: Record<string, THREE.AnimationClip> = {}
export const rawRoots: Record<string, THREE.Object3D> = {}

export function loadClip(name: string, urls: string[]): void {
  loadFbxAny(
    urls,
    (fbx) => {
      if (fbx.animations.length === 0) {
        console.warn(name + '.fbx найден, но анимаций внутри нет')
        return
      }
      rawClips[name] = fbx.animations[0]
      rawRoots[name] = fbx
      for (const h of heroes) {
        if (h === heroes[1] && h.ownClips.has(name)) continue
        if (h.model && !h.clips[name]) {
          h.clips[name] = adaptClip(rawClips[name], rawRoots[name], h)
        }
      }
    },
    () => console.warn('Анимация ' + name + ' не найдена (пропускаю — есть запасные варианты)')
  )
}

export function attackClipFor(i: number): string | null {
  const h = hero()
  if (h.clips['attack' + (i + 1)]) return 'attack' + (i + 1)
  if (h.clips['attack']) return 'attack'
  return null
}

export function comboLength(): number {
  const h = hero()
  let n = 0
  while (h.clips['attack' + (n + 1)]) n++
  if (n === 0 && h.clips['attack']) return 1
  return n
}

export function play(name: string, fade: number, loop = true, timeScale = CFG.animSpeed): void {
  const h = hero()
  if (!h.mixer || !h.clips[name]) return
  const next = h.mixer.clipAction(h.clips[name])
  if (loop) next.setLoop(THREE.LoopRepeat, Infinity)
  else {
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
  }
  next.timeScale = timeScale
  if (h.currentAction === next) {
    if (loop) return
    next.reset().play()
    return
  }
  next.reset().fadeIn(fade).play()
  if (loop && h.currentIsLoop && h.currentAction) {
    const srcDur = h.currentAction.getClip().duration
    if (srcDur > 0) {
      next.time = (h.currentAction.time / srcDur) * next.getClip().duration
    }
  }
  h.currentAction?.fadeOut(fade)
  h.currentAction = next
  h.currentIsLoop = loop
}

export function playLoco(fade = CFG.locoFade): void {
  const movingNow =
    keys['KeyW'] === true || keys['KeyA'] === true || keys['KeyS'] === true || keys['KeyD'] === true
  const h = hero()
  if (h === heroes[1] && (h.clips['shoot'] || h.clips['aim_run'] || h.clips['walk_shoot'])) {
    if (player.fireFlash > 0) {
      const name = movingNow ? 'walk_shoot' : 'shoot'
      if (h.clips[name]) {
        play(name, Math.min(fade, 0.08), true, CFG.aimAnimSpeed)
        return
      }
    } else if (player.aiming) {
      const name = movingNow ? 'aim_run' : 'shoot'
      if (h.clips[name]) {
        play(name, fade, true, movingNow ? CFG.animSpeed : CFG.aimAnimSpeed)
        return
      }
    }
  }
  if (!movingNow) {
    play('idle', fade)
    return
  }
  const sprint = keys['ShiftLeft'] === true
  const want = sprint || !h.clips['walk'] ? 'run' : 'walk'
  const fallback =
    want === 'run' ? (h.clips['walk'] ? 'walk' : 'idle') : h.clips['run'] ? 'run' : 'idle'
  const tempo = CFG.animSpeed * (sprint ? CFG.runTimeScale : 1)
  play(h.clips[want] ? want : fallback, fade, true, tempo)
}

loadClip('idle', ['idle.fbx', 'models/idle.fbx'])
loadClip('run', ['run.fbx', 'models/run.fbx'])
loadClip('walk', ['walk.fbx', 'models/walk.fbx'])
loadClip('attack', ['attack.fbx', 'models/attack.fbx'])
loadClip('attack1', ['attack1.fbx', 'models/attack1.fbx'])
loadClip('attack2', ['attack2.fbx', 'models/attack2.fbx'])
loadClip('attack3', ['attack3.fbx', 'models/attack3.fbx'])
loadClip('attack4', ['attack4.fbx', 'models/attack4.fbx'])
loadClip('attack5', ['attack5.fbx', 'models/attack5.fbx'])
loadClip('charge', ['charge.fbx', 'models/charge.fbx'])
loadClip('charge_release', ['charge_release.fbx', 'models/charge_release.fbx'])
loadClip('dodge', ['dodge.fbx', 'models/dodge.fbx'])
