import * as THREE from "three";
import gsap from "gsap";

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".about-section",
      start: "center 55%",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: ".whatIDO",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  if (window.innerWidth > 1024) {
    if (character) {
      tl1
        .fromTo(
          character.position,
          { x:  0 },
          { x: -2.9, duration: 1 },
          0
        )
        .fromTo(
          character.scale,
          { x: 160, y: 160, z: 160 },
          { x: 160, y: 160, z: 160, duration: 1 },
          0
        )
        .fromTo(character.rotation, { y: -0.5, x: 0.05 }, { y: 0.7, x: 0, duration: 1 }, 0)
        .to(camera.position, { z: 12, y: 1.5 }, 0)
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { opacity: 0, y: "20px" }, { opacity: 1, y: "0px", duration: 0.8 }, 0.2);

      tl2
        .to(".about-section", { opacity: 0, y: "-20%", duration: 2, ease: "power2.in" }, 0)
        .to(".about-me", { opacity: 0, y: "-30px", duration: 1.5, ease: "power2.in" }, 0)
        .to(
          character.position,
          { x: -0.4, duration: 3.5, delay: 0.3, ease: "power2.inOut" },
          0
        )
        .to(
          character.scale,
          { x: 105, y: 105, z: 105, duration: 3.5, delay: 0.3, ease: "power2.inOut" },
          0
        )
        .to(
          camera.position,
          { z: 16.5, y: 2.0, duration: 4, delay: 0.3, ease: "power2.inOut" },
          0
        )
        .fromTo(
          ".character-model",
          { pointerEvents: "inherit" },
          { pointerEvents: "none", delay: 1, duration: 2 },
          0
        )
        .to(character.rotation, { y: 2.55, x: 0.3, delay: 0.3, duration: 3.5, ease: "power2.inOut" }, 0)
        .fromTo(
          ".what-box-in",
          { display: "none" },
          { display: "flex", duration: 0.1, delay: 1.5 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 3, delay: 0.3 },
          0.2
        );

      tl3
        .fromTo(
          ".character-model",
          { y: "0%" },
          { y: "-100%", duration: 4, ease: "none", delay: 1 },
          0
        )
        .fromTo(".whatIDO", { y: 0 }, { y: "15%", duration: 2 }, 0)
        .to(character.rotation, { y: 2.55, x: 0.3, duration: 3, delay: 1 }, 0);
    }
  } else {
    if (character) {
      const tM2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".what-box-in",
          start: "top 70%",
          end: "bottom top",
        },
      });
      tM2.to(".what-box-in", { display: "flex", duration: 0.1, delay: 0 }, 0);
    }
  }
}

export function setAllTimeline() {
  const careerTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".career-section",
      start: "top 30%",
      end: "100% center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  careerTimeline
    .fromTo(
      ".career-timeline",
      { maxHeight: "10%" },
      { maxHeight: "100%", duration: 0.5 },
      0
    )
    .fromTo(
      ".career-timeline",
      { opacity: 0 },
      { opacity: 1, duration: 0.1 },
      0
    )
    .fromTo(
      ".career-info-box",
      { opacity: 0 },
      { opacity: 1, stagger: 0.1, duration: 0.5 },
      0
    )
    .fromTo(
      ".career-dot",
      { animationIterationCount: "infinite" },
      {
        animationIterationCount: "1",
        delay: 0.3,
        duration: 0.1,
      },
      0
    );

  if (window.innerWidth > 1024) {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: "20%", duration: 0.5, delay: 0.2 },
      0
    );
  } else {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: 0, duration: 0.5, delay: 0.2 },
      0
    );
  }
}
