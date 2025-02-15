import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// Used to represent a train on the metro network
export const CapsuleTraveler: React.FC<{
  schedule: JourneySegment[];
  vertexMap: Map<string, Vertex>;
}> = ({ schedule, vertexMap }) => {
  const capsuleRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % schedule[schedule.length - 1].endTime;
    const currentPos = new THREE.Vector3();
    const currentQuat = new THREE.Quaternion();

    if (schedule.length === 0) return;

    if (t < schedule[0].startTime) {
      const initialVertex = vertexMap.get(schedule[0].source);
      if (initialVertex) {
        currentPos.copy(initialVertex.position);
        const targetVertex = vertexMap.get(schedule[0].target);
        if (targetVertex) {
          const direction = new THREE.Vector3()
            .subVectors(targetVertex.position, initialVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    } else if (t >= schedule[schedule.length - 1].endTime) {
      const lastSegment = schedule[schedule.length - 1];
      const lastVertex = vertexMap.get(lastSegment.target);
      if (lastVertex) {
        currentPos.copy(lastVertex.position);
        const sourceVertex = vertexMap.get(lastSegment.source);
        if (sourceVertex) {
          const direction = new THREE.Vector3()
            .subVectors(lastVertex.position, sourceVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    } else {
      const segment = schedule.find(
        (seg) => t >= seg.startTime && t <= seg.endTime
      );
      if (segment) {
        const sourceVertex = vertexMap.get(segment.source);
        const targetVertex = vertexMap.get(segment.target);
        if (sourceVertex && targetVertex) {
          const progress =
            (t - segment.startTime) / (segment.endTime - segment.startTime);
          currentPos
            .copy(sourceVertex.position)
            .lerp(targetVertex.position, progress);
          const direction = new THREE.Vector3()
            .subVectors(targetVertex.position, sourceVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    }

    if (capsuleRef.current) {
      capsuleRef.current.position.copy(currentPos);
      capsuleRef.current.quaternion.copy(currentQuat);
    }
  });

  return (
    <mesh ref={capsuleRef}>
      <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
      <meshBasicMaterial color="silver" />
    </mesh>
  );
};
