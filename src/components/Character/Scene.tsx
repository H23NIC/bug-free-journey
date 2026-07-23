import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import { OrbitControls } from "three-stdlib";
import setAnimations from "./utils/animationUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Wheel config — exact GROUP names confirmed via GLB binary parse
// ─────────────────────────────────────────────────────────────────────────────
const WHEEL_GROUP_NAMES = ["_Wheel2A_RR", "_Wheel2A_LR", "_Wheel2A_RF", "_Wheel2A_LF"];

/**
 * Re-centres a mesh's geometry pivot to its visual centre.
 * mesh.rotation.x will then spin the wheel in place — no orbiting.
 */
function centerMeshPivot(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  const centre = new THREE.Vector3();
  mesh.geometry.boundingBox!.getCenter(centre);
  mesh.geometry.translate(-centre.x, -centre.y, -centre.z);
  mesh.position.x += centre.x;
  mesh.position.y += centre.y;
  mesh.position.z += centre.z;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aerodynamic streamline helpers
// ─────────────────────────────────────────────────────────────────────────────
const NUM_STREAMS = 50;
const FULL_SAMPLES = 180;  // points pre-sampled per curve (once at startup)
const VIS_SAMPLES = 40;   // visible traveling segment length

const CAR_HALF_W = 1.4;
const CAR_ROOF_Y = 1.35;
const CAR_FLOOR_Y = 0.12;

/**
 * Builds one CatmullRomCurve3 aerodynamic path.
 * Flow direction: +Z (car front / camera side) → −Z (rear).
 */
function buildAeroPath(x: number, y: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const onBody = Math.abs(x) < CAR_HALF_W;

  pts.push(new THREE.Vector3(x, y, 8));
  pts.push(new THREE.Vector3(x, y, 5));

  if (y > CAR_ROOF_Y + 0.5) {
    // High free-stream — barely deflected
    const dip = onBody ? 0.15 : 0.04;
    pts.push(new THREE.Vector3(x, y - dip, 1.5));
    pts.push(new THREE.Vector3(x, y - dip * 1.5, 0));
    pts.push(new THREE.Vector3(x, y - dip, -1.5));
    pts.push(new THREE.Vector3(x, y, -4));

  } else if (y < CAR_FLOOR_Y && onBody) {
    // Under-chassis — squeezed low
    pts.push(new THREE.Vector3(x, Math.max(0.02, y * 0.55), 1.5));
    pts.push(new THREE.Vector3(x, Math.max(0.02, y * 0.45), 0));
    pts.push(new THREE.Vector3(x, y, -2));
    pts.push(new THREE.Vector3(x, y, -4));

  } else if (onBody) {
    // Surface-attached — rises over hood → roof → falls off trunk
    const peak = CAR_ROOF_Y + 0.35 + Math.random() * 0.25;
    pts.push(new THREE.Vector3(x * 0.92, y * 0.4 + peak * 0.2, 3));
    pts.push(new THREE.Vector3(x * 0.88, peak * 0.78, 1.5));
    pts.push(new THREE.Vector3(x * 0.85, peak, 0));
    pts.push(new THREE.Vector3(x * 0.9, peak * 0.65, -1.2));
    pts.push(new THREE.Vector3(x * 0.95, y * 0.5, -3));
    pts.push(new THREE.Vector3(x, y * 0.2, -5));

  } else {
    // Side bypass — curves outward around the car body
    const dir = x > 0 ? 1 : -1;
    const bulge = Math.max(0, (2.2 - Math.abs(x)) / 2.2) * 0.6;
    pts.push(new THREE.Vector3(x + dir * bulge * 0.5, y, 2.5));
    pts.push(new THREE.Vector3(x + dir * bulge, y * 0.95, 0));
    pts.push(new THREE.Vector3(x + dir * bulge * 0.3, y, -2));
    pts.push(new THREE.Vector3(x, y, -4));
  }

  pts.push(new THREE.Vector3(x + (Math.random() - 0.5) * 0.35, y, -6.5));
  pts.push(new THREE.Vector3(x, y, -9));

  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene component
// ─────────────────────────────────────────────────────────────────────────────
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

    const rect = canvasDiv.current.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    canvasDiv.current.appendChild(renderer.domElement);

    // ── Camera ──────────────────────────────────────────────────────────────
    const DEFAULT_Z = 12, DEFAULT_Y = 1.8, DEFAULT_X = 0;
    const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 1000);
    camera.position.set(DEFAULT_X, DEFAULT_Y, DEFAULT_Z);
    camera.lookAt(0, 0.8, 0);
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;

    // ── Parent Drag Group for manual rotation ────────────────────────────────
    const carDragGroup = new THREE.Group();
    scene.add(carDragGroup);

    // ── Input state ──────────────────────────────────────────────────────────
    let isShiftHeld = false, isCtrlHeld = false;
    let isPanning = false, lastMouseX = 0, lastMouseY = 0;
    const wheelMeshes: THREE.Mesh[] = [];

    // Drag-to-rotate states
    let isDraggingModel = false;
    let lastDragX = 0;
    let lastDragY = 0;

    // Raycaster for checking hover & click intersections on the 3D model
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    function smoothResetCamera() {
      const fX = camera.position.x, fY = camera.position.y, fZ = camera.position.z;
      const t0 = performance.now();
      function step(now: number) {
        const t = Math.min((now - t0) / 600, 1), e = 1 - Math.pow(1 - t, 3);
        camera.position.set(fX + (DEFAULT_X - fX) * e, fY + (DEFAULT_Y - fY) * e, fZ + (DEFAULT_Z - fZ) * e);
        camera.lookAt(0, 0.8, 0);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") isShiftHeld = true;
      if (e.key === "Control") isCtrlHeld = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") { isShiftHeld = false; isPanning = false; smoothResetCamera(); }
      if (e.key === "Control") { isCtrlHeld = false; isPanning = false; }
    };
    const onWheel = (e: WheelEvent) => {
      if (!isShiftHeld) return;
      e.preventDefault(); e.stopImmediatePropagation();
      camera.position.z = Math.max(4, Math.min(30, camera.position.z + (e.deltaY > 0 ? 0.5 : -0.5)));
      camera.lookAt(0, 0.8, 0);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (isShiftHeld && isCtrlHeld) { isPanning = true; lastMouseX = e.clientX; lastMouseY = e.clientY; }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning || !isShiftHeld || !isCtrlHeld) { isPanning = false; return; }
      camera.position.x -= (e.clientX - lastMouseX) * 0.008;
      camera.position.y += (e.clientY - lastMouseY) * 0.008;
      camera.lookAt(0, 0.8, 0);
      lastMouseX = e.clientX; lastMouseY = e.clientY;
    };
    const onMouseUp = () => { isPanning = false; };

    // Register our drag events
    const containerEl = canvasDiv.current;

    // Manual mouse drag handlers for rotation (only if clicking the car model)
    const onModelDragStart = (e: MouseEvent) => {
      if (e.button !== 0) return; // only left click
      if (!containerEl || !carObjRef.current) return;

      const rect = containerEl.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const intersects = raycaster.intersectObject(carObjRef.current, true);

      if (intersects.length > 0) {
        isDraggingModel = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        containerEl.style.cursor = "grabbing";
        document.body.style.cursor = "grabbing";
        e.preventDefault();
      }
    };

    const onModelDragMove = (e: MouseEvent) => {
      if (!isDraggingModel) return;
      const deltaX = e.clientX - lastDragX;
      const deltaY = e.clientY - lastDragY;
      
      const sensitivity = 0.007;
      carDragGroup.rotation.y += deltaX * sensitivity;
      carDragGroup.rotation.x += deltaY * sensitivity;

      // Limit pitch to prevent flipping upside down
      const pitchLimit = Math.PI / 6;
      carDragGroup.rotation.x = Math.max(-pitchLimit, Math.min(pitchLimit, carDragGroup.rotation.x));

      lastDragX = e.clientX;
      lastDragY = e.clientY;
    };

    const onModelDragEnd = () => {
      if (isDraggingModel) {
        isDraggingModel = false;
        if (containerEl) {
          containerEl.style.cursor = "";
        }
        document.body.style.cursor = "";
      }
    };

    // Touch support for mobile dragging (only if touching the car model)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!containerEl || !carObjRef.current) return;

      const rect = containerEl.getBoundingClientRect();
      mouseNDC.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const intersects = raycaster.intersectObject(carObjRef.current, true);

      if (intersects.length > 0) {
        isDraggingModel = true;
        lastDragX = e.touches[0].clientX;
        lastDragY = e.touches[0].clientY;
        e.preventDefault(); // prevent scroll/zoom only if touching the model
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingModel || e.touches.length !== 1) return;
      e.preventDefault(); // prevent scroll/zoom during model drag
      const deltaX = e.touches[0].clientX - lastDragX;
      const deltaY = e.touches[0].clientY - lastDragY;

      const sensitivity = 0.007;
      carDragGroup.rotation.y += deltaX * sensitivity;
      carDragGroup.rotation.x += deltaY * sensitivity;

      const pitchLimit = Math.PI / 6;
      carDragGroup.rotation.x = Math.max(-pitchLimit, Math.min(pitchLimit, carDragGroup.rotation.x));

      lastDragX = e.touches[0].clientX;
      lastDragY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      isDraggingModel = false;
    };

    // Hover cursor updates (only show grab if hovering over the car model)
    const onContainerMouseMove = (e: MouseEvent) => {
      if (isDraggingModel) return;
      if (!containerEl || !carObjRef.current) return;

      const rect = containerEl.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const intersects = raycaster.intersectObject(carObjRef.current, true);

      if (intersects.length > 0) {
        containerEl.style.cursor = "grab";
      } else {
        containerEl.style.cursor = "";
      }
    };

    const onContainerMouseLeave = () => {
      if (isDraggingModel) return;
      if (containerEl) {
        containerEl.style.cursor = "";
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    if (containerEl) {
      containerEl.addEventListener("mousedown", onModelDragStart);
      containerEl.addEventListener("touchstart", onTouchStart, { passive: false });
      containerEl.addEventListener("mousemove", onContainerMouseMove);
      containerEl.addEventListener("mouseleave", onContainerMouseLeave);
    }
    window.addEventListener("mousemove", onModelDragMove);
    window.addEventListener("mouseup", onModelDragEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    // ── Aerodynamic wind streamlines ─────────────────────────────────────────
    // windGroup is a THREE.Group added to the scene.
    // In the animate loop we copy carObj's quaternion into windGroup every frame,
    // so the wind rotates in sync when GSAP turns the car left/right on scroll.
    const windGroup = new THREE.Group();
    scene.add(windGroup);

    const streamAllPts: Float32Array[] = [];
    const streamVisGeos: THREE.BufferGeometry[] = [];
    const streamIdxs: number[] = [];
    const streamSpeeds: number[] = [];

    // Distribution configs
    const configs: { x: number; y: number }[] = [];
    for (let i = 0; i < 18; i++)
      configs.push({ x: (Math.random() - 0.5) * CAR_HALF_W * 1.9, y: 0.08 + Math.random() * (CAR_ROOF_Y - 0.08) });
    for (let i = 0; i < 7; i++)
      configs.push({ x: (Math.random() - 0.5) * CAR_HALF_W * 1.4, y: Math.random() * CAR_FLOOR_Y });
    for (let i = 0; i < 10; i++)
      configs.push({ x: (Math.random() - 0.5) * 7, y: CAR_ROOF_Y + 0.6 + Math.random() * 1.8 });
    for (let i = 0; i < 15; i++) {
      const side = i < 8 ? -1 : 1;
      configs.push({ x: side * (CAR_HALF_W + 0.25 + Math.random() * 2.8), y: Math.random() * (CAR_ROOF_Y + 0.5) });
    }

    const windMat = new THREE.LineBasicMaterial({
      color: 0xd0d0d0,  // light gray
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthTest: true,       // respect depth buffer → occluded by solid parts of the car
      depthWrite: false,
    });

    for (let s = 0; s < NUM_STREAMS; s++) {
      const cfg = configs[s % configs.length];
      const curve = buildAeroPath(cfg.x, cfg.y);

      // Pre-sample curve once — pure array copy at runtime, zero curve math
      const pts = curve.getPoints(FULL_SAMPLES - 1);
      const allPos = new Float32Array(FULL_SAMPLES * 3);
      pts.forEach((p, i) => { allPos[i * 3] = p.x; allPos[i * 3 + 1] = p.y; allPos[i * 3 + 2] = p.z; });
      streamAllPts.push(allPos);

      const visPos = new Float32Array(VIS_SAMPLES * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(visPos, 3));
      streamVisGeos.push(geo);

      const line = new THREE.Line(geo, windMat);
      line.renderOrder = 999;
      windGroup.add(line);  // child of windGroup → rotates with car

      streamIdxs.push(Math.floor(Math.random() * (FULL_SAMPLES - VIS_SAMPLES)));
      streamSpeeds.push(0.3 + Math.random() * 0.25);  // slow, smooth airflow speed
    }

    // ── Lighting + loader ────────────────────────────────────────────────────
    const light = setLighting(scene);
    lightRef.current = light;
    const { loadCharacter } = setCharacter(renderer, scene, camera);

    const clock = new THREE.Clock();
    let frameId: number;
    let mounted = true;

    // ── Load car model ───────────────────────────────────────────────────────
    loadCharacter().then((gltf) => {
      if (!mounted || !gltf) return;

      const animations = setAnimations(gltf);
      animationsRef.current = animations;
      hoverDivRef.current && animations.hover(gltf, hoverDivRef.current);
      mixerRef.current = animations.mixer;

      const carObj = gltf.scene;
      carObjRef.current = carObj;
      carDragGroup.add(carObj);

      // Find the 4 wheel meshes by exact group name, fix their pivot
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

      const resizeListener = () => handleResize(renderer, camera, canvasDiv, carObj);
      window.addEventListener("resize", resizeListener);
      (animate as any)._rl = resizeListener;

    }).catch((err) => console.error("Car load failed:", err));

    // ── Render loop ──────────────────────────────────────────────────────────
    const animate = () => {
      if (!mounted) return;
      frameId = requestAnimationFrame(animate);

      // ── Sync wind rotation to car rotation ────────────────────────────────
      // GSAP animates carObj.rotation during scroll (in animationUtils/GsapScroll).
      // Copying the quaternion here each frame keeps the wind perfectly aligned
      // with the car at all times — so wind turns left/right with the model.
      if (carObjRef.current) {
        const tempQuat = new THREE.Quaternion();
        carObjRef.current.getWorldQuaternion(tempQuat);
        windGroup.quaternion.copy(tempQuat);
      }

      // ── Advance wind segments ─────────────────────────────────────────────
      // Each frame: copy VIS_SAMPLES consecutive points from the pre-sampled
      // path, then advance the start index. Pure typed-array copy, no math.
      for (let s = 0; s < NUM_STREAMS; s++) {
        const allPos = streamAllPts[s];
        const geo = streamVisGeos[s];
        const visPos = geo.attributes.position.array as Float32Array;
        const start = Math.floor(streamIdxs[s]);

        for (let i = 0; i < VIS_SAMPLES; i++) {
          const src = Math.min(start + i, FULL_SAMPLES - 1);
          visPos[i * 3] = allPos[src * 3];
          visPos[i * 3 + 1] = allPos[src * 3 + 1];
          visPos[i * 3 + 2] = allPos[src * 3 + 2];
        }
        geo.attributes.position.needsUpdate = true;

        streamIdxs[s] += streamSpeeds[s];
        if (streamIdxs[s] >= FULL_SAMPLES - VIS_SAMPLES) streamIdxs[s] = 0;
      }

      // ── Spin wheels anticlockwise (pivot centred → in-place roll) ─────────
      for (const mesh of wheelMeshes) mesh.rotation.x += 0.20;

      if (mixerRef.current) mixerRef.current.update(clock.getDelta());
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      mounted = false;
      cancelAnimationFrame(frameId);
      scene.clear();
      renderer.dispose();
      controls.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (containerEl) {
        containerEl.removeEventListener("mousedown", onModelDragStart);
        containerEl.removeEventListener("touchstart", onTouchStart);
        containerEl.removeEventListener("mousemove", onContainerMouseMove);
        containerEl.removeEventListener("mouseleave", onContainerMouseLeave);
      }
      window.removeEventListener("mousemove", onModelDragMove);
      window.removeEventListener("mouseup", onModelDragEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.style.cursor = "";
      const rl = (animate as any)._rl;
      if (rl) window.removeEventListener("resize", rl);
      if (canvasDiv.current) canvasDiv.current.innerHTML = "";
    };
  }, []);

  // Sync intro animation with loading state
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
