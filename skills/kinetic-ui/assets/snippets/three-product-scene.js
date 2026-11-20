// Keywords: three.js product scene, real object, metre scale, auto frame, neutral tone mapping, pmrem environment, room environment, contact shadow, render on demand, dispose, glossary: producto real, render 3d
// Summary: Starter three.js product scene for a real piece: sets the colour pipeline, builds a PMREM studio environment, fits the camera from the bounding sphere, grounds the piece with a contact shadow, warns when the asset is not in metres, and returns the { start, stop, resize, dispose } contract used by assets/effects/webgl-3d.js.
//
// The scene module is the only file that imports three.js; keep it in a lazy chunk behind the tier gate.
// The asset is expected in metres, Y-up, with PBR metallic-roughness materials (see references/3d/asset-pipeline.md).
// Rendering values and the readback checklist live in references/3d/real-object-render.md.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MIN_PIECE_M = 0.001; // 1 mm
const MAX_PIECE_M = 10; // a room-scale installation, not a landing-page product

function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose();
  }
  material.dispose();
}

export async function createProductScene(canvas, options = {}) {
  const {
    url,
    model,
    dpr = 1,
    background = null,
    environmentIntensity = 0.9,
    exposure = 1,
    fov = 24, // ~85 mm on a full-frame camera: product-photo compression
    onProgress,
    decoderPath,
    transcoderPath,
    meshoptDecoder,
  } = options;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: dpr < 1.75,
    powerPreference: 'high-performance',
    alpha: background === null,
  });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // brand-faithful; AgX/ACES shift product colour
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);

  // One studio environment shared by every material. Dispose the generator, keep the texture.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = environmentIntensity;

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 100);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.001;
  const fill = new THREE.HemisphereLight(0xffffff, 0x333333, 0.5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  scene.add(key, key.target, fill, rim);

  // Shadow-only contact plane; it is what makes the piece sit on a surface instead of floating.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let root = null;
  let sphere = null;
  let disposed = false;
  let running = false;
  let dirty = true;
  let frameId = 0;

  const requestRender = () => {
    dirty = true;
    schedule();
  };

  function schedule() {
    if (!running || frameId || disposed) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      if (disposed) return;
      const shouldRender = dirty;
      dirty = false;
      if (shouldRender) renderer.render(scene, camera);
      if (dirty) schedule(); // a request arrived while this frame was drawing
    });
  }

  function applyFraming() {
    if (!sphere) return;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const fit = Math.min(vertical, horizontal);
    const distance = (sphere.radius / Math.sin(fit / 2)) * 1.22;

    camera.near = Math.max(0.005, distance / 1000);
    camera.far = distance * 20;
    camera.position.set(
      sphere.center.x + distance * 0.5,
      sphere.center.y + distance * 0.38,
      sphere.center.z + distance * 0.78,
    );
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();

    key.position.set(sphere.center.x + distance, sphere.center.y + distance * 1.6, sphere.center.z + distance);
    key.target.position.copy(sphere.center);
    key.target.updateMatrixWorld();
    const extent = sphere.radius * 1.8;
    Object.assign(key.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.1, far: distance * 6 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias = Math.max(0.0005, sphere.radius * 0.002);

    rim.position.set(sphere.center.x - distance, sphere.center.y + distance * 0.7, sphere.center.z - distance * 0.6);

    const groundSize = sphere.radius * 10;
    ground.scale.setScalar(groundSize);
    ground.position.set(sphere.center.x, -sphere.radius * 0.002, sphere.center.z);
  }

  function framePiece(object) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(largest) || largest < MIN_PIECE_M || largest > MAX_PIECE_M) {
      throw new Error(
        `[kinetic-ui] Model spans ${largest.toFixed(4)} m; the product scene expects metres. ` +
          'Re-export in metres (see references/3d/asset-pipeline.md) instead of scaling the camera.',
      );
    }

    // Stand the piece on y = 0 and centre it, so the contact shadow agrees with the floor.
    object.position.set(-center.x, -box.min.y, -center.z);
    object.updateMatrixWorld(true);

    const fitted = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
    sphere = { radius: fitted.radius, center: fitted.center.clone() };
    applyFraming();
    requestRender();
  }

  async function load() {
    if (model) return model;
    const loader = new GLTFLoader();
    if (decoderPath || transcoderPath || meshoptDecoder) {
      // Compression is optional: wire it here when the asset uses Draco, KTX2, or Meshopt.
      const [{ DRACOLoader }, { KTX2Loader }] = await Promise.all([
        import('three/addons/loaders/DRACOLoader.js'),
        import('three/addons/loaders/KTX2Loader.js'),
      ]);
      if (decoderPath) {
        const draco = new DRACOLoader().setDecoderPath(decoderPath);
        loader.setDRACOLoader(draco);
      }
      if (transcoderPath) {
        const ktx2 = new KTX2Loader().setTranscoderPath(transcoderPath).detectSupport(renderer);
        loader.setKTX2Loader(ktx2);
      }
      if (meshoptDecoder) loader.setMeshoptDecoder(meshoptDecoder);
    }
    const gltf = await loader.loadAsync(url, (event) => onProgress?.(event));
    return gltf.scene;
  }

  root = await load();
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(root);
  framePiece(root);

  return {
    get object() {
      return root;
    },
    get camera() {
      return camera;
    },
    get renderer() {
      return renderer;
    },
    requestRender,
    start() {
      if (disposed || running) return;
      running = true;
      requestRender();
    },
    stop() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    },
    resize(width, height, dprValue) {
      if (disposed || width <= 0 || height <= 0) return;
      renderer.setPixelRatio(dprValue);
      renderer.setSize(width, height, false); // CSS owns the canvas box
      camera.aspect = width / height;
      applyFraming();
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      root?.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        for (const material of materials) disposeMaterial(material);
      });
      envTexture.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      renderer.dispose(); // releases the WebGL2 context; GPU memory is not garbage-collected
    },
  };
}
