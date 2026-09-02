import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useLoading } from "../context/LoadingProvider";

/* ─────────────────────────────────────────────────────────────────────────
   Timings
   0 → 4 s  : Signature & subtitle fade in (opacity 0 → 1) on black background
   4 → 6 s  : White flash overlay fades in over the screen
   6 s      : Loader dismissed → main page appears
───────────────────────────────────────────────────────────────────────── */
const FADE_IN_DURATION  = 3.8; // seconds for signature to reach full opacity
const WHITE_FLASH_START = 4000; // ms — when white overlay begins
const WHITE_FLASH_HOLD  = 2000; // ms — how long the white flash lasts
const TOTAL_DURATION    = WHITE_FLASH_START + WHITE_FLASH_HOLD; // 6000 ms

/* ─────────────────────────────────────────────────────────────────────────
   Ambient particle field — subtle floating depth in Three.js
───────────────────────────────────────────────────────────────────────── */
const ParticleField = () => {
  const count = 75;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const positions = useRef<Float32Array>(
    new Float32Array(
      Array.from({ length: count }, () => [
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 35,
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
      const y = positions.current[i * 3 + 1] + Math.sin(t * 0.4 + i) * 0.04;
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
        emissive="#ffffff"
        emissiveIntensity={0.9}
        transparent
        opacity={0.35}
      />
    </instancedMesh>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Signature Center Hero (Matching Image 2 Font Style)
───────────────────────────────────────────────────────────────────────── */
const SignatureHero = ({ opacity }: { opacity: number }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 10,
        opacity: opacity,
        transition: "opacity 0.15s ease-out",
        userSelect: "none",
        padding: "0 20px",
      }}
    >
      {/* Corner Brackets */}
      {[
        { top: 28, left: 28 },
        { top: 28, right: 28 },
        { bottom: 28, left: 28 },
        { bottom: 28, right: 28 },
      ].map((style, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 24,
            height: 24,
            borderColor: "rgba(255, 255, 255, 0.35)",
            borderStyle: "solid",
            borderWidth: 0,
            ...(style.top !== undefined
              ? { borderTopWidth: 1.5 }
              : { borderBottomWidth: 1.5 }),
            ...(style.left !== undefined
              ? { borderLeftWidth: 1.5 }
              : { borderRightWidth: 1.5 }),
            ...style,
          }}
        />
      ))}

      {/* Main Signature Text in Handwritten Script Style */}
      <div
        style={{
          fontFamily: "'Alex Brush', 'Birthstone Bounce', 'Great Vibes', 'Allura', 'Caveat', cursive, sans-serif",
          fontSize: "clamp(68px, 12vw, 150px)",
          fontWeight: 400,
          color: "#ffffff",
          letterSpacing: "0.02em",
          lineHeight: 1.1,
          textAlign: "center",
          textShadow:
            "0 0 20px rgba(255, 255, 255, 0.45), 0 0 50px rgba(255, 255, 255, 0.2)",
          filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9))",
          transform: "rotate(-1.5deg)",
          margin: "0 0 16px 0",
          willChange: "opacity, transform",
        }}
      >
        H23
      </div>

      {/* Subtitle / Tagline (Matching Image 2 Style) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "clamp(10px, 1.15vw, 13px)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.7)",
          fontWeight: 500,
          marginTop: "4px",
        }}
      >
        <span>Creative</span>
        <span style={{ opacity: 0.4, fontSize: "0.85em" }}>|</span>
        <span>Developer</span>
        <span style={{ opacity: 0.4, fontSize: "0.85em" }}>|</span>
        <span>Designer</span>
      </div>
    </div>
  );
};

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
      transition: "opacity 0.35s ease-in",
      pointerEvents: "none",
      zIndex: 10000,
    }}
  />
);

/* ─────────────────────────────────────────────────────────────────────────
   Main Loader
   Timeline:
     0 ms  → signature & particles start fading in
     4000 ms → white flash begins
     6000 ms → loader dismissed, main page shown
───────────────────────────────────────────────────────────────────────── */
const H23Loader = () => {
  const { setIsLoading, setLoading } = useLoading();
  const [shouldRender, setShouldRender] = useState(true);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    let animId: number;

    const updateOpacity = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const currentOpacity = Math.min(elapsed / FADE_IN_DURATION, 1);
      setOpacity(currentOpacity);

      if (elapsed < FADE_IN_DURATION) {
        animId = requestAnimationFrame(updateOpacity);
      }
    };

    animId = requestAnimationFrame(updateOpacity);

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
      cancelAnimationFrame(animId);
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
        background: "#000000",
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* 3D Particle Starfield Background */}
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={48} />
        <ambientLight intensity={1.0} color="#ffffff" />
        <pointLight position={[0, 10, 15]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-15, -5, 10]} intensity={1.2} color="#cccccc" />

        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      </Canvas>

      {/* Center Signature & Subtitle Hero */}
      <SignatureHero opacity={opacity} />

      {/* White flash — snaps on at 4 s */}
      <WhiteFlash visible={showWhiteFlash} />
    </div>
  );
};

export default H23Loader;
