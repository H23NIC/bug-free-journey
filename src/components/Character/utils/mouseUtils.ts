import * as THREE from "three";

export const handleMouseMove = (
  event: MouseEvent,
  setMousePosition: (x: number, y: number) => void
) => {
  const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  setMousePosition(mouseX, mouseY);
};

export const handleTouchMove = (
  event: TouchEvent,
  setMousePosition: (x: number, y: number) => void
) => {
  if (event.touches.length > 0) {
    const mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    setMousePosition(mouseX, mouseY);
  }
};

export const handleTouchEnd = (
  setMousePosition: (
    x: number,
    y: number,
    interpolationX: number,
    interpolationY: number
  ) => void
) => {
  setTimeout(() => {
    setMousePosition(0, 0, 0.03, 0.03);
    setTimeout(() => {
      setMousePosition(0, 0, 0.1, 0.2);
    }, 1000);
  }, 2000);
};

export const handleCarRotation = (
  carObj: THREE.Object3D,
  mouseX: number,
  mouseY: number,
  interpolationX: number,
  interpolationY: number,
  lerp: (x: number, y: number, t: number) => number,
  baseRotationY: number = 0,
  baseRotationX: number = 0
) => {
  if (!carObj) return;
  if (window.scrollY < 200) {
    const maxRotationY = Math.PI / 8; // subtle tilt angle
    const maxRotationX = Math.PI / 16;
    
    carObj.rotation.y = lerp(
      carObj.rotation.y,
      baseRotationY + mouseX * maxRotationY,
      interpolationY
    );
    carObj.rotation.x = lerp(
      carObj.rotation.x,
      baseRotationX - mouseY * maxRotationX,
      interpolationX
    );
  }
};

// Backwards compatibility alias
export const handleHeadRotation = handleCarRotation;
