import { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import { OrbitControls } from "three-stdlib";
import setAnimations from "./utils/animationUtils";

const WHEEL_GROUP_NAMES = [
  "_Wheel2A_RR", "_Wheel2A_LR", "_Wheel2A_RF", "_Wheel2A_LF",
  "wheel_lf_52", "wheel_lr_53", "wheel_rr_54", "wheel_rf_55"
];

function centerMeshPivot(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  const centre = new THREE.Vector3();
  mesh.geometry.boundingBox!.getCenter(centre);
  mesh.geometry.translate(-centre.x, -centre.y, -centre.z);
  mesh.position.x += centre.x;
  mesh.position.y += centre.y;
  mesh.position.z += centre.z;
}

function createSkyDome() {
  const vertexShader = `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    varying vec3 vWorldPos;
    uniform vec3 uTopColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uBottomColor;
    void main() {
      float t = normalize(vWorldPos).y;
      vec3 col;
      if (t >= 0.0) {
        col = mix(uHorizonColor, uTopColor, t);
      } else {
        col = mix(uHorizonColor, uBottomColor, -t);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const geo = new THREE.SphereGeometry(90, 32, 16);
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTopColor: { value: new THREE.Color(0xffffff) },
      uHorizonColor: { value: new THREE.Color(0xece6fb) },
      uBottomColor: { value: new THREE.Color(0xc9b6f5) },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function createContactShadowTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.4, "rgba(0,0,0,0.30)");
  gradient.addColorStop(0.8, "rgba(0,0,0,0.08)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useLoading();
  const [sceneReady, setSceneReady] = useState(false);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const carObjRef = useRef<THREE.Object3D | null>(null);
  const lightRef = useRef<any | null>(null);
  const animationsRef = useRef<any | null>(null);

  useEffect(() => {
    if (!canvasDiv.current) return;
    canvasDiv.current.innerHTML = "";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = canvasDiv.current.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xece6fb, 14, 48);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    canvasDiv.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 300);
    camera.position.set(1.1, 3.2, 8.2);
    camera.lookAt(0, 0.7, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = 0.1;
    controls.enablePan = false;
    controls.enableZoom = false;   // let page scroll reach GSAP ScrollSmoother
    controls.target.set(0, 0.7, 0);
    controls.update();

    scene.add(createSkyDome());

    // ── Showcase Group (showroom floor, platform, neon rings, halos, particles) ──
    // Only visible on the hero landing page; sinks below on scroll to About Me
    const showcaseGroup = new THREE.Group();
    showcaseGroup.name = "showcaseGroup";
    scene.add(showcaseGroup);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(80, 64),
      new THREE.MeshStandardMaterial({ color: 0xe4dbf8, roughness: 0.35, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.65, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x14101f, roughness: 0.25, metalness: 0.7 })
    );
    platform.position.y = 0.06;
    platform.receiveShadow = true;
    platform.castShadow = true;
    showcaseGroup.add(platform);

    const neonRingDefs = [
      { r: 3.58, tube: 0.035, color: 0x8b3dff, opacity: 1.0, y: 0.13 },
      { r: 4.15, tube: 0.025, color: 0xff2e88, opacity: 0.8, y: 0.13 },
      { r: 5.3,  tube: 0.022, color: 0x8b3dff, opacity: 0.5, y: 0.13 },
      { r: 7.2,  tube: 0.018, color: 0xff7a2e, opacity: 0.35, y: 0.13 },
    ] as const;
    neonRingDefs.forEach(({ r, tube, color, opacity, y }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, tube, 12, 100),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = y;
      showcaseGroup.add(ring);
    });

    const haloDefs = [
      { r: 4.8, tube: 0.025, h: 1.6, tilt: +0.18, color: 0x8b3dff, opacity: 0.55, dir: +1 },
      { r: 5.8, tube: 0.022, h: 2.8, tilt: -0.18, color: 0xff2e88, opacity: 0.55, dir: -1 },
      { r: 7.0, tube: 0.020, h: 1.1, tilt: +0.18, color: 0x8b3dff, opacity: 0.50, dir: +1 },
      { r: 8.4, tube: 0.018, h: 3.6, tilt: -0.18, color: 0xff7a2e, opacity: 0.50, dir: -1 },
    ] as const;
    const haloRings: Array<{ mesh: THREE.Mesh; dir: number }> = [];
    haloDefs.forEach(({ r, tube, h, tilt, color, opacity, dir }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, tube, 12, 120),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      );
      ring.position.y = h;
      ring.rotation.x = Math.PI / 2 + tilt;
      showcaseGroup.add(ring);
      haloRings.push({ mesh: ring, dir });
    });

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 5.0),
      new THREE.MeshBasicMaterial({ map: createContactShadowTexture(), transparent: true, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.125;
    showcaseGroup.add(shadowPlane);

    const PARTICLE_COUNT = 260;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 14;
      pPositions[i * 3 + 0] = Math.cos(angle) * radius;
      pPositions[i * 3 + 1] = Math.random() * 7;
      pPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const particles = new THREE.Points(pGeo,
      new THREE.PointsMaterial({ color: 0x8b3dff, size: 0.06, transparent: true, opacity: 0.8, sizeAttenuation: true })
    );
    showcaseGroup.add(particles);

    const light = setLighting(scene);
    lightRef.current = light;

    const purpleLight = new THREE.PointLight(0x8b3dff, 1.5, 18);
    purpleLight.position.set(-5, 2.5, -3);
    showcaseGroup.add(purpleLight);

    const pinkLight = new THREE.PointLight(0xff2e88, 1.5, 18);
    pinkLight.position.set(5, 2, -4);
    showcaseGroup.add(pinkLight);

    const carContainerGroup = new THREE.Group();
    carContainerGroup.name = "carContainerGroup";
    carContainerGroup.rotation.set(-0.02, -0.55, 0);
    scene.add(carContainerGroup);

    const carDragGroup = new THREE.Group();
    carDragGroup.name = "carDragGroup";
    carContainerGroup.add(carDragGroup);

    const wheelMeshes: THREE.Mesh[] = [];

    const { loadCharacter } = setCharacter(
      renderer,
      scene,
      camera,
      carContainerGroup,
      showcaseGroup,
      controls
    );

    const clock = new THREE.Clock();
    let frameId: number;
    let mounted = true;
    let elapsed = 0;

    loadCharacter().then((gltf) => {
      if (!mounted || !gltf) return;

      const animations = setAnimations(gltf);
      animationsRef.current = animations;
      hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
      mixerRef.current = animations.mixer;

      const carObj = gltf.scene;
      carObjRef.current = carObj;
      carDragGroup.add(carObj);

      carObj.traverse((node) => {
        if (!WHEEL_GROUP_NAMES.includes(node.name)) return;
        node.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh || wheelMeshes.find(m => m === mesh)) return;
          centerMeshPivot(mesh);
          wheelMeshes.push(mesh);
        });
      });

      setSceneReady(true);
      lightRef.current?.turnOnLights();

      const resizeListener = () => handleResize(renderer, camera, canvasDiv, carContainerGroup);
      window.addEventListener("resize", resizeListener);
      (animate as any)._rl = resizeListener;

    }).catch((err) => console.error("Car load failed:", err));

    const animate = () => {
      if (!mounted) return;
      frameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      elapsed += delta;

      if (!prefersReducedMotion) {
        for (const mesh of wheelMeshes) mesh.rotation.x += 0.20;
        haloRings.forEach(({ mesh, dir }) => { mesh.rotation.z += delta * 0.18 * dir; });
        particles.rotation.y += delta * 0.04;
        particles.position.y = Math.sin(elapsed * 0.3) * 0.12;
        purpleLight.intensity = Math.sin(elapsed * 1.8) * 0.35 + 1.15;
        pinkLight.intensity = Math.sin(elapsed * 1.8 + 1.2) * 0.35 + 1.15;
      }

      if (mixerRef.current) mixerRef.current.update(delta);
      if (controls.enabled) {
        controls.update();
      } else {
        camera.lookAt(0, 0.7, 0);
      }
      renderer.render(scene, camera);
    };
    animate();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isHoveringModel = false;
    let isDragging = false;

    const updateHoverState = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects([carContainerGroup, platform], true);
      isHoveringModel = hits.length > 0;

      if (isDragging) {
        renderer.domElement.style.cursor = "grabbing";
      } else if (isHoveringModel) {
        renderer.domElement.style.cursor = "grab";
      } else {
        renderer.domElement.style.cursor = "default";
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateHoverState(e.clientX, e.clientY);
    };

    const handlePointerDown = (e: PointerEvent) => {
      updateHoverState(e.clientX, e.clientY);
      if (isHoveringModel) {
        isDragging = true;
        controls.enabled = true;
        renderer.domElement.style.cursor = "grabbing";
      } else {
        isDragging = false;
        controls.enabled = false;
        renderer.domElement.style.cursor = "default";
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
      controls.enabled = true;
      renderer.domElement.style.cursor = isHoveringModel ? "grab" : "default";
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      mounted = false;
      cancelAnimationFrame(frameId);
      scene.clear();
      renderer.dispose();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      const rl = (animate as any)._rl;
      if (rl) window.removeEventListener("resize", rl);
      if (canvasDiv.current) canvasDiv.current.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (!isLoading && sceneReady && lightRef.current && animationsRef.current) {
      setTimeout(() => {
        lightRef.current.turnOnLights();
        animationsRef.current.startIntro();
      }, 300);
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
