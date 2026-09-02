import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  // Dark automotive wind tunnel laboratory ambient lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  // Key overhead studio spotlight (dramatic hood & windshield highlights)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.8);
  directionalLight.position.set(4, 12, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  // Studio front-quarter fill light
  const aeroFillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  aeroFillLight.position.set(-6, 4, 6);
  scene.add(aeroFillLight);

  // Studio rear rim accent light
  const wakeRimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  wakeRimLight.position.set(2, 3, -8);
  scene.add(wakeRimLight);

  // Overhead linear tunnel strip light
  const stripLight = new THREE.PointLight(0xdff4ff, 1.8, 40, 1.8);
  stripLight.position.set(0, 7, 0);
  scene.add(stripLight);

  new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 1.3;
      scene.environmentRotation.set(0, Math.PI / 4, 0);
    });

  function setPointLight(screenLight: any) {
    if (screenLight && screenLight.material && screenLight.material.opacity > 0.9) {
      stripLight.intensity = screenLight.material.emissiveIntensity * 20;
    }
  }

  const duration = 2;
  const ease = "power2.inOut";
  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 1.5,
      duration: duration,
      ease: ease,
    });
    gsap.to(directionalLight, {
      intensity: 3.2,
      duration: duration,
      ease: ease,
    });
    gsap.to(".character-rim", {
      y: "55%",
      opacity: 1,
      delay: 0.2,
      duration: 2,
    });
  }

  return { setPointLight, turnOnLights };
};

export default setLighting;
