"use client";

import SceneRoot from "@/components/scene/SceneRoot";
import WelcomeScreen from "@/components/welcome/WelcomeScreen";
import NavControls from "@/components/hud/NavControls";
import RenderErrorBanner from "@/components/hud/RenderErrorBanner";
import { useAppStore } from "@/store/appStore";

export default function Home() {
  const stage = useAppStore((s) => s.stage);

  return (
    <main className="relative flex-1 min-h-0 flex flex-col">
      {stage === "welcome" && <WelcomeScreen />}
      {/* Corridor stays mounted the whole time — no reload when the
          welcome screen fades away, it's just been covered until now. */}
      <div className="flex-1">
        <SceneRoot />
      </div>
      {stage === "corridor" && <NavControls />}
      <RenderErrorBanner />
    </main>
  );
}
