import * as THREE from 'three'
import { CFG } from './config'
import { player } from './state'
import { scene } from './world'
import { burst } from './vfx'
import { playTone } from './audio'
import { flashVig, healVig, updateHpBar } from './hud'

const medkitGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4)
const medkitMat = new THREE.MeshStandardMaterial({
  color: 0x4dff88,
  emissive: 0x4dff88,
  emissiveIntensity: 0.5
})

type Medkit = { mesh: THREE.Mesh }

const medkits: Medkit[] = []
let medkitTimer = 6

function spawnMedkit(): void {
  const x = (Math.random() * 2 - 1) * (CFG.arenaHalfX - 2)
  const z = (Math.random() * 2 - 1) * (CFG.arenaHalfZ - 2)
  const mesh = new THREE.Mesh(medkitGeo, medkitMat)
  mesh.castShadow = true
  mesh.position.set(x, 0.4, z)
  scene.add(mesh)
  medkits.push({ mesh })
}

export function updateMedkits(dt: number, now: number): void {
  medkitTimer -= dt
  if (medkitTimer <= 0) {
    if (medkits.length < CFG.medkitMax) spawnMedkit()
    medkitTimer = CFG.medkitEvery
  }
  for (let i = medkits.length - 1; i >= 0; i--) {
    const m = medkits[i]
    m.mesh.rotation.y += 1.5 * dt
    m.mesh.position.y = 0.4 + Math.sin(now / 400 + i) * 0.08
    if (player.state === 'dead' || player.hp >= 100) continue
    const d = Math.hypot(m.mesh.position.x - player.x, m.mesh.position.z - player.z)
    if (d < CFG.medkitRange) {
      player.hp = Math.min(100, player.hp + CFG.medkitHeal)
      updateHpBar()
      flashVig(healVig, 0.8)
      burst(m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, 14, 2.2, 1.8, 0.35, 1, 0.55, 3)
      playTone(520, 0.14, 'sine', 0.09)
      playTone(780, 0.2, 'sine', 0.09, undefined, 0.09)
      scene.remove(m.mesh)
      medkits.splice(i, 1)
    }
  }
}
