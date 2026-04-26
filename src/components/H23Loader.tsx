import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text3D, Center, PerspectiveCamera, Environment, GradientTexture } from "@react-three/drei";
import * as THREE from "three";
import { useLoading } from "../context/LoadingProvider";

const Letter = ({ char, position, delay }: { char: string; position: [number, number, number]; delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [startTime] = useState(() => Date.now() + delay * 1000);
  
  // Font path - using the local one we just copied
  const fontUrl = "/fonts/font.json";

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const now = Date.now();
    if (now < startTime) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    
    // Add subtle idle drift for extra smoothness
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = Math.sin(time + delay) * 0.05;
    meshRef.current.rotation.x = Math.cos(time * 0.5 + delay) * 0.03;

    const elapsed = (now - startTime) / 1000;
    const duration = 2.5; // Slightly longer for smoothness
    
    if (elapsed < duration) {
      const t = elapsed / duration;
      // Symmetric Cubic ease out (as requested by user's manual change)
      const ease = 1 - Math.pow(1 - t, 3); 
      
      const scale = THREE.MathUtils.lerp(12, 1, ease);
      const opacity = Math.min(1, t * 2); // Faster fade in
      const zOffset = THREE.MathUtils.lerp(40, 0, ease);
      
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.position.z = zOffset;
      
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach(m => {
          m.opacity = opacity;
          m.transparent = true;
        });
      }
    } else {
        const exitElapsed = elapsed - duration;
        const exitDuration = 2.5; 
        const t = Math.min(exitElapsed / exitDuration, 1);
        
        // Smoothstep for the exit
        const ease = t * t * (3 - 2 * t);
        
        const exitScale = THREE.MathUtils.lerp(1, 0.0001, ease);
        const exitOpacity = THREE.MathUtils.lerp(1, 0, ease);
        
        meshRef.current.scale.set(exitScale, exitScale, exitScale);
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach(m => {
            m.opacity = exitOpacity;
          });
        }
    }
  });

  return (
    <Center position={position}>
      <Text3D
        ref={meshRef}
        font={fontUrl}
        size={6}
        height={1}
        bevelEnabled={true}
        bevelThickness={0.2}
        bevelSize={0.08}
        bevelSegments={8}
      >
        {char}
        {/* Face Material: Using user's colors #590db0 to #ffffff */}
        <meshStandardMaterial attach="material-0" transparent>
          <GradientTexture stops={[0, 1]} colors={['#590db0', '#ffffff']} size={1024} />
        </meshStandardMaterial>
        {/* Side/Extrude Material: Using user's colors #590db0 to #ffffff */}
        <meshStandardMaterial attach="material-1" transparent>
          <GradientTexture stops={[0, 1]} colors={['#590db0', '#ffffff']} size={1024} />
        </meshStandardMaterial>
      </Text3D>
    </Center>
  );
};

const H23Loader = () => {
    const { setIsLoading, setLoading } = useLoading();
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        // Increased timeout to 8 seconds to accommodate much slower, smoother animations
        const timer = setTimeout(() => {
            import("./utils/initialFX").then((module) => {
                if (module.initialFX) {
                    module.initialFX();
                }
                setLoading(100);
                setShouldRender(false);
                setIsLoading(false);
            });
        }, 8000); 
        return () => clearTimeout(timer);
    }, [setIsLoading, setLoading]);

    if (!shouldRender) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#070707',
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={48} />
                <ambientLight intensity={1.2} />
                <pointLight position={[10, 10, 10]} intensity={2.5} />
                <spotLight position={[-10, 10, 20]} angle={0.15} penumbra={1} intensity={4} />
                
                <Suspense fallback={null}>
                  <group rotation={[-0.2, -0.15, 0]}>
                      <Letter char="H" position={[-8, 0, 0]} delay={0} />
                      <Letter char="2" position={[0, 0, 0]} delay={0.4} />
                      <Letter char="3" position={[8, 0, 0]} delay={0.8} />
                  </group>
                  <Environment preset="night" />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default H23Loader;
