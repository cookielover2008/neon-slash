import * as THREE from 'three'
import { CFG } from './config'
import { hero, heroes, player } from './state'
import { adaptClip, normBone } from './retarget'
import { playLoco } from './anims'
import { cands, loadFbxAny } from './loader'
import { camera, scene } from './world'
import { burst } from './vfx'
import { drones, killDrone } from './drones'
import { playNoise, playTone } from './audio'

export const hero2Clips: Record<string, { clip: THREE.AnimationClip; root: THREE.Object3D | null }> = {}

const TAKE_KEYS = [
  'charge_release', 'walk_shoot', 'aim_run', 'shoot', 'attack1', 'attack2', 'attack3', 'attack4',
  'attack5', 'charge', 'attack', 'dodge', 'idle', 'walk', 'run'
]

export function bakeHero2Clip(name: string, force = false): void {
  const h = heroes[1]
  const c = hero2Clips[name]
  if (!h.model || !c) return
  if (!force && h.ownClips.has(name)) return
  h.clips[name] = adaptClip(c.clip, c.root, h)
  h.ownClips.add(name)
  if (h === hero() && player.state === 'loco') playLoco(0.05)
}

export function loadHero2Clip(name: string, urls: string[]): void {
  loadFbxAny(
    urls,
    (fbx) => {
      if (fbx.animations.length === 0) {
        console.warn('Герой 2, ' + name + ': fbx найден, но анимаций внутри нет')
        return
      }
      hero2Clips[name] = { clip: fbx.animations[0], root: fbx }
      heroes[1].ownClips.add(name)
      bakeHero2Clip(name, true)
    },
    () => console.log('Анимация героя 2 «' + name + '» не найдена — играет общий клип, если он лег')
  )
}

export function loadHero2Bundle(urls: string[]): void {
  loadFbxAny(
    urls,
    (fbx) => {
      if (fbx.animations.length === 0) {
        console.warn('Пачка анимаций героя 2 пуста: анимаций внутри нет')
        return
      }
      let found = 0
      for (const anim of fbx.animations) {
        const n = normBone(anim.name || '')
        for (const k of TAKE_KEYS) {
          if (n.indexOf(k) >= 0) {
            if (!hero2Clips[k]) {
              hero2Clips[k] = { clip: anim, root: fbx }
              heroes[1].ownClips.add(k)
              found++
            }
            break
          }
        }
      }
      console.log('Пачка героя 2 (p2_anims.fbx): распознано тейков ' + found + ' из ' + fbx.animations.length)
      for (const k of Object.keys(hero2Clips)) bakeHero2Clip(k)
    },
    () => console.log('Пачка p2_anims.fbx не найдена — ок, если используешь отдельные файлы')
  )
}

for (const k of Object.keys(CFG.hero2Anims)) loadHero2Clip(k, cands(...CFG.hero2Anims[k]))
loadHero2Bundle(cands('p2_anims.fbx'))
const tracerMat = new THREE.MeshBasicMaterial({
  color: '#ffe9b0',
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})
const tracerGeo = new THREE.BoxGeometry(0.035, 0.035, 1)
type Tracer = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }
const tracers: Tracer[] = []
for (let i = 0; i < 10; i++) {
  const mat = tracerMat.clone()
  const mesh = new THREE.Mesh(tracerGeo, mat)
  mesh.visible = false
  scene.add(mesh)
  tracers.push({ mesh, mat, life: 0 })
}
const muzzleLight = new THREE.PointLight('#ffd9a0', 0, 7, 2)
scene.add(muzzleLight)

const ray = new THREE.Raycaster()
const _dir = new THREE.Vector3()
const _toC = new THREE.Vector3()
const _muzzle = new THREE.Vector3()
const _end = new THREE.Vector3()
let handBone: THREE.Object3D | null = null

function findHand(root: THREE.Object3D): THREE.Object3D | null {
  const hits: THREE.Object3D[] = []
  root.traverse((o) => {
    if (hits.length === 0 && normBone(o.name) === 'righthand') hits.push(o)
  })
  return hits.length > 0 ? hits[0] : null
}

