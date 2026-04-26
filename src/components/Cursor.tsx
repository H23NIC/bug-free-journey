import { useEffect, useRef } from "react";
import "./styles/Cursor.css";

const Cursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface StarData {
      x: number;
      y: number;
      size: number;
      maxSize: number;
      life: number;
      speedX: number;
      speedY: number;
      twinkleOffset: number;
    }

    const stars: StarData[] = [];
    const mouse = { x: 0, y: 0 };
    const lastMouse = { x: 0, y: 0 };

    const createStar = (x: number, y: number) => {
      stars.push({
        x,
        y,
        maxSize: Math.random() * 4 + 1.5,
        size: 0.1,
        life: 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      const dist = Math.hypot(mouse.x - lastMouse.x, mouse.y - lastMouse.y);
      if (dist > 8) {
        createStar(mouse.x, mouse.y);
        lastMouse.x = mouse.x;
        lastMouse.y = mouse.y;
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    const drawStar = (star: StarData) => {
      if (!ctx) return;
      
      const twinkle = Math.sin(Date.now() * 0.005 + star.twinkleOffset) * 0.3 + 0.7;
      const opacity = star.life * twinkle;
      
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.beginPath();
      
      const r = star.size;
      const spikes = 4;
      const outerRadius = r;
      const innerRadius = r * 0.2;
      
      let rot = (Math.PI / 2) * 3;
      let x = 0;
      let y = 0;
      const step = Math.PI / spikes;

      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = Math.cos(rot) * outerRadius;
        y = Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = Math.cos(rot) * innerRadius;
        y = Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(0, -outerRadius);
      ctx.closePath();

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "white";
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        star.x += star.speedX;
        star.y += star.speedY;
        star.life -= 0.01;
        
        if (star.size < star.maxSize) {
          star.size += 0.15;
        }

        drawStar(star);

        if (star.life <= 0) {
          stars.splice(i, 1);
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="cursor-main">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Cursor;

