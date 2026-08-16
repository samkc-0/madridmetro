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
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
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

// The sphere and its label are one component so hover/tap state stays
// local to each station instead of needing to be coordinated externally.
// Label position lives on the outer (unrotated) group so it stays at the
// station's world coordinates; only the inner group's rotation is updated,
// in one shared per-frame pass (owned by Stations below), to billboard the
// label toward the camera without dragging its position around the origin.
const Station: React.FC<{
  vertex: Vertex;
  billboardRefs: React.MutableRefObject<Map<string, THREE.Group>>;
}> = memo(({ vertex, billboardRefs }) => {
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const showLabel = hovered || tapped;

  return (
    <group>
      <mesh
        position={vertex.position}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          setTapped((t) => !t);
        }}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <group
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
          {showLabel && <StationLabel vertex={vertex} />}
        </group>
      </group>
    </group>
  );
});

const Stations: React.FC<{ vertices: Vertex[] }> = memo(({ vertices }) => {
  const billboardRefs = useRef(new Map<string, THREE.Group>());
  useFrame(({ camera }) => {
    billboardRefs.current.forEach((group) =>
      group.quaternion.copy(camera.quaternion),
    );
  });
  return (
    <>
      {vertices.map((vertex) => (
        <Station key={vertex.id} vertex={vertex} billboardRefs={billboardRefs} />
      ))}
    </>
  );
});

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
      <Stations vertices={graph.vertices} />
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