function muzzlePos(): THREE.Vector3 {
  const h = heroes[1]
  if (h.model) {
    if (!handBone) handBone = findHand(h.model)
    if (handBone) return handBone.getWorldPosition(_muzzle)
  }
  return _muzzle.set(
    player.x - Math.sin(player.yaw) * 0.45,
    1.35,
    player.z - Math.cos(player.yaw) * 0.45
  )
}

function spawnTracer(a: THREE.Vector3, b: THREE.Vector3): void {
  const len = a.distanceTo(b)
  if (len < 0.05) return
  let t = tracers[0]
  for (const x of tracers) {
    if (x.life <= 0) {
      t = x
      break
    }
  }
  t.mesh.position.copy(a).lerp(b, 0.5)
  t.mesh.lookAt(b)
  t.mesh.scale.set(1, 1, len)
  t.mesh.visible = true
  t.life = CFG.tracerLife
}

export function tryShoot(): void {
  if (hero() !== heroes[1]) return
  if (player.state !== 'loco') return
  if (player.fireCd > 0) return
  player.fireCd = CFG.fireInterval
  player.fireFlash = CFG.fireFlash
  camera.getWorldDirection(_dir)
  if (!player.aiming) {
    _dir.x += (Math.random() - 0.5) * 2 * CFG.spreadHip
    _dir.y += (Math.random() - 0.5) * 2 * CFG.spreadHip
    _dir.z += (Math.random() - 0.5) * 2 * CFG.spreadHip
    _dir.normalize()
  }
  ray.set(camera.position, _dir)
  ray.near = 0.3
  ray.far = CFG.hero2Range
  const rawHits = ray.intersectObjects(scene.children, true)
  const hits = rawHits.filter((h) => {
  if (!(h.object as THREE.Mesh).isMesh) return false
  let p: THREE.Object3D | null = h.object
  while (p) {
    if (p === hero().root) return false
    p = p.parent
  }
  return true
})
  const muzzle = muzzlePos().clone()
  let end: THREE.Vector3 | null = null
  let idx = -1
  if (hits.length > 0) {
    end = hits[0].point.clone()
    let o: THREE.Object3D | null = hits[0].object
    while (o) {
      idx = drones.findIndex((d) => d.group === o)
      if (idx >= 0) break
      o = o.parent
    }
    if (idx >= 0) {
      drones[idx].hp -= CFG.bulletDamage
      drones[idx].punch = 1
      burst(end.x, end.y, end.z, 5, 2.2, 1.2, 1, 0.85, 0.55, 5)
      if (drones[idx].hp <= 0) killDrone(idx)
    }
  }
  if (idx < 0) {
    let best = 1.2
    for (let i = 0; i < drones.length; i++) {
      _toC.copy(drones[i].group.position).sub(camera.position)
      const along = _toC.dot(_dir)
      if (along < 0.5) continue
      const perp = Math.sqrt(Math.max(_toC.lengthSq() - along * along, 0))
      if (perp <= best) {
        best = perp
        idx = i
      }
    }
    if (idx >= 0) {
      const ap = drones[idx].group.position.clone()
      end = ap
      drones[idx].hp -= CFG.bulletDamage
      drones[idx].punch = 1
      burst(ap.x, ap.y, ap.z, 5, 2.2, 1.2, 1, 0.85, 0.55, 5)
      if (drones[idx].hp <= 0) killDrone(idx)
    }
  }
  const target = end ?? _end.copy(camera.position).addScaledVector(_dir, 60)
  spawnTracer(muzzle, target)
  muzzleLight.position.copy(muzzle)
  muzzleLight.intensity = 30
  player.shakeAmp = Math.max(player.shakeAmp, 0.02)
  player.pitch = Math.max(0.05, player.pitch - 0.009)
  playNoise(0.06, 0.06, 2800, 500)
  playTone(170, 0.06, 'square', 0.05, 60)
}

export function updateShootingFx(dt: number): void {
  player.fireCd = Math.max(0, player.fireCd - dt)
  player.fireFlash = Math.max(0, player.fireFlash - dt)
  muzzleLight.intensity *= Math.exp(-30 * dt)
  for (const t of tracers) {
    if (t.life > 0) {
      t.life -= dt
      t.mat.opacity = Math.max(t.life / CFG.tracerLife, 0) * 0.9
      if (t.life <= 0) t.mesh.visible = false
    }
  }
}
