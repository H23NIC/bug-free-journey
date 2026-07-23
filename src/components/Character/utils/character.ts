import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import carModelUrl from "../car_model/1965_ford_mustang_shelby_gt350.glb";

const MODEL_PATH = "/models/1965_ford_mustang_shelby_gt350.glb";

const setCharacter = (
  _renderer: THREE.WebGLRenderer,
  _scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
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
          console.log("3D Shelby GT350 model loaded successfully!");
          const carObj = gltf.scene;

          // Set prominent scale for clear visibility
          carObj.scale.set(160, 160, 160);

          // Calculate bounding box and center geometry
          const box = new THREE.Box3().setFromObject(carObj);
          const center = box.getCenter(new THREE.Vector3());
          carObj.position.x = -center.x;
          carObj.position.y = -box.min.y;
          carObj.position.z = -center.z;

          // Material and shadow enhancements for 3D car model
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
                    mat.envMapIntensity = 2.0;
                    mat.needsUpdate = true;
                  }
                });
              }
            }
          });

          resolve(gltf);
          setCharTimeline(carObj, camera);
          setAllTimeline();
        },
        (progress) => {
          if (progress.total > 0) {
            console.log(`Loading 3D Car Model: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`);
          }
        },
        (error) => {
          console.error("Error loading Shelby GT350 GLTF model:", error);
          // Fallback to imported URL if static path fails
          if (pathToLoad !== carModelUrl) {
            console.log("Retrying load using import URL:", carModelUrl);
            loader.load(
              carModelUrl,
              (fallbackGltf) => {
                const carObj = fallbackGltf.scene;
                carObj.scale.set(160, 160, 160);
                const box = new THREE.Box3().setFromObject(carObj);
                const center = box.getCenter(new THREE.Vector3());
                carObj.position.x = -center.x;
                carObj.position.y = -box.min.y;
                carObj.position.z = -center.z;

                carObj.traverse((child: any) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.frustumCulled = false;
                  }
                });

                resolve(fallbackGltf);
                setCharTimeline(carObj, camera);
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
