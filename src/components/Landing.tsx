import { PropsWithChildren } from "react";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-floor-shadow" aria-hidden="true" />

        <div className="landing-container">
          {/* ── Intro ───────────────────────────────────────────────────── */}
          <div className="landing-intro">
            <h2>Hello! I&apos;m</h2>
            <h1>H23NIC1</h1>
          </div>

          {/* ── Role cycling text ────────────────────────────────────────── */}
          <div className="landing-info">
            <div className="landing-sparkle landing-sparkle-1" aria-hidden="true">✦</div>
            <div className="landing-sparkle landing-sparkle-2" aria-hidden="true">✦</div>
            <h3>A Creative</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">DESIGNER</div>
              <div className="landing-h2-2">DEVELOPER</div>
            </h2>
            <h2>
              <div className="landing-h2-info">DEVELOPER</div>
              <div className="landing-h2-info-1">DESIGNER</div>
            </h2>
          </div>

          {/* ── Orbit hint ───────────────────────────────────────────────── */}
          <div className="landing-orbit-hint" aria-hidden="true">
            Drag to rotate&nbsp;·&nbsp;Scroll to explore
          </div>
        </div>

        {children}
      </div>
    </>
  );
};

export default Landing;
