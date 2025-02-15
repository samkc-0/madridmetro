import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect } from "react";

export function CameraDebug() {
  const { camera } = useThree();

  const { x, y, z } = useControls("Camera Position", {
    x: { value: camera.position.x, min: -50, max: 50, step: 0.1 },
    y: { value: camera.position.y, min: -50, max: 50, step: 0.1 },
    z: { value: camera.position.z, min: -50, max: 50, step: 0.1 },
  });

  useEffect(() => {
    camera.position.set(x, y, z);
  }, [x, y, z, camera]);

  return null;
}
