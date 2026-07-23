import * as THREE from "three";
import { GLTF } from "three-stdlib";

const setAnimations = (gltf: GLTF) => {
  let carObject = gltf.scene;
  let mixer = new THREE.AnimationMixer(carObject);

  if (gltf.animations && gltf.animations.length > 0) {
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.play();
    });
  }

  function startIntro() {
    if (!gltf.animations) return;
    const introClip = gltf.animations.find(
      (clip) => clip.name === "introAnimation"
    );
    if (introClip) {
      const introAction = mixer.clipAction(introClip);
      introAction.clampWhenFinished = true;
      introAction.reset().play();
    }
  }

  function hover(_gltf: GLTF, _hoverDiv: HTMLDivElement) {
    return () => {};
  }

  return { mixer, startIntro, hover };
};

export default setAnimations;
