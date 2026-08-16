import * as THREE from "three";
import { Text } from "troika-three-text";
import {
  useMemo,
  memo,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import type { Graph, Vertex, JourneySegment } from "@/types/graph";
import { CapsuleTraveler } from "@/components/capsule-traveler";

// Renders every edge as a single batched draw call (fat lines) instead
// of one cylinder mesh per edge.
const EdgeLines: React.FC<{
  graph: Graph;
  vertexMap: Map<string, Vertex>;
}> = ({ graph, vertexMap }) => {
  const { size } = useThree();
  const [lineSegments] = useState(() => {
    const geometry = new LineSegmentsGeometry();
    const material = new LineMaterial({ linewidth: 6, vertexColors: true });
    return new LineSegments2(geometry, material);
  });

  useLayoutEffect(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();
    for (const edge of graph.edges) {
      const start = vertexMap.get(edge.source);
      const end = vertexMap.get(edge.target);
      if (!start || !end) continue;
      positions.push(
        start.position.x,
        start.position.y,
        start.position.z,
        end.position.x,
        end.position.y,
        end.position.z,
      );
      color.set(edge.color ?? "gray");
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    lineSegments.geometry.setPositions(positions);
    lineSegments.geometry.setColors(colors);
  }, [graph.edges, vertexMap, lineSegments]);

  useEffect(() => {
    lineSegments.material.resolution.set(size.width, size.height);
  }, [size, lineSegments]);

  return <primitive object={lineSegments} />;
};

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

  return <primitive object={troikaText} />;
});

// Position lives on the outer (unrotated) group so labels stay at their
// station's world coordinates; only the inner group's rotation is updated,
// in one shared per-frame pass, to billboard every label toward the camera
// without dragging their positions around the origin with it.
const StationLabels: React.FC<{ vertices: Vertex[] }> = memo(
  ({ vertices }) => {
    const billboardRefs = useRef(new Map<string, THREE.Group>());
    useFrame(({ camera }) => {
      billboardRefs.current.forEach((group) =>
        group.quaternion.copy(camera.quaternion),
      );
    });
    return (
      <>
        {vertices.map((vertex) => (
          <group
            key={vertex.id}
            position={[
              vertex.position.x,
              vertex.position.y + 0.4,
              vertex.position.z,
            ]}
          >
            <group
              ref={(el) => {
                if (el) billboardRefs.current.set(vertex.id, el);
                else billboardRefs.current.delete(vertex.id);
              }}
            >
              <StationLabel vertex={vertex} />
            </group>
          </group>
        ))}
      </>
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
      <EdgeLines graph={graph} vertexMap={vertexMap} />
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
