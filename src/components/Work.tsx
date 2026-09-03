import { useRef } from "react";
import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Work = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const flexRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const flex = flexRef.current;
      if (!section || !flex) return;

      const getScrollAmount = () => {
        const boxes = flex.querySelectorAll(".work-box");
        if (boxes.length === 0) return 0;
        const lastBox = boxes[boxes.length - 1] as HTMLElement;
        const container = section.querySelector(".work-container") as HTMLElement;
        if (!lastBox || !container) return 0;

        const totalContentWidth = lastBox.offsetLeft + lastBox.offsetWidth;
        const visibleWidth = container.offsetWidth;
        return Math.max(0, totalContentWidth - visibleWidth + 120);
      };

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          id: "work",
        },
      });

      timeline.to(flex, {
        x: () => -getScrollAmount(),
        ease: "none",
      });

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);

      return () => {
        clearTimeout(timer);
        timeline.kill();
        ScrollTrigger.getById("work")?.kill();
      };
    },
    { scope: sectionRef }
  );

  return (
    <div className="work-section" id="work" ref={sectionRef}>
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>
        <div className="work-flex" ref={flexRef}>
          {[...Array(6)].map((_value, index) => (
            <div className="work-box" key={index}>
              <div className="work-info">
                <div className="work-title">
                  <h3>0{index + 1}</h3>
                  <div>
                    <h4>Project Name</h4>
                    <p>Category</p>
                  </div>
                </div>
                <h4>Tools and features</h4>
                <p>Javascript, TypeScript, React, Threejs</p>
              </div>
              <WorkImage image="/images/placeholder.webp" alt="" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
