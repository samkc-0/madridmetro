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
import { useFrame } from "@react-three/fiber";

import type { Graph, Vertex } from "@/types/graph";
import { CapsuleTraveler } from "@/components/capsule-traveler";
import { MadridClockTracker, type MadridClock } from "@/metro/madridClock";
import { computeActiveTrains, type ActiveTrain, type Schedule } from "@/metro/liveTrains";
import { darken, lineColors, stationLines } from "@/metro/lineInfo";
import scheduleData from "@/metro/data/schedule.json";

const schedule = scheduleData as Schedule;
const ACTIVE_TRAINS_POLL_MS = 5000;
const EMPTY_ACTIVE_LINES = new Set<string>();

// Trains are a pure function of the current real time (see liveTrains.ts),
// so the only state that needs a React re-render is *which* trains exist --
// polled every few seconds, since departures are minutes apart. Each
// mounted CapsuleTraveler reads the shared clockRef every frame for smooth,
// per-frame-accurate motion in between polls.
const LiveTrains: React.FC<{ vertexMap: Map<string, Vertex> }> = ({
  vertexMap,
}) => {
  const trackerRef = useRef(new MadridClockTracker());
  const clockRef = useRef<MadridClock>({ secondsOfDay: 0, weekday: 0 });
  const [activeTrains, setActiveTrains] = useState<ActiveTrain[]>(() => {
    trackerRef.current.readInto(clockRef.current);
    return computeActiveTrains(schedule, clockRef.current);
  });

  useFrame(() => {
    trackerRef.current.readInto(clockRef.current);
  });

  useEffect(() => {
    const id = setInterval(() => {
      setActiveTrains(computeActiveTrains(schedule, clockRef.current));
    }, ACTIVE_TRAINS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {activeTrains.map((train) => (
        <CapsuleTraveler
          key={train.id}
          stops={train.stops}
          departureSec={train.departureSec}
          clockRef={clockRef}
          vertexMap={vertexMap}
        />
      ))}
    </>
  );
};

// Renders every edge as cylinders sharing one InstancedMesh -- a single
// draw call, like the fat-lines approach, but real 3D tube geometry with a
// constant *world-space* radius (scales/foreshortens with the camera like
// everything else) rather than fat lines' constant *screen-pixel* width.
const EdgeCylinders: React.FC<{
  graph: Graph;
  vertexMap: Map<string, Vertex>;
}> = ({ graph, vertexMap }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const midpoint = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    const upAxis = new THREE.Vector3(0, 1, 0);

    let count = 0;
    for (const edge of graph.edges) {
      const start = vertexMap.get(edge.source);
      const end = vertexMap.get(edge.target);
      if (!start || !end) continue;

      const distance = start.position.distanceTo(end.position);
      midpoint.addVectors(start.position, end.position).multiplyScalar(0.5);
      direction.subVectors(end.position, start.position).normalize();
      quaternion.setFromUnitVectors(upAxis, direction);
      scale.set(1, distance, 1);

      matrix.compose(midpoint, quaternion, scale);
      mesh.setMatrixAt(count, matrix);
      mesh.setColorAt(count, color.set(edge.color ?? "gray"));
      count++;
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [graph.edges, vertexMap]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, graph.edges.length]}>
      <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
};

const StationLabel: React.FC<{
  vertex: Vertex;
  color: string;
  strokeColor: string;
}> = memo(({ vertex, color, strokeColor }) => {
  const [troikaText] = useState(() => new Text());

  useLayoutEffect(() => {
    troikaText.text = vertex.id;
    troikaText.font = "/fonts/rubik/Rubik-SemiBold.ttf";
    troikaText.fontSize = 0.3;
    troikaText.color = color;
    troikaText.anchorX = "center";
    troikaText.anchorY = "bottom";
    // A barely-there *inner* stroke (drawn inset within the glyph, unlike
    // outlineWidth which expands outward and softens the crisp edges),
    // same hue as the fill (or silver for white interchange labels) just
    // a touch darker.
    troikaText.strokeColor = strokeColor;
    troikaText.strokeOpacity = 0.6;
    troikaText.strokeWidth = "10%";
    troikaText.sync();
    return () => troikaText.dispose();
  }, [troikaText, vertex.id, color, strokeColor]);

  return <primitive object={troikaText} />;
});

// Label position lives on the outer (unrotated) group so it stays at the
// station's world coordinates; only the inner group's rotation is updated,
// in one shared per-frame pass (owned by Stations below), to billboard the
// label toward the camera without dragging its position around the origin.
const Station: React.FC<{
  vertex: Vertex;
  billboardRefs: React.MutableRefObject<Map<string, THREE.Group>>;
  activeLines: Set<string>;
}> = memo(({ vertex, billboardRefs, activeLines }) => {
  const linesHere = stationLines[vertex.id] ?? [];
  const isInterchange = linesHere.length > 1;
  const sphereColor = isInterchange ? "white" : (lineColors[linesHere[0]] ?? "white");
  const labelColor = isInterchange ? "white" : sphereColor;
  const labelStrokeColor = isInterchange ? "silver" : darken(sphereColor, 0.2);
  const sphereRadius = isInterchange ? 0.15 : 0.11;
  const showLabel = linesHere.some((line) => activeLines.has(line));

  return (
    <group>
      <mesh position={vertex.position}>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshBasicMaterial color={sphereColor} />
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
          {showLabel && (
            <StationLabel
              vertex={vertex}
              color={labelColor}
              strokeColor={labelStrokeColor}
            />
          )}
        </group>
      </group>
    </group>
  );
});

const Stations: React.FC<{ vertices: Vertex[]; activeLines: Set<string> }> =
  memo(({ vertices, activeLines }) => {
    const billboardRefs = useRef(new Map<string, THREE.Group>());
    useFrame(({ camera }) => {
      billboardRefs.current.forEach((group) =>
        group.quaternion.copy(camera.quaternion),
      );
    });
    return (
      <>
        {vertices.map((vertex) => (
          <Station
            key={vertex.id}
            vertex={vertex}
            billboardRefs={billboardRefs}
            activeLines={activeLines}
          />
        ))}
      </>
    );
  });

export const Graph3D: React.FC<{
  graph: Graph;
  activeLines?: Set<string>;
}> = ({ graph, activeLines = EMPTY_ACTIVE_LINES }) => {
  const vertexMap = useMemo(
    () => new Map<string, Vertex>(graph.vertices.map((v) => [v.id, v])),
    [graph.vertices],
  );
  return (
    <group name="graph-3d" rotation-x={0}>
      <Stations vertices={graph.vertices} activeLines={activeLines} />
      <EdgeCylinders graph={graph} vertexMap={vertexMap} />
      <LiveTrains vertexMap={vertexMap} />
    </group>
  );
};
