import * as THREE from "three";
import { Text } from "troika-three-text";
import { useMemo, memo, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

import type { Graph, Vertex, JourneySegment } from "@/types/graph";
import { CapsuleTraveler } from "@/components/capsule-traveler";

const EdgeMesh: React.FC<{
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
}> = memo(({ start, end, color = "gray" }) => {
  const distance = start.distanceTo(end);
  const midpoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.05, 0.05, distance, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
});

const VertexMesh: React.FC<{ vertex: Vertex }> = memo(({ vertex }) => {
  return (
    <mesh position={vertex.position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
  );
});

const StationLabel: React.FC<{ vertex: Vertex }> = memo(({ vertex }) => {
  const [troikaText] = useState(() => new Text());

  useLayoutEffect(() => {
    troikaText.text = vertex.id;
    troikaText.fontSize = 0.3;
    troikaText.color = "black";
    troikaText.anchorX = "center";
    troikaText.anchorY = "bottom";
    troikaText.sync();
    return () => troikaText.dispose();
  }, [troikaText, vertex.id]);

  return (
    <primitive
      object={troikaText}
      position={[
        vertex.position.x,
        vertex.position.y + 0.4,
        vertex.position.z,
      ]}
    />
  );
});

// All labels live in one group so a single per-frame quaternion copy
// billboards every station name toward the camera, instead of each
// label tracking the camera independently.
const StationLabels: React.FC<{ vertices: Vertex[] }> = memo(
  ({ vertices }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame(({ camera }) => {
      groupRef.current?.quaternion.copy(camera.quaternion);
    });
    return (
      <group ref={groupRef}>
        {vertices.map((vertex) => (
          <StationLabel key={vertex.id} vertex={vertex} />
        ))}
      </group>
    );
  },
);

export const Graph3D: React.FC<{
  graph: Graph;
  journeySchedules?: JourneySegment[][];
}> = ({ graph, journeySchedules }) => {
  const vertexMap = useMemo(
    () => new Map<string, Vertex>(graph.vertices.map((v) => [v.id, v])),
    [graph.vertices],
  );
  return (
    <group name="graph-3d" rotation-x={0}>
      {graph.vertices.map((vertex) => (
        <VertexMesh key={vertex.id} vertex={vertex} />
      ))}
      <StationLabels vertices={graph.vertices} />
      {graph.edges.map((edge, index) => {
        const startVertex = vertexMap.get(edge.source);
        const endVertex = vertexMap.get(edge.target);
        if (!startVertex || !endVertex) return null;
        return (
          <EdgeMesh
            key={index}
            start={startVertex.position}
            end={endVertex.position}
            color={edge.color}
          />
        );
      })}
      {journeySchedules?.map((schedule, i) => (
        <CapsuleTraveler
          key={`journey-${i}`}
          schedule={schedule}
          vertexMap={vertexMap}
        />
      ))}
    </group>
  );
};
