import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import type { Vertex } from "@/types/graph";
import type { MadridClock } from "@/metro/madridClock";
import type { ScheduleStop } from "@/metro/liveTrains";

// Renders one real train: `departureSec` is when it left its first stop
// (Madrid local seconds-since-midnight), and `stops` gives each subsequent
// stop's cumulative offset from that departure, straight from the GTFS
// schedule. Position is a pure function of (now - departureSec), read from
// the shared clockRef each frame, rather than a synthetic looped animation.
export const CapsuleTraveler: React.FC<{
  stops: ScheduleStop[];
  departureSec: number;
  clockRef: React.MutableRefObject<MadridClock>;
  vertexMap: Map<string, Vertex>;
}> = ({ stops, departureSec, clockRef, vertexMap }) => {
  const capsuleRef = useRef<THREE.Mesh>(null);
  const currentPos = useRef(new THREE.Vector3()).current;
  const currentQuat = useRef(new THREE.Quaternion()).current;
  const direction = useRef(new THREE.Vector3()).current;
  const upAxis = useRef(new THREE.Vector3(0, 1, 0)).current;

  useFrame(() => {
    const tripDuration = stops[stops.length - 1].offset;
    const elapsed = Math.min(
      Math.max(clockRef.current.secondsOfDay - departureSec, 0),
      tripDuration,
    );

    let i = 0;
    while (i < stops.length - 2 && stops[i + 1].offset <= elapsed) i++;
    const from = stops[i];
    const to = stops[i + 1];
    const sourceVertex = vertexMap.get(from.name);
    const targetVertex = vertexMap.get(to.name);
    if (!sourceVertex || !targetVertex || !capsuleRef.current) return;

    const span = to.offset - from.offset;
    const progress = span > 0 ? (elapsed - from.offset) / span : 0;
    currentPos.copy(sourceVertex.position).lerp(targetVertex.position, progress);
    direction
      .subVectors(targetVertex.position, sourceVertex.position)
      .normalize();
    currentQuat.setFromUnitVectors(upAxis, direction);

    capsuleRef.current.position.copy(currentPos);
    capsuleRef.current.quaternion.copy(currentQuat);
  });

  return (
    <mesh ref={capsuleRef}>
      <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
      <meshBasicMaterial color="silver" />
    </mesh>
  );
};
