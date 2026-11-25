import * as THREE from 'three'
import { CFG } from './config'
import { player, activeHeroIndex } from './state'
import { scene } from './world'
import { chargeFill, chargeWrap } from './hud'

const P_MAX = 420

type Spark = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  r: number
  g: number
  b: number
  life: number
  grav: number
}

const sparks: Spark[] = []
const sparkGeo = new THREE.BufferGeometry()
const sparkPos = new Float32Array(P_MAX * 3)
const sparkCol = new Float32Array(P_MAX * 3)
const sparkPosAttr = new THREE.BufferAttribute(sparkPos, 3)
const sparkColAttr = new THREE.BufferAttribute(sparkCol, 3)
sparkGeo.setAttribute('position', sparkPosAttr)
sparkGeo.setAttribute('color', sparkColAttr)
const sparkPoints = new THREE.Points(
  sparkGeo,
  new THREE.PointsMaterial({
    size: 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
)
sparkPoints.frustumCulled = false
scene.add(sparkPoints)

export function burst(
  x: number,
  y: number,
  z: number,
  n: number,
  spread: number,
  up: number,
  r: number,
  g: number,
  b: number,
  grav: number
): void {
  for (let i = 0; i < n && sparks.length < P_MAX; i++) {
    const a = Math.random() * Math.PI * 2
    const e = Math.random() * 2 - 1
    const s = spread * (0.35 + Math.random() * 0.65)
    const hgt = Math.sqrt(1 - e * e)
    sparks.push({
      x,
      y,
      z,
      vx: Math.cos(a) * hgt * s,
      vy: e * s * 0.6 + up * (0.5 + Math.random() * 0.5),
      vz: Math.sin(a) * hgt * s,
      r,
      g,
      b,
      life: 0.35 + Math.random() * 0.35,
      grav
    })
  }
}

export function updateSparks(dt: number): void {
  let n = sparks.length
  for (let i = n - 1; i >= 0; i--) {
    const p = sparks[i]
    p.life -= dt
    if (p.life <= 0) {
      sparks[i] = sparks[n - 1]
      sparks.pop()
      n--
      continue
    }
    p.vy -= p.grav * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    if (p.y < 0.05) {
      p.y = 0.05
      p.vy *= -0.45
    }
  }
  for (let i = 0; i < n; i++) {
    const p = sparks[i]
    sparkPos[i * 3] = p.x
    sparkPos[i * 3 + 1] = p.y
    sparkPos[i * 3 + 2] = p.z
    const k = Math.max(p.life / 0.7, 0)
    sparkCol[i * 3] = p.r * k
    sparkCol[i * 3 + 1] = p.g * k
    sparkCol[i * 3 + 2] = p.b * k
  }
  sparkPosAttr.needsUpdate = true
  sparkColAttr.needsUpdate = true
  sparkGeo.setDrawRange(0, n)
}

export type Ring = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }

export function makeRing(
  color: string,
  inner: number,
  outer: number,
  theta = Math.PI * 2,
  segs = 48
): Ring {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, segs, 1, 0, theta), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.visible = false
  scene.add(mesh)
  return { mesh, mat }
}

export const slashMat = new THREE.MeshBasicMaterial({
  color: '#8ffcff',
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
})
export const slashArc = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.15, 40, 1, 0, 2.4), slashMat)
slashArc.rotation.x = -Math.PI / 2
export const slashGroup = new THREE.Group()
slashGroup.add(slashArc)
slashGroup.visible = false
scene.add(slashGroup)

export const shockFx = makeRing('#b8ecff', 0.6, 0.78)
export const chargeRingFx = makeRing('#ffb547', 0.75, 0.95)

export function updateCombatFx(worldDt: number, realDt: number): void {
  if (player.slashTimer > 0) {
    player.slashTimer -= worldDt
    const k = Math.max(player.slashTimer / CFG.slashLife, 0)
    slashMat.opacity = k * 0.9
    slashArc.scale.setScalar(0.8 + (1 - k) * 0.9)
    if (player.slashTimer <= 0) slashGroup.visible = false
  }
  if (player.shockT > 0) {
    player.shockT -= realDt
    const k = Math.max(player.shockT / 0.38, 0)
    shockFx.mesh.scale.setScalar(0.6 + (1 - k) * 6)
    shockFx.mat.opacity = k * 0.85
    if (player.shockT <= 0) shockFx.mesh.visible = false
  }
}

export function updateChargeVisual(now: number): void {
    const charging =
    activeHeroIndex() === 0 &&
    ((player.state === 'loco' && player.attackHeld) || player.state === 'charge')
  if (charging) {
    const k = Math.min(player.attackHeldT / CFG.chargeDelay, 1)
    chargeRingFx.mesh.position.set(player.x, 0.06, player.z)
    chargeRingFx.mesh.rotation.z = now / 400
    chargeRingFx.mesh.scale.setScalar(1 + k * 1.4 + Math.sin(now / 60) * 0.04)
    chargeRingFx.mat.opacity = 0.2 + k * 0.5
    chargeRingFx.mesh.visible = true
    chargeWrap.style.display = 'block'
    chargeFill.style.width = (k * 100).toFixed(0) + '%'
    chargeFill.style.background =
      k >= 1 ? 'linear-gradient(90deg,#ffe27a,#ff5030)' : 'linear-gradient(90deg,#ffcf6a,#ff7a3d)'
  } else {
    chargeRingFx.mesh.visible = false
    chargeWrap.style.display = 'none'
  }
}
