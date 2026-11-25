import * as THREE from 'three'
import type { Hero } from './state'

export function normBone(n: string): string {
  let s = n.toLowerCase().replace(/[^a-z0-9]/g, '')
  s = s.replace(/^mixamorig/, '')
  s = s.replace(/^j(bip|sec)/, '')
  return s
}

const BONE_SYNONYMS: Record<string, string[]> = {
  hips: ['cpelvis', 'pelvis', 'center'],
  spine: ['cspine', 'spine01', 'spinea', 'torso', 'cbody'],
  spine1: ['cspine1', 'spine02', 'spineb', 'chest', 'cchest'],
  spine2: ['cspine2', 'spine03', 'spinec', 'upperchest', 'cupperchest'],
  neck: ['cneck', 'neck1'],
  head: ['chead', 'face'],
  leftshoulder: ['lshoulder', 'lclavicle'],
  leftarm: ['lupperarm', 'larm', 'arml', 'upperarml'],
  leftforearm: ['llowerarm', 'lforearm', 'forearml', 'lowerarml'],
  lefthand: ['lhand', 'handl', 'lwrist', 'wristl'],
  leftupleg: ['lupperleg', 'lthigh', 'thighl', 'upperlegl', 'lupleg'],
  leftleg: ['llowerleg', 'lcalf', 'calfl', 'lowerlegl', 'lleg', 'lshin'],
  leftfoot: ['lfoot', 'footl', 'lankle', 'anklel'],
  lefttoe: ['ltoe', 'toel', 'lball', 'balll'],
  rightshoulder: ['rshoulder', 'rclavicle'],
  rightarm: ['rupperarm', 'rarm', 'armr', 'upperarmr'],
  rightforearm: ['rlowerarm', 'rforearm', 'forearmr', 'lowerarmr'],
  righthand: ['rhand', 'handr', 'rwrist', 'wristr'],
  rightupleg: ['rupperleg', 'rthigh', 'thighr', 'upperlegr', 'rupleg'],
  rightleg: ['rlowerleg', 'rcalf', 'calfr', 'lowerlegr', 'rleg', 'rshin'],
  rightfoot: ['rfoot', 'footr', 'rankle', 'ankler'],
  righttoe: ['rtoe', 'toer', 'rball', 'ballr']
}

function dstForName(n: string, dstIndex: Map<string, THREE.Object3D>): THREE.Object3D | null {
  const direct = dstIndex.get(n)
  if (direct) return direct
  const alts = BONE_SYNONYMS[n]
  if (alts) {
    for (const a of alts) {
      const found = dstIndex.get(a)
      if (found) return found
    }
  }
  for (const k of Object.keys(BONE_SYNONYMS)) {
    if (BONE_SYNONYMS[k].indexOf(n) >= 0) {
      const found = dstIndex.get(k)
      if (found) return found
      for (const a of BONE_SYNONYMS[k]) {
        const found2 = dstIndex.get(a)
        if (found2) return found2
      }
    }
  }
  return null
}

function boneForTrack(trackName: string, index: Map<string, THREE.Object3D>): THREE.Object3D | null {
  const base = trackName.split('.')[0]
  return dstForName(normBone(base), index)
}

const _qr = new THREE.Quaternion()

