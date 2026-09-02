import {
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";
import "./styles/SocialIcons.css";
import { TbNotes } from "react-icons/tb";
import { useEffect, useRef, useState } from "react";
import HoverLinks from "./HoverLinks";

/* ─────────────────────────────────────────────────────────────────────
   StarOrbit3D
   Two rings drawn on a 2D canvas but projected as if tilted in 3D space.
   The rings are ellipses (cos × radius, sin × radius × tilt) so they
   look like real orbital planes viewed at an angle — like Jupiter's moons.
───────────────────────────────────────────────────────────────────── */
interface StarOrbitProps {
  active: boolean;
}

const RINGS = [
  { count: 3,  radius: 23, tilt: 0.35, speed:  1.6,  starSize: 1.1, color: "255,255,255" },
  { count: 4,  radius: 36, tilt: 0.48, speed: -1.1,  starSize: 0.85, color: "200,185,255" },
];

const CANVAS_SIZE = 110; // px

const StarOrbit3D = ({ active }: StarOrbitProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const angleRef  = useRef(RINGS.map(() => 0));
  const alphaRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    let last = performance.now();

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      // Smooth fade in / out
      alphaRef.current = Math.min(
        1,
        Math.max(0, alphaRef.current + (active ? 5 : -5) * dt)
      );

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (alphaRef.current <= 0.01) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      RINGS.forEach((ring, r) => {
        // Advance angle
        angleRef.current[r] = (angleRef.current[r] + ring.speed * dt) % (Math.PI * 2);

        const direction = Math.sign(ring.speed);

        for (let i = 0; i < ring.count; i++) {
          const theta = angleRef.current[r] + (i / ring.count) * Math.PI * 2;

          // Draw the smoke trail line (as multiple sub-segments for tapering fade/width)
          const TRAIL_STEPS = 25;
          const STEP_ANGLE = 0.05; // Spacing between trail steps

          for (let j = 1; j <= TRAIL_STEPS; j++) {
            const theta_prev = theta - direction * (j - 1) * STEP_ANGLE;
            const theta_curr = theta - direction * j * STEP_ANGLE;

            const x_prev = cx + Math.cos(theta_prev) * ring.radius;
            const y_prev = cy + Math.sin(theta_prev) * ring.radius * ring.tilt;

            const x_curr = cx + Math.cos(theta_curr) * ring.radius;
            const y_curr = cy + Math.sin(theta_curr) * ring.radius * ring.tilt;

            // 3D Depth projection at mid-point
            const midTheta = (theta_prev + theta_curr) / 2;
            const depth = Math.sin(midTheta);
            const depthT = (depth + 1) / 2;
            const depthAlpha = 0.2 + depthT * 0.8;
            const depthWidth = 0.6 + depthT * 0.4;

            const trailT = j / TRAIL_STEPS; // 0 (start) to 1 (end of trail)
            
            // Final opacity and size calculation for smoke effect
            const finalAlpha = alphaRef.current * depthAlpha * (1 - trailT) * 0.5;
            const lineWidth = ring.starSize * 2.2 * depthWidth * (1.0 + trailT * 1.6); // Expands like dispersing smoke

            ctx.beginPath();
            ctx.moveTo(x_prev, y_prev);
            ctx.lineTo(x_curr, y_curr);
            ctx.strokeStyle = `rgba(${ring.color}, ${finalAlpha})`;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.stroke();
          }

          // Draw the lead star (the nose of the jet)
          const sx = cx + Math.cos(theta) * ring.radius;
          const sy = cy + Math.sin(theta) * ring.radius * ring.tilt;

          const depth = Math.sin(theta);
          const depthT = (depth + 1) / 2;
          const depthAlpha = 0.25 + depthT * 0.75;
          const depthScale = 0.5 + depthT * 0.5;

          const finalAlpha = alphaRef.current * depthAlpha;
          const sz = ring.starSize * depthScale;

          if (finalAlpha > 0.01) {
            // Glow/Lens flare
            const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 4);
            grd.addColorStop(0, `rgba(${ring.color}, ${finalAlpha * 0.6})`);
            grd.addColorStop(1, "rgba(0,0,0,0)");
            ctx.beginPath();
            ctx.arc(sx, sy, sz * 4, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            // Star Core
            ctx.beginPath();
            ctx.arc(sx, sy, sz * 1.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
            ctx.fill();
          }
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

/* ─────────────────────────────────────────────────────────────────────
   Single social icon — icon STAYS fixed, only orbit appears on hover
───────────────────────────────────────────────────────────────────── */
interface SocialItemProps {
  href: string;
  icon: React.ReactNode;
}

const SocialItem = ({ href, icon }: SocialItemProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="si-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 3D rotating star orbit */}
      <StarOrbit3D active={hovered} />

      {/* Icon — locked to center, never moves */}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`si-link${hovered ? " si-link--hovered" : ""}`}
      >
        {icon}
      </a>
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   SocialIcons — main export
───────────────────────────────────────────────────────────────────── */
const SocialIcons = () => (
  <div className="icons-section">
    <div className="social-icons" id="social">
      <SocialItem href="https://github.com"                   icon={<FaGithub />}     />
      <SocialItem href="https://www.linkedin.com/in/h23dinesh" icon={<FaLinkedinIn />} />
      <SocialItem href="https://x.com"                        icon={<FaXTwitter />}   />
      <SocialItem href="https://www.instagram.com" icon={<FaInstagram />}  />
    </div>
    <a className="resume-button" href="#">
      <HoverLinks text="RESUME" />
      <span>
        <TbNotes />
      </span>
    </a>
  </div>
);

export default SocialIcons;
