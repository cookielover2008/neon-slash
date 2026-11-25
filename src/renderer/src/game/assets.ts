import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { CFG } from './config'
import { activeHeroIndex, hero, heroes, hooks } from './state'
import type { Hero } from './state'
import { scene } from './world'
import { loading } from './hud'
import { playLoco, rawClips, rawRoots } from './anims'
import { adaptClip, normBone } from './retarget'
import { loadFbxAny } from './loader'
import { hero2Clips, bakeHero2Clip } from './hero2'

export function fixMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const mat = m as THREE.MeshPhongMaterial
      if (mat.map) {
        mat.color.set(0xffffff)
        mat.map.colorSpace = THREE.SRGBColorSpace
      }
      if (mat.emissive) {
        mat.emissive.set(0x000000)
        mat.emissiveIntensity = 0
      }
    }
  })
}

export function fitModel(obj: THREE.Object3D, targetH: number): void {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  const h = box.max.y - box.min.y
  if (h > 0.01 && isFinite(h)) {
    const s = Math.min(100, Math.max(0.001, targetH / h))
    obj.scale.setScalar(s)
    obj.updateMatrixWorld(true)
    const box2 = new THREE.Box3().setFromObject(obj)
    obj.position.y -= box2.min.y
    console.log('Модель подогнана: был рост ' + h.toFixed(2) + ' м -> стал ' + targetH + ' м, ноги на полу')
  } else {
    console.warn('Модель пустая или без габаритов — проверь файл')
  }
}

export function buildMannequin(accent: string): THREE.Group {
  const g = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#1d2430', roughness: 0.6, metalness: 0.3 })
  const glowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accent),
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.9
  })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 6, 14), bodyMat)
  body.position.y = 0.745
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), bodyMat)
  head.position.y = 1.69
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.1), glowMat)
  visor.position.set(0, 1.71, -0.16)
  g.add(body, head, visor)
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true
  })
  return g
}


export function bakeClips(h: Hero): void {
  for (const k of Object.keys(rawClips)) {
    if (h === heroes[1] && (h.ownClips.has(k) || hero2Clips[k])) continue
    if (!h.clips[k]) h.clips[k] = adaptClip(rawClips[k], rawRoots[k] ?? null, h)
  }
  if (h === heroes[1]) {
    for (const k of Object.keys(hero2Clips)) bakeHero2Clip(k)
  }
  const own =
    h === heroes[1] && Object.keys(hero2Clips).length > 0
      ? ' | свои: ' + Object.keys(hero2Clips).filter((k) => h.ownClips.has(k)).join(', ')
      : ''
  console.log(h.name + ' — клипы: ' + (Object.keys(h.clips).join(', ') || 'НИ ОДНОГО — проверь public/') + own)
}

let heroAReady = false
let cloneRetries = 0

export function setupHero(h: Hero, fbx: THREE.Group): void {
  fixMaterials(fbx)
  fitModel(fbx, CFG.modelHeight)
  const root = new THREE.Group()
  root.add(fbx)
  h.root = root
  h.model = fbx
  root.visible = heroes[activeHeroIndex()] === h
  scene.add(root)
  h.mixer = new THREE.AnimationMixer(fbx)
  h.mixer.addEventListener('finished', (e) => {
    if (h === hero()) hooks.onOneshotFinished?.(e.action)
  })

  let boneCount = 0
  fbx.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      boneCount++
      h.boneRest.set(normBone(o.name), (o as THREE.Bone).quaternion.clone())
      if (/hair/i.test(o.name)) {
        h.hairBones.push({
          bone: o as THREE.Bone,
          rest: (o as THREE.Bone).quaternion.clone(),
          prev: new THREE.Vector3(),
          axis: new THREE.Vector3(0, 1, 0),
          ang: 0
        })
      }
    }
  })
  if (h === heroes[0]) {
    heroAReady = true
    loading.style.display = 'none'
  }
  console.log(h.name + ' готов: костей ' + boneCount + ', прядей волос ' + h.hairBones.length)
  bakeClips(h)
  if (h === hero()) playLoco(0.1)
}

function tryCloneFallback(h: Hero): void {
  const a = heroes[0]
  if (a.model) {
    const fbx = cloneSkeleton(a.model) as unknown as THREE.Group
    setupHero(h, fbx)
    console.log(h.name + ': своего fbx нет — клон героя 1 в цвете ' + h.accent)
  } else if (!heroAReady && cloneRetries < 25) {
    cloneRetries++
    setTimeout(() => tryCloneFallback(h), 400)
  } else {
    console.warn(h.name + ': ни своей модели, ни героя 1 — включаю манекен')
    setupHero(h, buildMannequin(h.accent))
  }
}

export function loadHero(h: Hero, urls: string[], allowClone: boolean): void {
  loadFbxAny(
    urls,
    (fbx) => setupHero(h, fbx),
    () => {
      if (allowClone) tryCloneFallback(h)
      else {
        console.warn(
          'Модель героя 1 не найдена (' + urls.join(', ') + ') — включён манекен. ' +
            'Положи fbx в public/ или public/models/'
        )
        setupHero(h, buildMannequin(h.accent))
      }
    }
  )
}
