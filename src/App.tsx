import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { Graph3D } from "./Components/Graph3D";
import { madrid } from "./Metro/madrid";

const Scene: React.FC = () => {
  const { graph, schedules }: { graph: Graph; schedules: JourneySegment[][] } =
    useMemo(() => {
      const graph = madrid.Graph;
      const schedules = madrid.Journeys;
      return { graph, schedules };
    }, []);

  return (
    <group name="scene">
      <MapControls makeDefault />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <Graph3D graph={graph} journeySchedules={schedules} />
    </group>
  );
};

const App: React.FC = () => {
  return (
    <Canvas
      camera={{
        fov: 60,
        near: 0.1,
        far: 1000,
        position: [0, 10, 15],
      }}
    >
      <Scene />
    </Canvas>
  );
};

export default App;
