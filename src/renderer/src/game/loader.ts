import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as THREE from 'three'

export function loadFbxAny(
  urls: string[],
  onOk: (fbx: THREE.Group, url: string) => void,
  onFail: () => void
): void {
  const tryAt = (i: number): void => {
    if (i >= urls.length) {
      onFail()
      return
    }
    new FBXLoader().load(
      urls[i],
      (fbx) => {
        console.log('Загружено: ' + urls[i])
        onOk(fbx, urls[i])
      },
      undefined,
      () => tryAt(i + 1)
    )
  }
  tryAt(0)
}

export function cands(...names: string[]): string[] {
  const out: string[] = []
  for (const n of names) {
    out.push(n)
    out.push('models/' + n)
  }
  return out
}