function mapBones(
  srcRoot: THREE.Object3D | null,
  dstModel: THREE.Object3D,
  dstIndex: Map<string, THREE.Object3D>
): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>()
  let byName = 0
  if (srcRoot) {
    srcRoot.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return
      const n = normBone(o.name)
      if (map.has(n)) return
      const found = dstForName(n, dstIndex)
      if (found) {
        map.set(n, found)
        byName++
      }
    })
  }
  const SKIP = /hair|skirt|tail|twist|helper|dummy|weapon|prop|cloth|cape|ik|pole/i
  if (srcRoot) {
    const used = new Set<THREE.Object3D>()
    map.forEach((v) => used.add(v))
    const srcRest: THREE.Bone[] = []
    srcRoot.traverse((o) => {
      const b = o as THREE.Bone
      if (b.isBone && !map.has(normBone(b.name)) && !SKIP.test(b.name)) srcRest.push(b)
    })
    const dstRest: THREE.Bone[] = []
    dstModel.traverse((o) => {
      const b = o as THREE.Bone
      if (b.isBone && !used.has(b) && !SKIP.test(b.name)) dstRest.push(b)
    })
    const nPairs = Math.min(srcRest.length, dstRest.length)
    for (let i = 0; i < nPairs; i++) map.set(normBone(srcRest[i].name), dstRest[i])
    console.log(
      'Карта скелетов: по именам ' + byName + ', по порядку обхода ' + nPairs +
        ' (осталось без пары: клип ' + Math.max(srcRest.length - nPairs, 0) +
        ', модель ' + Math.max(dstRest.length - nPairs, 0) + ')'
    )
  }
  return map
}

export function adaptClip(src: THREE.AnimationClip, srcRoot: THREE.Object3D | null, h: Hero): THREE.AnimationClip {
  if (!h.model) return src
  const exactNames = new Set<string>()
  const index = new Map<string, THREE.Object3D>()
  h.model.traverse((o) => {
    exactNames.add(o.name)
    const n = normBone(o.name)
    const prev = index.get(n)
    if (!prev || (o as THREE.Bone).isBone) index.set(n, o)
  })
  let native = 0
  for (const t of src.tracks) {
    if (exactNames.has(t.name.split('.')[0])) native++
  }
  if (native === src.tracks.length) return src

  const srcBones = new Map<string, THREE.Bone>()
  if (srcRoot) {
    srcRoot.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        const n = normBone(o.name)
        if (!srcBones.has(n)) srcBones.set(n, o as THREE.Bone)
      }
    })
  }
  const map = mapBones(srcRoot, h.model, index)
  const corr = new Map<string, THREE.Quaternion>()
  const tracks: THREE.KeyframeTrack[] = []
  for (const t of src.tracks) {
    if (t.name.endsWith('.position')) continue
    const base = t.name.split('.')[0]
    const nb = normBone(base)
    const bone = map.get(nb) ?? boneForTrack(t.name, index)
    if (!bone) continue
    const renamed = t.clone()
    renamed.name = bone.name + '.' + t.name.split('.').slice(1).join('.')
    if (t.name.endsWith('.quaternion')) {
      const srcNode = srcBones.get(nb)
      if (srcNode) {
        let m = corr.get(nb)
        if (!m) {
          const qs = srcNode.quaternion.clone().invert()
          const qd = h.boneRest.get(normBone(bone.name)) ?? bone.quaternion.clone()
          m = new THREE.Quaternion().multiplyQuaternions(qd, qs)
          corr.set(nb, m)
        }
        const vals = (renamed as THREE.QuaternionKeyframeTrack).values as unknown as number[]
        for (let i = 0; i < vals.length; i += 4) {
          _qr.fromArray(vals, i).premultiply(m).toArray(vals, i)
        }
      }
    }
    tracks.push(renamed)
  }
  if (tracks.length === 0) {
    const srcNames: string[] = []
    srcBones.forEach((_b, n) => {
      if (srcNames.length < 8) srcNames.push(n)
    })
    const dstNames: string[] = []
    index.forEach((_o, n) => {
      if (dstNames.length < 8) dstNames.push(n)
    })
    console.warn(
      'Ретаргет: клип "' + src.name + '" не лёг на скелет ' + h.name + '. Кости клипа: [' +
        srcNames.join(', ') + '] | Кости модели: [' + dstNames.join(', ') + ']'
    )
    return src
  }
  console.log(
    'Ретаргет "' + src.name + '" для ' + h.name + ': ' + tracks.length + '/' + src.tracks.length +
      ' треков, повороты пересчитаны'
  )
  return new THREE.AnimationClip(src.name, src.duration, tracks)
}
