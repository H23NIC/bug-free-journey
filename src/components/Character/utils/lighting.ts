import * as THREE from "three";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  // Ambient & sky light
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a72c7, 1.3);
  scene.add(hemi);

  // Key front-top light (angled directly toward hood, grille, and headlights)
  const frontKey = new THREE.DirectionalLight(0xffffff, 2.2);
  frontKey.position.set(3.5, 4.8, 5.5);
  frontKey.castShadow = true;
  frontKey.shadow.mapSize.width = 2048;
  frontKey.shadow.mapSize.height = 2048;
  frontKey.shadow.camera.near = 0.5;
  frontKey.shadow.camera.far = 40;
  frontKey.shadow.camera.left = -7;
  frontKey.shadow.camera.right = 7;
  frontKey.shadow.camera.top = 7;
  frontKey.shadow.camera.bottom = -7;
  frontKey.shadow.bias = -0.0005;
  scene.add(frontKey);

  // Overhead softbox (highlights roof, hood ridges, and spoiler)
  const topLight = new THREE.DirectionalLight(0xfffaff, 1.5);
  topLight.position.set(0, 9, 1.5);
  scene.add(topLight);

  // Left fill/rim light (soft lavender tint to blend with showroom)
  const leftFill = new THREE.DirectionalLight(0xd9c8ff, 1.5);
  leftFill.position.set(-6, 3.5, 4.0);
  scene.add(leftFill);

  // Right fill/rim light (soft pink/magenta tint)
  const rightFill = new THREE.DirectionalLight(0xffd4eb, 1.5);
  rightFill.position.set(6, 3.5, 4.0);
  scene.add(rightFill);

  // Front bumper / splitter low fill
  const lowFront = new THREE.PointLight(0xffffff, 1.2, 14);
  lowFront.position.set(0, 0.7, 4.8);
  scene.add(lowFront);

  function turnOnLights() {
    gsap.to(frontKey, { intensity: 2.2, duration: 2, ease: "power2.inOut" });
    gsap.to(hemi, { intensity: 1.3, duration: 2, ease: "power2.inOut" });
    gsap.to(topLight, { intensity: 1.5, duration: 2, ease: "power2.inOut" });
    gsap.to(leftFill, { intensity: 1.5, duration: 2, ease: "power2.inOut" });
    gsap.to(rightFill, { intensity: 1.5, duration: 2, ease: "power2.inOut" });
    gsap.to(".character-rim", { y: "55%", opacity: 0.5, delay: 0.2, duration: 2 });
  }

  return { turnOnLights };
};

export default setLighting;
