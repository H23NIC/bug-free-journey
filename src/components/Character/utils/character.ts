import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import carModelUrl from "../car_model/Dodge Challenger SRT Hellcat.glb";

const MODEL_PATH = "/models/Dodge Challenger SRT Hellcat.glb";

function normalizeModel(carObj: THREE.Object3D) {
  // 1. Reset scale & position to measure native geometry
  carObj.scale.set(1, 1, 1);
  carObj.position.set(0, 0, 0);
  carObj.rotation.set(0, 0, 0);
  carObj.updateMatrixWorld(true);

  // 2. Measure bounding box
  const box = new THREE.Box3().setFromObject(carObj);
  const size = box.getSize(new THREE.Vector3());

  // 3. Scale so the car's longest horizontal dimension ≈ 8.0 units
  const carLength = Math.max(size.x, size.z);
  const targetLen = 8.0;
  const scaleFactor = carLength > 0 ? targetLen / carLength : 1;
  carObj.scale.set(scaleFactor, scaleFactor, scaleFactor);
  carObj.updateMatrixWorld(true);

  // 4. Center on X and Z; place lowest point at y = 0.22 so front bumper sits higher off platform
  const scaledBox = new THREE.Box3().setFromObject(carObj);
  const center = scaledBox.getCenter(new THREE.Vector3());
  const minY = scaledBox.min.y;
  carObj.position.set(-center.x, 0.22 - minY, -center.z);
}

function enhanceMaterials(carObj: THREE.Object3D) {
  carObj.traverse((child: any) => {
    if (child.isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat: any) => {
          mat.side = THREE.DoubleSide;
          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            mat.envMapIntensity = 2.2;

            // If color is pitch black, brighten slightly to rich metallic obsidian/carbon tone
            if (mat.color) {
              const luminance = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
              if (luminance < 0.10) {
                mat.color.setRGB(0.19, 0.19, 0.22);
              }
            }

            // Improve gloss & highlights contrast along curves
            if (mat.roughness !== undefined) {
              mat.roughness = Math.min(mat.roughness, 0.38);
            }
            if (mat.metalness !== undefined) {
              mat.metalness = Math.max(mat.metalness, 0.40);
            }

            mat.needsUpdate = true;
          }
        });
      }
    }
  });
}

const setCharacter = (
  _renderer: THREE.WebGLRenderer,
  _scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  targetContainer?: THREE.Object3D,
  showcaseGroup?: THREE.Object3D,
  controls?: any
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>((resolve, reject) => {
      const pathToLoad = MODEL_PATH || carModelUrl;
      console.log("Loading 3D Car Model from:", pathToLoad);

      loader.load(
        pathToLoad,
        (gltf) => {
          console.log("3D Car Model loaded successfully!");
          const carObj = gltf.scene;

          normalizeModel(carObj);
          enhanceMaterials(carObj);

          resolve(gltf);
          const animTarget = targetContainer || carObj;
          setCharTimeline(animTarget, camera, showcaseGroup, controls);
          setAllTimeline();
        },
        (progress) => {
          if (progress.total > 0) {
            console.log(
              `Loading 3D Car Model: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`
            );
          }
        },
        (error) => {
          console.error("Error loading static path model:", error);
          if (pathToLoad !== carModelUrl) {
            console.log("Retrying load using import URL:", carModelUrl);
            loader.load(
              carModelUrl,
              (fallbackGltf) => {
                const carObj = fallbackGltf.scene;
                normalizeModel(carObj);
                enhanceMaterials(carObj);

                resolve(fallbackGltf);
                const animTarget = targetContainer || carObj;
                setCharTimeline(animTarget, camera, showcaseGroup, controls);
                setAllTimeline();
              },
              undefined,
              (err2) => reject(err2)
            );
          } else {
            reject(error);
          }
        }
      );
    });
  };

  return { loadCharacter };
};
export default setCharacter;
