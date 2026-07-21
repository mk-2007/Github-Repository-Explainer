# Character models — retired (Phase 5 pivot)

Phase 5 replaced the full-body character with a first-person hand
viewmodel (`src/components/scene/character/Hand.tsx`, procedural — no
GLB needed). The Mixamo idle/walk pipeline this README used to document
is no longer wired into the scene; `Character.tsx`, `CharacterModel.tsx`,
`PlaceholderCapsule.tsx`, and `ModelErrorBoundary.tsx` were removed.

The FBX→GLB converter script (`npm run convert:fbx`) is left in place in
case a future room needs a rigged prop or model — it's not specific to
the old character pipeline.

If a visible full-body character ever comes back (e.g. for a mirror or
NPC in a room), this is the place to redo that writeup.
