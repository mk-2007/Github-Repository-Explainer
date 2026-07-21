"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useAppStore } from "@/store/appStore";

/**
 * Phase 5 — the very first thing a visitor sees: the "outside" of the
 * house. A nameplate (like the one screwed to a real front door), a
 * welcome line, and an animated door. Clicking the door swings it open
 * and hands off to the corridor via appStore — nothing 3D here, this is
 * a plain DOM/CSS scene so it paints instantly with zero asset loading.
 */
export default function WelcomeScreen() {
  const enterCorridor = useAppStore((s) => s.enterCorridor);
  const doorRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [entering, setEntering] = useState(false);

  function handleEnter() {
    if (entering) return;
    setEntering(true);

    const tl = gsap.timeline({
      onComplete: enterCorridor,
    });

    // Door swings open on its hinge (left edge), light spills out from
    // behind it, then the whole exterior fades to black as we "step in."
    tl.to(doorRef.current, {
      rotateY: -78,
      duration: 0.85,
      ease: "power2.inOut",
    })
      .to(
        sceneRef.current,
        {
          opacity: 0,
          duration: 0.55,
          ease: "power1.in",
        },
        "-=0.25"
      );
  }

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0906] overflow-hidden select-none"
    >
      {/* Night vignette backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, #201a13 0%, #0a0906 65%, #050403 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-[3vh] px-6">
        {/* Nameplate — like a plaque screwed to the front of the house */}
        <div className="border border-[var(--color-paper)]/25 px-[3vw] py-[1.5vh] bg-[var(--color-ink)]/40 backdrop-blur-sm">
          <h1
            className="font-[family-name:var(--font-bacley)] tracking-[0.15em] whitespace-nowrap text-[var(--color-paper)]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4.25rem)" }}
          >
            MAHANDAR KUMAR
          </h1>
        </div>

        <p
          className="font-[family-name:var(--font-spirtush)] text-[var(--color-paper)]/85"
          style={{ fontSize: "clamp(1.15rem, 2.8vw, 2.1rem)" }}
        >
          Welcome to the House of Mahandar
        </p>

        {/* The door itself — perspective wrapper so rotateY reads as a
            hinge-swing rather than a flat flip. Sized off vmin so it
            scales with the actual window instead of staying pinned to
            one fixed size regardless of screen. */}
        <div
          className="mt-[1vh] cursor-pointer"
          style={{ perspective: "900px" }}
          onClick={handleEnter}
        >
          <div
            ref={doorRef}
            className="relative rounded-t-sm origin-left"
            style={{
              width: "clamp(190px, 20vmin, 340px)",
              height: "clamp(340px, 36vmin, 620px)",
              background:
                "linear-gradient(155deg, #6b4a30 0%, #4f3520 55%, #3c2817 100%)",
              boxShadow:
                "0 0 0 3px #2c1d10, 0 0 40px 6px rgba(255,207,158,0.18)",
              transformStyle: "preserve-3d",
              animation: "doorGlow 3.2s ease-in-out infinite",
            }}
          >
            {/* Recessed panel detail */}
            <div className="absolute inset-4 border border-[#2c1d10]/70 rounded-sm" />
            {/* Doorknob */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-masthead)]" />
            {/* Light bleeding out from the gap, matches doorGlow pulse */}
            <div className="absolute inset-y-2 -right-1 w-1.5 bg-[#ffcf9e]/70 blur-[2px]" />
          </div>
        </div>

        <p
          className="font-[family-name:var(--font-spirtush)] text-[var(--color-paper)]/45 mt-1"
          style={{ fontSize: "clamp(0.85rem, 1.4vw, 1.1rem)" }}
        >
          {entering ? "Stepping inside…" : "Click the door to step inside"}
        </p>
      </div>
    </div>
  );
}
