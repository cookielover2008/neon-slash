import * as THREE from 'three'
import { CFG } from './config'
import type { Hero } from './state'

export type HairBone = {
  bone: THREE.Bone
  rest: THREE.Quaternion
  prev: THREE.Vector3
  axis: THREE.Vector3
  ang: number
}

const _wp = new THREE.Vector3()
const _vel = new THREE.Vector3()
const _axis = new THREE.Vector3()
const _wq = new THREE.Quaternion()
const _qt = new THREE.Quaternion()

export function updateHair(h: Hero, dt: number): void {
  if (!h.model || h.hairBones.length === 0) return
  if (h.hairReset) {
    h.hairReset = false
    for (const b of h.hairBones) {
      b.ang = 0
      b.bone.quaternion.copy(b.rest)
      b.prev.set(0, 0, 0)
    }
  }
  for (const b of h.hairBones) b.bone.quaternion.copy(b.rest)
  h.model.updateMatrixWorld(true)
  for (const b of h.hairBones) {
    b.bone.getWorldPosition(_wp)
    if (b.prev.lengthSq() === 0) {
      b.prev.copy(_wp)
      continue
    }
    _vel.subVectors(_wp, b.prev)
    b.prev.copy(_wp)
    const speed = _vel.length()
    if (speed > 1e-5) {
      _axis.copy(_vel).normalize()
      b.bone.getWorldQuaternion(_wq).invert()
      b.axis.copy(_axis.applyQuaternion(_wq)).normalize()
      b.ang = Math.min(b.ang + speed * CFG.hairVelScale, CFG.hairMaxSway)
    }
    b.ang *= Math.exp(-CFG.hairRelax * dt)
    if (b.ang > 1e-4) {
      _qt.setFromAxisAngle(b.axis, b.ang)
      b.bone.quaternion.multiply(_qt)
    }
  }
}
