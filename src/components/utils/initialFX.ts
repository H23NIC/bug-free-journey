import { SplitText } from "gsap/SplitText";
import gsap from "gsap";
import { smoother } from "../MainContainer";

gsap.registerPlugin(SplitText);

let isFXRunning = false;

export function initialFX() {
  if (isFXRunning) return;
  isFXRunning = true;

  document.body.style.overflowY = "auto";
  if (smoother) smoother.paused(false);
  const mainElem = document.getElementsByTagName("main")[0];
  if (mainElem) mainElem.classList.add("main-active");

  gsap.to("body", {
    backgroundColor: "#0b080c",
    duration: 0.5,
    delay: 1,
  });

  const landingText = new SplitText(
    [".landing-info h3", ".landing-intro h2", ".landing-intro h1"],
    {
      type: "chars,lines",
      linesClass: "split-line",
    }
  );
  gsap.fromTo(
    landingText.chars,
    { opacity: 0, y: 80, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.3,
    }
  );

  const TextProps = { type: "chars,lines", linesClass: "split-h2" };

  const whiteWord1 = new SplitText(".landing-h2-info", TextProps);
  const whiteWord2 = new SplitText(".landing-h2-info-1", TextProps);
  const purpleWord1 = new SplitText(".landing-h2-1", TextProps);
  const purpleWord2 = new SplitText(".landing-h2-2", TextProps);

  // Set secondary word hidden initially below line mask
  gsap.set([whiteWord2.chars, purpleWord2.chars], {
    opacity: 0,
    y: 80,
  });

  // Animate initial word in on load with letter-by-letter stagger
  gsap.fromTo(
    [purpleWord1.chars, whiteWord1.chars],
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.08,
      delay: 0.3,
    }
  );

  gsap.fromTo(
    ".landing-info-h2",
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power2.out",
      y: 0,
      delay: 0.4,
    }
  );

  gsap.fromTo(
    [".header", ".icons-section", ".nav-fade"],
    { opacity: 0 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      delay: 0.1,
    }
  );

  // Constellation fade in
  gsap.fromTo(
    ".constellation-svg",
    { opacity: 0 },
    { opacity: 0.85, duration: 2.0, ease: "power1.inOut", delay: 0.5 }
  );

  startRoleSwapLoop(purpleWord1, whiteWord1, purpleWord2, whiteWord2);
}

function startRoleSwapLoop(
  p1: SplitText, // Purple Word 1 (DEVELOPER)
  w1: SplitText, // White  Word 1 (DESIGNER)
  p2: SplitText, // Purple Word 2 (DESIGNER)
  w2: SplitText  // White  Word 2 (DEVELOPER)
) {
  const tl = gsap.timeline({ repeat: -1 });
  const HOLD = 3.6;       // time each lockup stays static and visible
  const DURATION = 1.1;   // duration for each letter roll
  const STAGGER = 0.08;   // exact letter-by-letter rolling stagger
  const EASE = "power3.inOut";

  // ── 1. Initial lockup holds, then rolls OUT upward as Swapped lockup rolls IN from below simultaneously ──
  tl.to(
    [p1.chars, w1.chars],
    {
      y: -80,
      opacity: 0,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
    },
    `+=${HOLD}`
  ).fromTo(
    [p2.chars, w2.chars],
    { y: 80, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
    },
    "<" // simultaneous: each outgoing letter rolls out as incoming letter rolls in
  );

  // ── 2. Swapped lockup holds, then rolls OUT upward as Initial lockup rolls IN from below simultaneously ──
  tl.to(
    [p2.chars, w2.chars],
    {
      y: -80,
      opacity: 0,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
    },
    `+=${HOLD}`
  ).fromTo(
    [p1.chars, w1.chars],
    { y: 80, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
    },
    "<"
  );
}
