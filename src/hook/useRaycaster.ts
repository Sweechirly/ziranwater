import { useCallback, useEffect, useMemo } from "react";
import {
  Camera,
  Mesh,
  PlaneGeometry,
  Raycaster,
  Vector2,
  WebGLRenderer,
} from "three";

type AddDrop = (
  renderer: WebGLRenderer,
  x: number,
  y: number,
  radius: number,
  strength: number
) => void;

const useRaycaster = (gl: WebGLRenderer, addDrop: AddDrop, camera: Camera) => {
  const raycaster = useMemo(() => new Raycaster(), []);
  const mouse = useMemo(() => new Vector2(), []);
  const targetmesh = useMemo(() => {
    const targetgeometry = new PlaneGeometry(2, 2);

    const vertices = targetgeometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      const y = vertices[i + 1];
      vertices[i + 1] = 0;
      vertices[i + 2] = -y;
    }

    targetgeometry.attributes.position.needsUpdate = true;

    return new Mesh(targetgeometry);
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) * 2) / rect.width - 1;
      mouse.y = (-(event.clientY - rect.top) * 2) / rect.height + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(targetmesh);

      for (const intersect of intersects) {
        addDrop(gl, intersect.point.x, intersect.point.z, 0.03, 0.04);
      }
    },
    [camera, gl, mouse, raycaster, targetmesh, addDrop]
  );

  useEffect(() => {
    gl.domElement.addEventListener("mousemove", { handleEvent: onMouseMove });
    return () => {
      gl.domElement.removeEventListener("mousemove", {
        handleEvent: onMouseMove,
      });
    };
  }, [gl.domElement, onMouseMove]);
};

export default useRaycaster;
