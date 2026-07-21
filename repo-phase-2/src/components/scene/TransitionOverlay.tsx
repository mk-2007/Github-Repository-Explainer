"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useSpaceStore } from "@/store/spaceStore";

/**
 * Purely visual — a full-screen black div that fades in, waits for
 * spaceStore to swap `space` at its darkest point (so the camera snap in
 * Player.tsx is never seen), then fades back out. Doesn't touch geometry
 * or the camera itself.
 */
export default function TransitionOverlay() {
  const requestedSpace = useSpaceStore((s) => s.requestedSpace);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestedSpace || !overlayRef.current) return;

    const tl = gsap.timeline();
    tl.to(overlayRef.current, { opacity: 1, duration: 0.35, ease: "power1.in" })
      .call(() => useSpaceStore.getState().commitSpace())
      .to(overlayRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: "power1.out",
        delay: 0.05,
      })
      .call(() => useSpaceStore.getState().finishTransition());

    return () => {
      tl.kill();
    };
  }, [requestedSpace]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-40 bg-black pointer-events-none"
      style={{ opacity: 0 }}
    />
  );
}
