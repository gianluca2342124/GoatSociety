import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Model3DElement } from '../../model/types'
import type { Resolved3D } from './render3dCache'
import { getRenderer, snapshot } from './renderer'
import { getAssetBlob } from '../../db/assets'

const gltfCache = new Map<string, Promise<THREE.Object3D>>()

async function loadModel(assetId: string): Promise<THREE.Object3D> {
  let p = gltfCache.get(assetId)
  if (!p) {
    p = (async () => {
      const blob = await getAssetBlob(assetId)
      if (!blob) throw new Error('Modelo 3D no encontrado en la biblioteca')
      const buf = await blob.arrayBuffer()
      const loader = new GLTFLoader()
      const gltf = await loader.parseAsync(buf, '')
      return gltf.scene
    })()
    gltfCache.set(assetId, p)
    p.catch(() => gltfCache.delete(assetId))
  }
  return p
}

let envTexture: THREE.Texture | null = null

function materialFor(kind: Model3DElement['material'], primary: string): THREE.Material | null {
  switch (kind) {
    case 'obsidian':
      return new THREE.MeshPhysicalMaterial({ color: 0x15161a, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2 })
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(primary), metalness: 1, roughness: 0.28 })
    case 'ivory':
      return new THREE.MeshStandardMaterial({ color: 0xefe9dc, metalness: 0, roughness: 0.55 })
    case 'chrome':
      return new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 })
    default:
      return null
  }
}

export async function renderModel(r: Resolved3D): Promise<HTMLCanvasElement | null> {
  const el = r.el as Model3DElement
  if (!el.assetId) return null
  const source = await loadModel(el.assetId)
  const width = Math.max(2, r.width * r.scale)
  const height = Math.max(2, r.height * r.scale)
  const renderer = getRenderer(width, height)
  renderer.toneMappingExposure = el.lighting.exposure
  const scene = new THREE.Scene()
  if (!envTexture) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
  }
  scene.environment = envTexture
  scene.environmentIntensity = el.lighting.preset === 'studio' ? 0.9 : 0.35

  const model = source.clone(true)
  const override = materialFor(el.material, r.colors.primary)
  model.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.castShadow = true
      if (override) m.material = override
    }
  })
  // Normalize size & center
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = 2 / Math.max(size.x, size.y, size.z, 1e-6)
  model.scale.setScalar(scale)
  model.position.copy(center.multiplyScalar(-scale))
  const pivot = new THREE.Group()
  pivot.add(model)
  pivot.rotation.y = (el.autoRotate * Math.PI) / 180
  scene.add(pivot)

  // Lighting presets
  const rimColor = new THREE.Color(r.colors.rim)
  const key = new THREE.DirectionalLight(0xffffff, 2.2 * el.lighting.keyIntensity)
  key.position.set(2, 3, 4)
  scene.add(key)
  const preset = el.lighting.preset
  const rimTint = preset === 'rimRed' ? new THREE.Color('#EF4655') : preset === 'rimGreen' ? new THREE.Color('#27D477') : preset === 'gold' ? new THREE.Color(r.colors.primary) : rimColor
  const rimL = new THREE.DirectionalLight(rimTint, 5 * el.lighting.rimIntensity)
  rimL.position.set(-3, 2, -3)
  const rimR = new THREE.DirectionalLight(rimTint, 4 * el.lighting.rimIntensity)
  rimR.position.set(3, 1.5, -3)
  scene.add(rimL, rimR)
  scene.add(new THREE.AmbientLight(0xffffff, preset === 'studio' ? 0.6 : 0.12))
  if (preset === 'cinematic') {
    const under = new THREE.PointLight(rimTint, 4, 10)
    under.position.set(0, -2, 1.5)
    scene.add(under)
  }

  const cam = el.camera
  const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.01, 100)
  const yaw = (cam.yaw * Math.PI) / 180
  const pitch = (cam.pitch * Math.PI) / 180
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * cam.distance, Math.sin(pitch) * cam.distance, Math.cos(yaw) * Math.cos(pitch) * cam.distance)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
  const out = snapshot(renderer, width, height)
  if (override) override.dispose()
  return out
}
