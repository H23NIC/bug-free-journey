import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Text3D,
  Center,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { useLoading } from "../context/LoadingProvider";

/* ─────────────────────────────────────────────────────────────────────────
   Timings
   0 → 4 s  : H23 fades in (opacity 0 → 1) on black background
   4 → 6 s  : white flash overlay fades in over the screen
   6 s      : loader dismissed → main page appears
───────────────────────────────────────────────────────────────────────── */
const FADE_IN_DURATION  = 4.0; // seconds for letters to reach full opacity
const WHITE_FLASH_START = 4000; // ms — when white overlay begins
const WHITE_FLASH_HOLD  = 2000; // ms — how long the white flash lasts
const TOTAL_DURATION    = WHITE_FLASH_START + WHITE_FLASH_HOLD; // 6000 ms

/* ─────────────────────────────────────────────────────────────────────────
   Static Letter — no movement, only opacity 0 → 1 over FADE_IN_DURATION
───────────────────────────────────────────────────────────────────────── */
const Letter = ({
  char,
  position,
}: {
  char: string;
  position: [number, number, number];
}) => {
  const meshRef  = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);
  const fontUrl  = "/fonts/font.json";

  useFrame(() => {
    if (!meshRef.current) return;

    if (startRef.current === null) startRef.current = Date.now();

    const elapsed = (Date.now() - startRef.current) / 1000;

    // Pure linear opacity 0 → 1
    const opacity = Math.min(elapsed / FADE_IN_DURATION, 1);

    if (Array.isArray(meshRef.current.material)) {
      meshRef.current.material.forEach((m) => {
        m.opacity      = opacity;
        m.transparent  = true;
        m.needsUpdate  = false;
      });
    }

    // Lock everything else — no drift, no rotation, no scale
    meshRef.current.position.set(...position);
    meshRef.current.rotation.set(0, 0, 0);
    meshRef.current.scale.set(1, 1, 1);
  });

  return (
    <Center position={position}>
      <Text3D
        ref={meshRef}
        font={fontUrl}
        size={6}
        height={1.2}
        bevelEnabled={true}
        bevelThickness={0.25}
        bevelSize={0.1}
        bevelSegments={10}
        curveSegments={24}
      >
        {char}
        {/* Face — pure white */}
        <meshStandardMaterial
          attach="material-0"
          color="#ffffff"
          transparent
          opacity={0}
          metalness={0.1}
          roughness={0.3}
        />
        {/* Side/extrude — pure white */}
        <meshStandardMaterial
          attach="material-1"
          color="#ffffff"
          transparent
          opacity={0}
          metalness={0.1}
          roughness={0.3}
        />
      </Text3D>
    </Center>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Thin underline accent (stays, doesn't move)
───────────────────────────────────────────────────────────────────────── */
const UnderlineAccent = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const m = meshRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.4;
  });

  return (
    <mesh ref={meshRef} position={[0, -5.2, 0]}>
      <boxGeometry args={[16, 0.06, 0.1]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.8}
        metalness={0.5}
        roughness={0.1}
      />
    </mesh>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Ambient particle field — subtle depth
───────────────────────────────────────────────────────────────────────── */
const ParticleField = () => {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const positions = useRef<Float32Array>(
    new Float32Array(
      Array.from({ length: count }, () => [
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 - 5,
      ]).flat()
    )
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = positions.current[i * 3];
      const y = positions.current[i * 3 + 1] + Math.sin(t * 0.4 + i) * 0.02;
      const z = positions.current[i * 3 + 2];
      dummy.position.set(x, y, z);
      const s = 0.04 + Math.abs(Math.sin(t * 0.5 + i * 0.3)) * 0.06;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#aaaaaa"
        emissiveIntensity={0.8}
        transparent
        opacity={0.25}
      />
    </instancedMesh>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   2D corner brackets + tagline overlay
───────────────────────────────────────────────────────────────────────── */
const Overlay = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    {/* corner brackets */}
    {[
      { top: 24, left: 24 },
      { top: 24, right: 24 },
      { bottom: 24, left: 24 },
      { bottom: 24, right: 24 },
    ].map((style, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 28,
          height: 28,
          borderColor: "rgba(255,255,255,0.5)",
          borderStyle: "solid",
          borderWidth: 0,
          ...(style.top !== undefined
            ? { borderTopWidth: 2 }
            : { borderBottomWidth: 2 }),
          ...(style.left !== undefined
            ? { borderLeftWidth: 2 }
            : { borderRightWidth: 2 }),
          ...style,
        }}
      />
    ))}

    {/* tagline */}
    <p
      style={{
        position: "absolute",
        bottom: "calc(50% - 160px)",
        margin: 0,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        fontSize: "clamp(9px, 1.1vw, 13px)",
        letterSpacing: "0.35em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)",
        fontWeight: 600,
      }}
    >
      Creative · Developer · Designer
    </p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   White Flash Overlay — fades in after 4 s, holds for 2 s, then page loads
───────────────────────────────────────────────────────────────────────── */
const WhiteFlash = ({ visible }: { visible: boolean }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: "#ffffff",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.35s ease-in",   // fast snap to white
      pointerEvents: "none",
      zIndex: 10000,
    }}
  />
);

/* ─────────────────────────────────────────────────────────────────────────
   Main Loader
   Timeline:
     0 ms  → letters start fading in
     4000 ms → white flash begins
     6000 ms → loader dismissed, main page shown
───────────────────────────────────────────────────────────────────────── */
const H23Loader = () => {
  const { setIsLoading, setLoading } = useLoading();
  const [shouldRender, setShouldRender]   = useState(true);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);

  useEffect(() => {
    // Step 1 — trigger white flash at 4 s
    const flashTimer = setTimeout(() => {
      setShowWhiteFlash(true);
    }, WHITE_FLASH_START);

    // Step 2 — dismiss loader at 6 s
    const exitTimer = setTimeout(() => {
      import("./utils/initialFX").then((module) => {
        if (module.initialFX) module.initialFX();
        setLoading(100);
        setShouldRender(false);
        setIsLoading(false);
      });
    }, TOTAL_DURATION);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(exitTimer);
    };
  }, [setIsLoading, setLoading]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#000000",          // pure black
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <Canvas>
        {/* Camera centred, looking straight at the origin */}
        <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={48} />

        {/* Lighting — cool white setup for white text on black */}
        <ambientLight intensity={1.0} color="#ffffff" />
        <pointLight position={[0, 10, 15]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-15, -5, 10]} intensity={1.2} color="#cccccc" />

        <Suspense fallback={null}>
          <group rotation={[0, 0, 0]}>
            <Letter char="H" position={[-5, 0, 0]} />
            <Letter char="2" position={[0,  0, 0]} />
            <Letter char="3" position={[5,  0, 0]} />
          </group>

          <UnderlineAccent />
          <ParticleField />
          <Environment preset="night" />
        </Suspense>
      </Canvas>

      {/* 2D decorative layer */}
      <Overlay />

      {/* White flash — snaps on at 4 s */}
      <WhiteFlash visible={showWhiteFlash} />
    </div>
  );
};

export default H23Loader;
