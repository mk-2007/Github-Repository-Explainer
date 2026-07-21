# Mahandar Kumar — 3D Corridor Portfolio

Phase 4 character infrastructure. See `portfolio-requirements-architecture.md`
(shared separately) for the full plan — this README only covers running/deploying
what exists so far, plus a changelog of phases as we go.

## Stack (as actually installed)

- Next.js **16.2.10** (App Router)
- React 19
- React Three Fiber + drei + three.js
- Zustand (state)
- GSAP (camera/UI transitions, not wired up yet)
- Tailwind CSS v4
- Local fonts: Bacley (display) + Spirtush (accent), self-hosted via `next/font/local`
- `fbx2gltf` (dev dependency) — converts Mixamo FBX exports to GLB, no Blender needed

## What's here right now (Phase 4 — character)

- **Character swap system** (`src/components/scene/character/`): the player now
  renders through a `Character` component that picks between
  `public/models/character-idle.glb` and `public/models/character-walk.glb`
  based on whether it's currently walking, and **falls back to the Phase 2/3
  placeholder capsule** if those files aren't present yet or fail to load
  (caught by an error boundary, doesn't crash the scene).
- **This ships without the actual character asset** — sourcing a real rigged
  model from Mixamo is a manual step only you can do (needs your own Adobe
  login and character choice). Full instructions are in
  `public/models/README.md`, short version:
  1. Download an Idle and a Walking animation from Mixamo (both "With Skin"), as FBX.
  2. `npm run convert:fbx -- path/to/idle.fbx public/models/character-idle.glb`
  3. `npm run convert:fbx -- path/to/walk.fbx public/models/character-walk.glb`
  4. Reload — placeholder capsule is replaced automatically, no code changes needed.
- **Known limitation, by design for now:** idle and walk are two separate
  model files swapped on movement (a small visual "pop" on transition), not
  one shared skeleton with blended animation clips. Simpler pipeline, no
  Blender merge step required. Worth revisiting once we see it in motion —
  if the pop is distracting, the fix is merging both Mixamo animations onto
  one skeleton in Blender and exporting a single GLB with two clips.

## Bugs fixed after your testing

- **White space around the scene:** the `<canvas>` itself was always
  filling the screen correctly (verified with exact pixel measurements) -
  the actual bug was that `bg-[--color-corridor-floor]` is invalid Tailwind
  syntax (needs `bg-[var(--color-corridor-floor)]`), so the body's
  background silently failed to apply. Since Three.js canvases are
  transparent by default, any part of the 3D frustum without geometry
  showed straight through to the page's default white. Fixed the Tailwind
  syntax everywhere it appeared, *and* gave the Three.js scene itself an
  explicit background color (`<color attach="background">` in
  `CorridorScene.tsx`) so this can't recur even if a future CSS change
  breaks the DOM background again.
- **Name/tagline "floating and mixing":** the overlay had no backdrop of
  its own, so at some camera angles the nearby door board (rendered in 3D
  world space) could visually overlap it. Gave the name/tagline overlay a
  solid dark backdrop panel and capped door-board z-index below it, so
  they can no longer visually blend into each other regardless of camera angle.
- **Red "Runtime Error" screen for the missing character model:** the
  ModelErrorBoundary was already catching this correctly (app never
  crashed), but Next's dev overlay still flagged the underlying failed
  fetch. `Character.tsx` now checks the files exist (HEAD request) before
  ever attempting to load them, so no failed fetch happens at all until
  the real assets are in place - the red screen shouldn't appear anymore.

## Phase log

- **Phase 1** — Next.js + R3F scaffold, fonts wired up, blank test scene. Build/lint clean.
- **Phase 2** — corridor greybox + click-to-walk + follow camera. Build/lint clean.
- **Phase 3** — newspaper wall texture, real floor color, lighting mood, layout bug fix. Build/lint clean.
- **Phase 4** (current) — character swap system + Mixamo sourcing pipeline. Build/lint clean (with or without the actual model files present).

## Run locally

```bash
npm install
npm run dev
```
Open http://localhost:3000 — click anywhere on the corridor floor to walk there.

## Build check (what we ran before packaging this)

```bash
npm run build   # production build - passed clean
npm run lint    # passed clean, no warnings
```

**Do not run `npm audit fix --force`** on this project — it will downgrade
Next.js to an ancient version incompatible with the App Router and break
everything. Plain `npm audit` (no fix) is fine to check; the flagged items
are in Next's internal dev tooling, not your deployed site.

## Deploy to Vercel

1. Push this project to a GitHub repo (e.g. under `mk-2007`).
2. Go to vercel.com -> Add New Project -> import that repo.
3. Framework preset auto-detects as Next.js - no config needed.
4. Deploy. Every push to `main` after that auto-deploys.

No environment variables are needed yet. If a project later needs one
(e.g. an API key for a chatbot embed), we'll add it under
Vercel -> Project -> Settings -> Environment Variables when we get there.

## Font licensing note

Bacley and Spirtush are both personal-use licensed. Fine for this
portfolio; not cleared for resale or commercial redistribution.
