import { CFG } from './config'
import { player, activeHeroIndex } from './state'
import { camera } from './world'

export const cameraState = {
  dist: CFG.camDist,
  distTarget: CFG.camDist
}

export function updateCamera(dt: number): void {
  cameraState.dist += (cameraState.distTarget - cameraState.dist) * (1 - Math.exp(-12 * dt))
  player.shakeAmp = Math.max(0, player.shakeAmp * Math.exp(-7 * dt))
  const aiming = player.aiming && activeHeroIndex() === 1
  player.aimBlend += ((aiming ? 1 : 0) - player.aimBlend) * (1 - Math.exp(-CFG.aimBlendSpeed * dt))
  const k = player.aimBlend
  const sx = (Math.random() - 0.5) * 2 * player.shakeAmp
  const sy = (Math.random() - 0.5) * 2 * player.shakeAmp
  const sz = (Math.random() - 0.5) * 2 * player.shakeAmp
  const cp = Math.cos(player.pitch)
  const ox = Math.sin(player.yaw) * cp
  const oy = Math.sin(player.pitch)
  const oz = Math.cos(player.yaw) * cp
  const dist = cameraState.dist + (CFG.aimDist - cameraState.dist) * k
  const shX = Math.cos(player.yaw) * CFG.aimShoulder * k
  const shZ = -Math.sin(player.yaw) * CFG.aimShoulder * k
  camera.position.set(
    player.x + ox * dist + sx + shX,
    CFG.camHeight + (CFG.aimHeight - CFG.camHeight) * k + oy * dist + sy,
    player.z + oz * dist + sz + shZ
  )
  camera.lookAt(
    player.x + shX - ox * 30 * k,
    CFG.camLookY + (CFG.aimHeight - CFG.camLookY) * k - oy * 10 * k,
    player.z + shZ - oz * 30 * k
  )

  if (player.fovBump > 0.01) player.fovBump *= Math.exp(-5 * dt)
  const fov = 60 + (CFG.aimFov - 60) * k + player.fovBump
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }
}
