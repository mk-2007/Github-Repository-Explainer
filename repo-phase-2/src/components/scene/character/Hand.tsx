"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/playerStore";

const SKIN = "#caa27a";
const SKIN_SHADOW = "#a9805c";

// Local-space offset from the camera: lower-right of frame, close in,
// like a hand you'd glance down at — not a full viewmodel rig.
const BASE_OFFSET = new THREE.Vector3(0.34, -0.42, -0.55);

/**
 * Procedural low-poly hand — no rig/asset pipeline needed, same spirit as
 * the old PlaceholderCapsule but shaped to actually read as "a hand."
 * It's the visitor's only visible presence now: idle, it rests low and
 * relaxed; walking, it lifts slightly and reaches/points toward the
 * direction of travel as a quiet "this way" cue.
 */
export default function Hand() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const target = usePlayerStore((s) => s.target);
  const isWalking = !!target;
  const bobRef = useRef(0);
  const reachRef = useRef(0); // 0 = relaxed, 1 = fully reaching/pointing

  // The hand must never intercept floor/door clicks — it sits right in
  // front of the camera, so without this it would shadow-block raycasts.
  useEffect(() => {
    groupRef.current?.traverse((obj) => {
      obj.raycast = () => {};
    });
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    reachRef.current = THREE.MathUtils.damp(
      reachRef.current,
      isWalking ? 1 : 0,
      6,
      delta
    );

    const offset = BASE_OFFSET.clone();
    if (isWalking) {
      bobRef.current += delta * 8;
      offset.y += Math.sin(bobRef.current) * 0.025;
      offset.z -= 0.12 * reachRef.current; // reach forward while walking
      offset.x -= 0.05 * reachRef.current;
    } else {
      bobRef.current = 0;
    }

    offset.applyQuaternion(camera.quaternion);
    group.position.copy(camera.position).add(offset);
    group.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef} rotation={[0.15, -0.25, 0.35]}>
      {/* Palm */}
      <mesh position={[0, 0, 0]} castShadow={false}>
        <boxGeometry args={[0.15, 0.05, 0.19]} />
        <meshStandardMaterial color={SKIN} roughness={0.65} />
      </mesh>
      {/* Four fingers, splayed slightly, curling more when relaxed vs reaching handled via rotation baked in */}
      {[-0.05, -0.017, 0.017, 0.05].map((fx, i) => (
        <mesh key={i} position={[fx, 0.015, -0.13]} rotation={[0.45 - i * 0.03, 0, 0]}>
          <boxGeometry args={[0.024, 0.024, 0.11]} />
          <meshStandardMaterial color={SKIN} roughness={0.65} />
        </mesh>
      ))}
      {/* Thumb */}
      <mesh position={[0.09, -0.01, -0.02]} rotation={[0.3, 0, 0.7]}>
        <boxGeometry args={[0.032, 0.032, 0.1]} />
        <meshStandardMaterial color={SKIN_SHADOW} roughness={0.65} />
      </mesh>
      {/* Wrist stub fading into "off-screen sleeve" */}
      <mesh position={[0, -0.01, 0.13]}>
        <boxGeometry args={[0.13, 0.06, 0.14]} />
        <meshStandardMaterial color="#2c241d" roughness={0.9} />
      </mesh>
    </group>
  );
}
