import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useLoading();

  const [character, setChar] = useState<THREE.Object3D | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  // Refs for animation loop to avoid closure issues
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const screenLightRef = useRef<any | null>(null);
  const lightRef = useRef<any | null>(null);
  const animationsRef = useRef<any | null>(null);

  useEffect(() => {
    if (canvasDiv.current) {
      // CLEAR div to ensure no zombie canvases exist
      canvasDiv.current.innerHTML = "";
      
      const rect = canvasDiv.current.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      
      // Create scene LOCALLY inside effect so every mount gets a fresh, clean scene
      const scene = new THREE.Scene();

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(rect.width, rect.height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      canvasDiv.current.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      const light = setLighting(scene);
      lightRef.current = light;
      const { loadCharacter } = setCharacter(renderer, scene, camera);

      const clock = new THREE.Clock();
      let frameId: number;
      let mounted = true;

      loadCharacter().then((gltf) => {
        if (!mounted) return; // Component unmounted before character loaded
        
        if (gltf) {
          const animations = setAnimations(gltf);
          animationsRef.current = animations;
          hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
          mixerRef.current = animations.mixer;
          
          const charObj = gltf.scene;
          setChar(charObj);
          scene.add(charObj);

          headBoneRef.current = charObj.getObjectByName("spine006") || null;
          screenLightRef.current = charObj.getObjectByName("screenlight") || null;

          setSceneReady(true);

          const resizeListener = () => handleResize(renderer, camera, canvasDiv, charObj);
          window.addEventListener("resize", resizeListener);
          
          // Store cleanup for resize
          (animate as any).resizeListener = resizeListener;
        }
      });

      let mouse = { x: 0, y: 0 };
      let interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };

      document.addEventListener("mousemove", onMouseMove);

      const animate = () => {
        if (!mounted) return;
        frameId = requestAnimationFrame(animate);
        
        if (headBoneRef.current) {
          handleHeadRotation(
            headBoneRef.current,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          if (lightRef.current) {
            lightRef.current.setPointLight(screenLightRef.current);
          }
        }
        if (mixerRef.current) {
          mixerRef.current.update(clock.getDelta());
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        mounted = false;
        cancelAnimationFrame(frameId);
        scene.clear();
        renderer.dispose();
        document.removeEventListener("mousemove", onMouseMove);
        const resizeListener = (animate as any).resizeListener;
        if (resizeListener) {
           window.removeEventListener("resize", resizeListener);
        }
        if (canvasDiv.current) {
          canvasDiv.current.innerHTML = "";
        }
      };
    }
  }, []);

  // Sync intro with loading state
  useEffect(() => {
    if (!isLoading && sceneReady && lightRef.current && animationsRef.current) {
      setTimeout(() => {
        lightRef.current.turnOnLights();
        animationsRef.current.startIntro();
      }, 500); 
    }
  }, [isLoading, sceneReady]);

  return (
    <div className="character-container">
      <div className="character-model" ref={canvasDiv}>
        <div className="character-rim"></div>
        <div className="character-hover" ref={hoverDivRef}></div>
      </div>
    </div>
  );
};

export default Scene;
